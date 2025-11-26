const express = require('express');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const { db, admin } = require('./utils/firebase');
const { getBotConfig, ADMIN_ROLES } = require('./utils/helpers');
const { createOrderTicket, createSupportTicket } = require('./utils/ticketUtils');

function startWebhookServer(client) {
  const app = express();
  app.use(express.json());
  const PORT = process.env.PORT || 3001;

  app.post('/create-order-ticket', async (req, res) => {
    console.log('📨 [Webhook] Create Order Ticket:', req.body);
    const { orderId, customerEmail, productName, customerName, paymentProofURL, estimation } = req.body;

    if (!orderId) return res.status(400).json({ success: false, message: 'Missing orderId' });

    try {
      // Construct order data object for helper
      const orderData = {
        id: orderId,
        productName,
        customerName,
        customerEmail,
        paymentProofURL,
        estimation,
        status: 'PENDING'
      };

      const channel = await createOrderTicket(client, orderData, 'buy');

      res.json({ success: true, channelId: channel.id });

    } catch (error) {
      console.error('❌ Create Ticket Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post('/webhook/support-ticket', async (req, res) => {
    const { ticketId, userEmail, subject, description } = req.body;
    if (!ticketId) return res.status(400).json({ success: false });

    try {
      const ticketData = {
        orderId: ticketId,
        discordId: null, // Webhook might not have discordId readily available unless passed
        reason: `${subject}\n${description}`,
        orderStatus: 'Unknown'
      };

      const channel = await createSupportTicket(client, ticketData);

      res.json({ success: true, channelId: channel.id });

    } catch (error) {
      console.error('Support Ticket Error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.listen(PORT, () => {
    console.log(`🚀 Bot API Server running on port ${PORT}`);
  });
}

module.exports = { startWebhookServer };
