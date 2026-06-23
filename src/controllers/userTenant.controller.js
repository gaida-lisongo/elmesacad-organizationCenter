// src/controllers/userTenant.controller.js
const User = require('../models/user.model');
const Authorization = require('../models/authorization.model');

/**
 * @desc    1. CRÉATION - Créer un user et lui lier directement une autorisation au centre (sans permission)
 * @route   POST /api/v1/centre/users
 */
exports.createTenantUser = async (req, res, next) => {
  try {
    const { nomComplet, email, photo, fonction, grade, nationalite } = req.body;
    const centreId = req.centre._id; // Récupéré automatiquement via protectTenant

    // 1. Validation minimale
    if (!nomComplet || !email || !fonction || !grade) {
      return res.status(400).json({ success: false, message: "Champs obligatoires manquants." });
    }

    // 2. Création de l'utilisateur dans la collection globale
    const newUser = await User.create({
      nomComplet, email, photo, fonction, grade, nationalite
    });

    // 3. Création automatique de l'autorisation liée à ce centre (sans permissions)
    const newAuth = await Authorization.create({
      centreId,
      userId: newUser._id,
      role: 'agent', // Rôle par défaut au sein du centre
      permissions: [] // Vide par défaut conformément aux instructions
    });

    res.status(201).json({
      success: true,
      message: "Utilisateur créé et rattaché au centre avec succès.",
      data: {
        user: newUser,
        authorization: newAuth
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    2. LECTURE (LISTE) - Récupérer les utilisateurs d'un tenant à travers leurs autorisations
 * @route   GET /api/v1/centre/users
 */
exports.getTenantUsers = async (req, res, next) => {
  try {
    const centreId = req.centre._id;

    // On cherche les autorisations du centre et on peuple ("join") avec les données de l'utilisateur global
    const autorisations = await Authorization.find({ centreId })
      .populate('userId');

    res.status(200).json({
      success: true,
      count: autorisations.length,
      data: autorisations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    3. LECTURE (DÉTAIL) - Récupérer le détail d'un utilisateur du tenant
 * @route   GET /api/v1/centre/users/:userId
 */
exports.getTenantUserById = async (req, res, next) => {
  try {
    const centreId = req.centre._id;
    const { userId } = req.params;

    const autorisation = await Authorization.findOne({ centreId, userId })
      .populate('userId');

    if (!autorisation) {
      return res.status(404).json({ 
        success: false, 
        message: "Cet utilisateur n'existe pas ou n'appartient pas à votre centre." 
      });
    }

    res.status(200).json({ success: true, data: autorisation });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    4. MODIFICATION - Modifier le profil global du user (Interagit avec le schéma User)
 * @route   PUT /api/v1/centre/users/:userId
 */
exports.updateTenantUser = async (req, res, next) => {
  try {
    const centreId = req.centre._id;
    const { userId } = req.params;

    // Vérification de sécurité : est-ce que ce user appartient bien à ce tenant ?
    const accessCheck = await Authorization.findOne({ centreId, userId });
    if (!accessCheck) {
      return res.status(403).json({ success: false, message: "Action interdite. Ce membre n'appartient pas à votre centre." });
    }

    // Mise à jour directe sur le Schéma User global
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      req.body,
      { returnDocument: 'after', runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Profil de l'utilisateur mis à jour avec succès.",
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};
// À rajouter dans src/controllers/userTenant.controller.js

/**
 * @desc    6. AUTORISATIONS - Modifier le rôle et gérer (ajouter/supprimer) les permissions d'un utilisateur
 * @route   PUT /api/v1/centre/users/:userId/authorization
 */
exports.updateTenantAuthorization = async (req, res, next) => {
  try {
    const centreId = req.centre._id; // Extrait via le middleware protectTenant
    const { userId } = req.params;
    const { role, addPermissions, removePermissionsDesignations } = req.body;

    // 1. Rechercher l'autorisation existante pour ce couple User/Centre
    let autorisation = await Authorization.findOne({ centreId, userId });
    
    if (!autorisation) {
      return res.status(404).json({ 
        success: false, 
        message: "Configuration d'autorisation introuvable pour cet utilisateur dans ce centre." 
      });
    }

    // 2. Mise à jour du rôle (si fourni)
    if (role) {
      if (!['admin', 'agent'].includes(role)) {
        return res.status(400).json({ success: false, message: "Rôle invalide. Doit être 'admin' ou 'agent'." });
      }
      autorisation.role = role;
    }

    // 3. Suppression de permissions (par désignation)
    if (removePermissionsDesignations && Array.isArray(removePermissionsDesignations)) {
      autorisation.permissions = autorisation.permissions.filter(
        perm => !removePermissionsDesignations.includes(perm.designation)
      );
    }

    // 4. Ajout de nouvelles permissions [{ designation, password }]
    if (addPermissions && Array.isArray(addPermissions)) {
      for (const newPerm of addPermissions) {
        if (!newPerm.designation || !newPerm.password) {
          return res.status(400).json({ 
            success: false, 
            message: "Chaque nouvelle permission doit contenir une designation et un password." 
          });
        }

        // Éviter les doublons de désignation au sein du tableau
        const alreadyExists = autorisation.permissions.some(p => p.designation === newPerm.designation);
        if (!alreadyExists) {
          autorisation.permissions.push({
            designation: newPerm.designation,
            password: newPerm.password // Le mot de passe requis par ton architecture
          });
        }
      }
    }

    // 5. Sauvegarde des modifications
    await autorisation.save();

    res.status(200).json({
      success: true,
      message: "Autorisations et permissions mises à jour avec succès.",
      data: autorisation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    5. SUPPRESSION - Supprimer un utilisateur du tenant (Supprime le User global et ses autorisations)
 * @route   DELETE /api/v1/centre/users/:userId
 */
exports.deleteTenantUser = async (req, res, next) => {
  try {
    const centreId = req.centre._id;
    const { userId } = req.params;

    // Vérification de sécurité : le tenant détient-il ce user ?
    const accessCheck = await Authorization.findOne({ centreId, userId });
    if (!accessCheck) {
      return res.status(403).json({ success: false, message: "Action interdite. Ce membre n'appartient pas à votre centre." });
    }

    // 1. Suppression de toutes ses autorisations pour ce centre
    await Authorization.deleteOne({ centreId, userId });

    // 2. Suppression de l'utilisateur global
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "L'utilisateur et ses accès ont été révoqués et supprimés avec succès."
    });
  } catch (error) {
    next(error);
  }
};