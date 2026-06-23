// src/models/centre.model.js
const mongoose = require('mongoose');

// Sous-schéma pour les Événements
const EventSchema = new mongoose.Schema({
  annee: { type: String, required: true },
  titre: { type: String, required: true },
  description: { type: String, required: true }
});

// Sous-schéma pour les Directions
const DirectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  sigle: { type: String, required: true },
  responsable: { 
    nomComplet: { type: String },
    grade: { type: String },
    matricule: { type: String },
    photo: { type: String },
    position: { type: String }
   },
  description: { type: String }
});

// Schéma Principal du Centre (Tenant)
const CentreSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  sigle: { type: String, required: true, trim: true },
  logo: { type: String },

  // Identifiants uniques pour l'API Multi-tenant
  apiKey: { type: String, required: true, unique: true, index: true },
  apiSecret: { type: String, required: true },

  historique: {
    titre: { type: String },
    sousTitre: { type: String },
    description: { type: String },
    image: { type: String },
    events: [EventSchema],
  },


  directeur: {
    nomComplet: { type: String },
    matricule: { type: String },
    grade: { type: String },
    photo: { type: String },
    vision: { type: String },
    missions: [{ type: String }],
  },

  directions: [DirectionSchema]
}, {
  timestamps: true // Génère automatiquement createdAt et updatedAt
});

module.exports = mongoose.model('Centre', CentreSchema);