// src/controllers/centre.controller.js
const Centre = require('../models/centre.model');
const crypto = require('crypto');

/**
 * @desc    1. CRÉATION - Créer un nouveau centre de recherche (ex: INBTP)
 * @route   POST /api/v1/centres
 */
exports.createCentre = async (req, res, next) => {
  try {
    const { nom, sigle, logo, directeur } = req.body;

    if (!nom || !sigle) {
      return res.status(400).json({
        success: false,
        message: "Le nom et le sigle du centre sont obligatoires."
      });
    }

    // Génération automatique des credentials API pour ton middleware multi-tenant
    const apiKey = `crt_${crypto.randomBytes(12).toString('hex')}`;
    const apiSecret = `scr_${crypto.randomBytes(24).toString('hex')}`;

    const newCentre = await Centre.create({
      nom,
      sigle,
      logo,
      apiKey,
      apiSecret,
      directeur, // Optionnel à la création, contiendra le matricule, vision, missions, etc.
      historique: { events: [] },
      directions: []
    });

    res.status(201).json({
      success: true,
      message: `Centre de recherche "${sigle}" créé avec succès.`,
      data: newCentre
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    7. UPDATE - Définir ou modifier le directeur d'un centre (avec sa vision et ses missions)
 * @route   PUT /api/v1/centres/:id/directeur
 */
exports.updateDirecteur = async (req, res, next) => {
  try {
    const { matricule, nomComplet, grade, photo, vision, missions } = req.body;
    const centreId = req.params.id;

    const updatedCentre = await Centre.findByIdAndUpdate(
      centreId,
      {
        $set: {
          directeur: {
            matricule,
            nomComplet,
            grade,
            photo,
            vision,
            missions // Reçoit directement le tableau de chaînes de caractères de ton template
          }
        }
      },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedCentre) {
      return res.status(404).json({ success: false, message: "Centre non trouvé." });
    }

    res.status(200).json({
      success: true,
      message: "Informations du directeur mises à jour avec succès.",
      data: updatedCentre.directeur
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    2. UPDATE - Définir ou modifier l'historique de base d'un centre
 * @route   PUT /api/v1/centres/:id/historique
 */
exports.updateHistoriqueBase = async (req, res, next) => {
  try {
    const { titre, sousTitre, description, image } = req.body;
    const centreId = req.params.id;

    // Utilisation du "dot notation" de Mongoose pour modifier uniquement les champs de l'historique sans écraser le tableau events[]
    const updatedCentre = await Centre.findByIdAndUpdate(
      centreId,
      {
        $set: {
          'historique.titre': titre,
          'historique.sousTitre': sousTitre,
          'historique.description': description,
          'historique.image': image
        }
      },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedCentre) {
      return res.status(404).json({ success: false, message: "Centre non trouvé." });
    }

    res.status(200).json({
      success: true,
      message: "Historique mis à jour avec succès.",
      data: updatedCentre.historique
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    3. UPDATE - Ajouter un ou plusieurs événements à l'historique d'un centre
 * @route   POST /api/v1/centres/:id/historique/events
 */
exports.addHistoriqueEvents = async (req, res, next) => {
  try {
    const { events } = req.body; // Doit être un tableau d'événements [{ annee, titre, description }] ou un objet seul
    const centreId = req.params.id;

    if (!events) {
      return res.status(400).json({ success: false, message: "Données d'événements manquantes." });
    }

    // $push combiné avec $each permet d'ajouter un tableau d'éléments d'un coup dans le tableau de sous-documents
    const updatedCentre = await Centre.findByIdAndUpdate(
      centreId,
      {
        $push: {
          'historique.events': Array.isArray(events) ? { $each: events } : events
        }
      },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedCentre) {
      return res.status(404).json({ success: false, message: "Centre non trouvé." });
    }

    res.status(200).json({
      success: true,
      message: "Événement(s) ajouté(s) à l'historique avec succès.",
      data: updatedCentre.historique.events
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    4. UPDATE - Ajouter une ou plusieurs directions au centre
 * @route   POST /api/v1/centres/:id/directions
 */
exports.addDirections = async (req, res, next) => {
  try {
    const { directions } = req.body; // [{ title, sigle, responsable: { matricule, ... }, description }]
    const centreId = req.params.id;

    if (!directions) {
      return res.status(400).json({ success: false, message: "Données des directions manquantes." });
    }

    const updatedCentre = await Centre.findByIdAndUpdate(
      centreId,
      {
        $push: {
          directions: Array.isArray(directions) ? { $each: directions } : directions
        }
      },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedCentre) {
      return res.status(404).json({ success: false, message: "Centre non trouvé." });
    }

    res.status(200).json({
      success: true,
      message: "Direction(s) ajoutée(s) avec succès.",
      data: updatedCentre.directions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    5. LECTURE - Récupérer la liste globale de tous les centres
 * @route   GET /api/v1/centres
 */
exports.getAllCentres = async (req, res, next) => {
  try {
    // Par sécurité, on masque le secret d'API lors d'un listage général
    const centres = await Centre.find().select('-apiSecret');

    res.status(200).json({
      success: true,
      count: centres.length,
      data: centres
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    6. LECTURE - Voir le détail complet d'un centre par son ID
 * @route   GET /api/v1/centres/:id
 */
exports.getCentreById = async (req, res, next) => {
  try {
    const centre = await Centre.findById(req.params.id);

    if (!centre) {
      return res.status(404).json({
        success: false,
        message: "Centre de recherche non trouvé."
      });
    }

    res.status(200).json({
      success: true,
      data: centre
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Modifier (mettre à jour) les informations d'un centre
 * @route   PUT /api/v1/centres/:id
 */
exports.updateCentre = async (req, res, next) => {
  try {
    // Ne pas permettre la modification directe des API keys via ce endpoint pour éviter les failles
    if (req.body.apiKey || req.body.apiSecret) {
      return res.status(400).json({
        success: false,
        message: "La modification directe des clés API n'est pas autorisée par cette route."
      });
    }

    const updatedCentre = await Centre.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedCentre) {
      return res.status(404).json({
        success: false,
        message: "Centre de recherche non trouvé."
      });
    }

    res.status(200).json({
      success: true,
      message: "Centre mis à jour avec succès.",
      data: updatedCentre
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Supprimer un centre de recherche
 * @route   DELETE /api/v1/centres/:id
 */
exports.deleteCentre = async (req, res, next) => {
  try {
    const centre = await Centre.findByIdAndDelete(req.params.id);

    if (!centre) {
      return res.status(404).json({
        success: false,
        message: "Centre de recherche non trouvé."
      });
    }

    res.status(200).json({
      success: true,
      message: `Le centre "${centre.nom}" a été supprimé avec succès.`
    });
  } catch (error) {
    next(error);
  }
};