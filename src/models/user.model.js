// src/models/user.model.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  nomComplet: { 
    type: String, 
    required: true, 
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    lowercase: true 
  },
  matricule: { 
    type: String, 
    unique: true, 
    trim: true // Ex: "CR-001", "CR-012"
  },
  photo: { 
    type: String, 
    default: '/images/default-avatar.png' 
  },
  fonction: { 
    type: String, 
    required: true 
  }, // Ex: "Chercheuse Senior", "Directeur Général"
  grade: { 
    type: String, 
    required: true 
  }, // Ex: "Docteure en Intelligence Artificielle", "Professeur Ordinaire"
  nationalite: { 
    type: String, 
    default: 'Congolaise' 
  }
}, {
  timestamps: true // Génère createdAt et updatedAt automatiquement
});

/**
 * Middleware Mongoose (Pre-save hook)
 * S'exécute automatiquement avant l'enregistrement en base de données
 */
UserSchema.pre('save', function() {
  // On ne génère le matricule que s'il s'agit d'un nouveau document et qu'il n'est pas déjà défini
  if (this.isNew && !this.matricule) {
    // Génère une chaîne aléatoire de 3 octets (6 caractères hexadécimaux) : ex: "a1b2c3"
    const uniqueId = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.matricule = `CR-${uniqueId}`;
  }
});

module.exports = mongoose.model('User', UserSchema);