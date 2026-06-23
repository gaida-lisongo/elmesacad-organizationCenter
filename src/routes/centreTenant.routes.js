const express = require('express');
const router = express.Router();
const { protectTenant, protectSession } = require('../middlewares/auth.middleware');

const { 
  getCentreDetails, updateTenantHistorique, addTenantEvents, 
  updateTenantDirecteur, addTenantDirections, updateTenantDirection, deleteTenantDirection
} = require('../controllers/centreTenant.controller');
const {
  createTenantUser,
  getTenantUsers,
  getTenantUserById,
  updateTenantUser,
  deleteTenantUser,
  updateTenantAuthorization
} = require('../controllers/userTenant.controller');

// Toutes ces routes requièrent x-api-key et x-api-secret obligatoirement
router.use(protectTenant);

router.get('/', getCentreDetails);
router.put('/historique', protectSession, updateTenantHistorique);
router.post('/historique/events', protectSession, addTenantEvents);
router.put('/directeur',protectSession, updateTenantDirecteur);
router.post('/directions', protectSession, addTenantDirections);
router.put('/directions/:directionId', protectSession, updateTenantDirection);
router.delete('/directions/:directionId', protectSession, deleteTenantDirection);// --- Endpoints de Gestion des Utilisateurs du Tenant ---

router.route('/users')
  .post(protectSession, createTenantUser) // Création + liaison Auth vide
  .get(getTenantUsers);   // Lecture (lit les autorisations)

router.route('/users/:userId')
  .get(getTenantUserById)   // Lecture détail
  .put(protectSession, updateTenantUser)     // Modification (modifie le Schéma User)
  .delete(protectSession, deleteTenantUser); // Suppression (supprime User + Auth)

// N'oublie pas de rajouter "updateTenantAuthorization" dans ton destructuring require en haut du fichier
router.route('/users/:userId/authorization')
  .put(protectSession, updateTenantAuthorization);

module.exports = router;