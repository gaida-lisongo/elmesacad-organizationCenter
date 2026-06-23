// src/routes/index.js
const express = require('express');
const router = express.Router();
const centreRoutes = require('./centre.routes');
const centreTenantRoutes = require('./centreTenant.routes');
const authRoutes = require('./auth.routes');
const { protectSession } = require('../middlewares/auth.middleware');

// Route de test
router.get('/', (req, res) => {
  res.json({ message: "Bienvenue sur l'API V1 de organization-service" });
});

router.use('/auth', authRoutes);

// Gestion interne isolée par clé API
router.use('/centre', centreTenantRoutes); 

// Montage du CRUD des centres
router.use('/centres', protectSession, centreRoutes);
  
module.exports = router;