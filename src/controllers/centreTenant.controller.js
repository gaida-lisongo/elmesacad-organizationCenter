// src/controllers/centreTenant.controller.js
const Centre = require('../models/centre.model');

// GET /api/v1/centre/
exports.getCentreDetails = async (req, res, next) => {
  try {
    // req.centre est fourni directement par le middleware d'authentification
        // 4. Nettoyage des credentials sensibles
    // .toObject() convertit le document Mongoose en un objet JS natif modifiable
    const centre = req.centre.toObject();
    
    delete centre.apiKey;
    delete centre.apiSecret;

    // 5. Injection du centre sain dans l'objet 'req'
    res.status(200).json({ success: true, data: centre });
  } catch (error) { next(error); }
};

// PUT /api/v1/centre/historique
exports.updateTenantHistorique = async (req, res, next) => {
  try {
    const { titre, sousTitre, description, image } = req.body;
    req.centre.historique.titre = titre || req.centre.historique.titre;
    req.centre.historique.sousTitre = sousTitre || req.centre.historique.sousTitre;
    req.centre.historique.description = description || req.centre.historique.description;
    req.centre.historique.image = image || req.centre.historique.image;

    await req.centre.save();
    res.status(200).json({ success: true, data: req.centre.historique });
  } catch (error) { next(error); }
};

// POST /api/v1/centre/historique/events
exports.addTenantEvents = async (req, res, next) => {
  try {
    const { events } = req.body;
    if (!events) return res.status(400).json({ success: false, message: "Événements manquants." });

    if (Array.isArray(events)) {
      req.centre.historique.events.push(...events);
    } else {
      req.centre.historique.events.push(events);
    }

    await req.centre.save();
    res.status(200).json({ success: true, data: req.centre.historique.events });
  } catch (error) { next(error); }
};

// PUT /api/v1/centre/directeur
exports.updateTenantDirecteur = async (req, res, next) => {
  try {
    req.centre.directeur = { ...req.centre.directeur, ...req.body };
    await req.centre.save();
    res.status(200).json({ success: true, data: req.centre.directeur });
  } catch (error) { next(error); }
};



// POST /api/v1/centre/directions
exports.addTenantDirections = async (req, res, next) => {
  try {
    const { directions } = req.body;
    if (!directions) return res.status(400).json({ success: false, message: "Directions manquantes." });

    if (Array.isArray(directions)) {
      req.centre.directions = [...req.centre.directions, ...directions];
    } else {
      req.centre.directions.push(directions);
    }

    await req.centre.save();
    res.status(200).json({ success: true, data: req.centre.directions });
  } catch (error) { next(error); }
};

// PUT /api/v1/centre/directions/:directionId
exports.updateTenantDirection = async (req, res, next) => {
  try {
    const { directionId } = req.params;
    const updateData = req.body;

    const direction = req.centre.directions.id(directionId);
    if (!direction) {
      return res.status(404).json({ success: false, message: "Direction introuvable." });
    }

    Object.assign(direction, updateData);
    await req.centre.save();
    res.status(200).json({ success: true, data: req.centre.directions });
  } catch (error) { next(error); }
};

// DELETE /api/v1/centre/directions/:directionId
exports.deleteTenantDirection = async (req, res, next) => {
  try {
    const { directionId } = req.params;

    const direction = req.centre.directions.id(directionId);
    if (!direction) {
      return res.status(404).json({ success: false, message: "Direction introuvable." });
    }

    direction.deleteOne();
    await req.centre.save();
    res.status(200).json({ success: true, data: req.centre.directions });
  } catch (error) { next(error); }
};