// src/models/authorization.model.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const PermissionSchema = new mongoose.Schema({
  designation: { 
    type: String, 
    required: true 
  }, // Ex: "manage_users", "view_financials"
  password: { 
    type: String, 
    required: true 
  } // Mot de passe ou clé secrète spécifique à cette permission
});

const AuthorizationSchema = new mongoose.Schema({
  centreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Centre',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['admin', 'agent'],
    default: 'agent',
    required: true
  },
  permissions: [PermissionSchema] // Tableau d'objets avec désignation et password
}, {
  timestamps: true
});

// Contrainte d'unicité : un utilisateur unique par centre
AuthorizationSchema.index({ centreId: 1, userId: 1 }, { unique: true });
/**
 * Middleware Mongoose (Pre-save hook)
 * Intercepte le document avant l'écriture en BDD pour chiffrer les mots de passe des permissions
 */
AuthorizationSchema.pre('save', function() {
  // On ne parcourt le tableau que si la propriété 'permissions' a été modifiée ou ajoutée
  if (this.isModified('permissions')) {
    this.permissions.forEach(permission => {
      // Un hash SHA-256 valide fait exactement 64 caractères hexadécimaux.
      // S'il ne fait pas 64 caractères, cela signifie que c'est un mot de passe en texte brut qui vient d'être soumis.
      if (permission.password && permission.password.length !== 64) {
        permission.password = crypto
          .createHash('sha256')
          .update(permission.password)
          .digest('hex');
      }
    });
  }
});
module.exports = mongoose.model('Authorization', AuthorizationSchema);