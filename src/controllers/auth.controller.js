// src/controllers/auth.controller.js
const User = require('../models/user.model');
const Session = require('../models/session.model');
const redisService = require('../config/redis.config'); // Ton Singleton Upstash
const { publishToQueue } = require('../config/rabbitmq.config'); // Ton producteur RabbitMQ
const crypto = require('crypto');

/**
 * @desc    1. ÉTAPE 1 - Demande de connexion, génération OTP via Redis et notification RabbitMQ
 * @route   POST /api/v1/auth/request-otp
 */
exports.requestOtp = async (req, res, next) => {
  try {
    const { matricule } = req.body;

    if (!matricule) {
      return res.status(400).json({ success: false, message: "Le matricule est obligatoire." });
    }

    // 1. Identification de l'utilisateur par son matricule unique
    const user = await User.findOne({ matricule });
    if (!user) {
      return res.status(404).json({ success: false, message: "Aucun utilisateur trouvé avec ce matricule." });
    }

    // 2. Génération d'un OTP numérique aléatoire à 6 chiffres
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Stockage dans Redis via ton Singleton avec une expiration (TTL) de 5 minutes (300 secondes)
    const redisKey = `otp:${matricule}`;
    await redisService.set(redisKey, otpCode, 300);

    // 4. Publication de la tâche d'envoi d'e-mail dans RabbitMQ pour le notification-service
    const emailPayload = {
        email: user.email,
        nomComplet: user.nomComplet, // On transmet le nom
        otpCode: otpCode             // On transmet le code brut
    };
    
    await publishToQueue("user_notifications", emailPayload);

    res.status(200).json({
      success: true,
      message: "Un code OTP a été généré et transmis pour envoi à votre adresse e-mail."
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    2. ÉTAPE 2 - Validation de l'OTP et création de la session utilisateur détaillée
 * @route   POST /api/v1/auth/verify-otp
 */
exports.verifyOtp = async (req, res, next) => {
  try {
    const { matricule, otpSubmitted, localisation, device } = req.body;

    if (!matricule || !otpSubmitted) {
      return res.status(400).json({ success: false, message: "Le matricule et le code OTP sont obligatoires." });
    }

    // 1. Récupération de l'OTP actif depuis Redis
    const redisKey = `otp:${matricule}`;
    const activeOtp = await redisService.get(redisKey);
    console.log("[Redis] OTP", activeOtp);
    console.log('[Client OTP]', otpSubmitted)
    console.log("[Test]", activeOtp == otpSubmitted)

    // 2. Vérification de la correspondance du code fourni
    // 2. Vérification de la correspondance du code fourni (Corrigé !)
    if (String(activeOtp).trim() !== String(otpSubmitted).trim()) {
      return res.status(401).json({ success: false, message: "Code OTP incorrect." });
    }

    // 3. Récupération des infos utilisateur pour lier la session
    const user = await User.findOne({ matricule });
    if (!user) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    }

    // 4. Sécurité : Destruction immédiate de l'OTP de Redis pour usage unique strict
    await redisService.delete(redisKey);

    // 5. Génération du Token opaque de session
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // 6. Définition de la durée de validité du Token (Ex: 2 heures)
    const dureeToken = 2 * 60 * 60 * 1000; 
    const expiresAt = new Date(Date.now() + dureeToken);

    // 7. Collecte des métadonnées contextuelles de connexion
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    // 8. Création de la session active dans MongoDB
    const session = await Session.create({
      userId: user._id,
      token: sessionToken,
      expiresAt,
      ipAddress,
      localisation: localisation || { pays: "RDC", ville: "Kinshasa" },
      device: device || { browser: "Chrome", os: "Windows", isMobile: false }
    });

    res.status(200).json({
      success: true,
      message: "Authentification réussie.",
      token: sessionToken,
      expiresIn: session.tempsRestant,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    3. CHECK STATUS - Récupérer l'état de connexion en temps réel avec le temps restant
 * @route   GET /api/v1/auth/status
 */
exports.checkStatus = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: "Aucun token fourni." });
    }

    const token = authHeader.split(' ')[1];

    // Recherche de la session active associée
    const session = await Session.findOne({ token, status: 'connected' }).populate('userId');

    if (!session) {
      return res.status(401).json({ success: false, message: "Session invalide ou inexistante." });
    }

    // Vérification de la date d'expiration
    if (new Date() > session.expiresAt) {
      session.status = 'expired';
      await session.save();
      return res.status(401).json({ success: false, message: "Votre session a expiré." });
    }

    res.status(200).json({
      success: true,
      status: session.status,
      tempsRestant: `${Math.round(session.tempsRestant / 1000 / 60)} minutes`, 
      tempsRestantMs: session.tempsRestant,
      ipAddress: session.ipAddress,
      localisation: session.localisation,
      device: session.device,
      user: session.userId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    4. LOGOUT - Clôturer proprement la session
 * @route   POST /api/v1/auth/logout
 */
exports.logout = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(400).json({ success: false, message: "L'en-tête Authorization est requis." });

    const token = authHeader.split(' ')[1];

    const session = await Session.findOne({ token });
    if (session) {
      session.status = 'disconnected';
      await session.save();
    }

    res.status(200).json({ success: true, message: "Déconnexion réussie avec succès." });
  } catch (error) {
    next(error);
  }
};