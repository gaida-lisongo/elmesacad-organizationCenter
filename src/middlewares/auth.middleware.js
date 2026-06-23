// src/middlewares/auth.middleware.js
const Session = require('../models/session.model'); // Adapte le chemin vers ton modèle Session
const User = require('../models/user.model');
const Centre = require('../models/centre.model');

/**
 * Middleware d'authentification pour les API clients (Multi-tenant)
 * Valide la clé API et le secret, puis attache le centre à l'objet `req`.
 */
exports.protectTenant = async (req, res, next) => {
  try {
    // 1. Récupération des credentials depuis les headers (insensible à la casse)
    const apiKey = req.headers['x-api-key'];
    const apiSecret = req.headers['x-api-secret'];

    // 2. Vérification de la présence des headers
    if (!apiKey || !apiSecret) {
      return res.status(401).json({
        success: false,
        message: "Accès refusé. Les headers 'x-api-key' et 'x-api-secret' sont requis."
      });
    }
    // 3. Recherche du centre correspondant
    const centreDoc = await Centre.findOne({ apiKey, apiSecret });

    if (!centreDoc) {
      return res.status(401).json({
        success: false,
        message: "Authentification échouée. Identifiants API invalides."
      });
    }

    req.centre = centreDoc;

    // On passe au middleware ou contrôleur suivant
    next();

  } catch (error) {
    // En cas d'erreur serveur, on passe le relais au middleware global de gestion des erreurs
    next(error);
  }
};

exports.protectSession = async (req, res, next) => {
  try {
    let token;

    // 1. Extraction du token depuis le header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: "Accès refusé. Aucun jeton de session fourni." 
      });
    }

    // 2. Recherche de la session active dans MongoDB
    const session = await Session.findOne({ token });

    if (!session) {
      return res.status(401).json({ 
        success: false, 
        message: "Session invalide ou expirée." 
      });
    }

    // 3. Vérification de l'expiration du jeton
    if (new Date() > session.expiresAt) {
      // Optionnel : tu peux supprimer la session expirée ici pour nettoyer la BDD
      await Session.deleteOne({ _id: session._id });
      return res.status(401).json({ 
        success: false, 
        message: "Votre session a expiré. Veuillez vous reconnecter." 
      });
    }

    // 4. Récupération de l'utilisateur associé
    const user = await User.findById(session.userId);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "L'utilisateur lié à cette session n'existe plus." 
      });
    }

    // 5. Injection du contexte dans la requête
    req.user = user;
    req.sessionId = session._id;

    next(); // On passe au contrôleur suivant (ex: la gestion des centres)
  } catch (error) {
    next(error);
  }
};