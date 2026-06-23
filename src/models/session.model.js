// src/models/session.model.js
const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['connected', 'disconnected', 'expired'],
    default: 'connected',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true // Permet de nettoyer ou de filtrer facilement les tokens expirés
  },
  ipAddress: {
    type: String,
    required: true
  },
  localisation: {
    pays: { type: String, default: 'Inconnu' },
    ville: { type: String, default: 'Inconnu' }
  },
  device: {
    browser: { type: String, default: 'Inconnu' },
    os: { type: String, default: 'Inconnu' },
    isMobile: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Champ virtuel pour calculer dynamiquement le temps restant (en millisecondes)
SessionSchema.virtual('tempsRestant').get(function() {
  const maintenant = new Date();
  const reste = this.expiresAt - maintenant;
  return reste > 0 ? reste : 0;
});

// Forcer l'affichage des virtuels lors de la conversion en JSON
SessionSchema.set('toJSON', { virtuals: true });
SessionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Session', SessionSchema);