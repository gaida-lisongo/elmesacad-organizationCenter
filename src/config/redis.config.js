// src/config/redis.config.js
const { Redis } = require('@upstash/redis');

class RedisService {
  constructor() {
    if (!RedisService.instance) {
      // Initialisation unique de l'instance Upstash Redis depuis le .env
      this.client = Redis.fromEnv();
      RedisService.instance = this;
      console.log("[Redis] Client Upstash initialisé avec succès (Singleton).");
    }
    return RedisService.instance;
  }

  /**
   * Créer ou modifier une entrée dans Redis
   * @param {string} key - La clé unique (ex: "otp:CR-001")
   * @param {any} value - La valeur à stocker (sera convertie en string si c'est un objet)
   * @param {number} ttlInSeconds - Durée de vie optionnelle en secondes (ex: 300 pour 5 min)
   */
  async set(key, value, ttlInSeconds = null) {
    try {
      const options = {};
      if (ttlInSeconds) {
        options.ex = ttlInSeconds; // Ajoute l'expiration native Redis
      }
      
      await this.client.set(key, value, options);
      return true;
    } catch (error) {
      console.error(`[Redis Error] Échec du set pour la clé ${key}:`, error);
      throw error;
    }
  }

  /**
   * Lire une entrée depuis Redis
   * @param {string} key - La clé à chercher
   * @returns {Promise<any>} La valeur trouvée ou null
   */
  async get(key) {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error(`[Redis Error] Échec du get pour la clé ${key}:`, error);
      throw error;
    }
  }

  /**
   * Supprimer une entrée de Redis
   * @param {string} key - La clé à supprimer
   */
  async delete(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`[Redis Error] Échec de la suppression pour la clé ${key}:`, error);
      throw error;
    }
  }
}

// Exportation d'une instance unique gelée (Pattern Singleton strict)
const redisInstance = new RedisService();
Object.freeze(redisInstance);

module.exports = redisInstance;