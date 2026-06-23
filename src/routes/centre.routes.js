// src/routes/centre.routes.js
const express = require('express');
const router = express.Router();

const {
  createCentre,
  getAllCentres,
  getCentreById,
  updateCentre,
  updateHistoriqueBase,
  addHistoriqueEvents,
  updateDirecteur,
  addDirections,
  deleteCentre
} = require('../controllers/centre.controller');

// Routes racine : /api/v1/centres
router.route('/')
  .post(createCentre)
  .get(getAllCentres);

// Routes avec ID : /api/v1/centres/:id
router.route('/:id')
  .get(getCentreById)
  .put(updateCentre)
  .delete(deleteCentre);

// --- Routes Spécifiques (Mises à jour par blocs métier) ---
router.route('/:id/historique')
  .put(updateHistoriqueBase); // 2. Définir/Modifier l'historique de base

router.route('/:id/historique/events')
  .post(addHistoriqueEvents); // 3. Ajouter des événements à l'historique

router.route('/:id/directions')
  .post(addDirections);       // 4. Ajouter des directions

// Associer la fonction à la route PUT /api/v1/centres/:id/directeur
router.route('/:id/directeur')
  .put(updateDirecteur);

module.exports = router;