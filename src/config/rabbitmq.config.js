// organization-service/src/config/rabbitmq.config.js
const amqp = require('amqplib');

/**
 * Envoie une charge utile (payload) vers une file RabbitMQ spécifique
 */
exports.publishToQueue = async (queueName, data) => {
  try {
    const amqpUrl = process.env.RABBITMQ_URL || "amqp://localhost";
    const connection = await amqp.connect(amqpUrl);
    const channel = await connection.createChannel();

    await channel.assertQueue(queueName, { durable: true });
    
    // Convertit l'objet en Buffer JSON et l'envoie de manière persistante
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), {
      persistent: true
    });

    console.log(`[RabbitMQ] Message publié dans la file ${queueName}`);
    
    // Fermeture propre du canal et de la connexion
    await channel.close();
    await connection.close();
  } catch (error) {
    console.error("[RabbitMQ Publisher Error] Échec de la publication :", error);
    throw error;
  }
};