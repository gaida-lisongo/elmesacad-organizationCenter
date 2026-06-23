// src/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
require('dotenv').config();

const { errorHandler } = require('./middlewares/error.middleware');
const apiRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// Middlewares Globaux
// ==========================================
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ==========================================
// Connexion Base de Données (MongoDB)
// ==========================================
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/organization-service');
    console.log(`[Database] MongoDB connecté : ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database] Erreur de connexion : ${error.message}`);
    process.exit(1); // Arrêt du processus en cas d'échec critique
  }
};

connectDB();

// ==========================================
// Routes de l'API
// ==========================================
// Route de santé (Health Check)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'organization-service', timestamp: new Date() });
});

// Montage des routes sous le préfixe /api/v1
app.use('/api/v1', apiRoutes);

// ==========================================
// Gestion globale des erreurs
// ==========================================
app.use(errorHandler);

// ==========================================
// Démarrage du Serveur
// ==========================================
app.listen(PORT, () => {
  console.log(`[Server] Serveur en cours d'exécution sur le port ${PORT} en mode dev.`);
});