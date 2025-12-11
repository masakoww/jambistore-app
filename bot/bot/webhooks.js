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
    const body = req.body || {};
    console.log('📨 [Webhook] Create Order Ticket called', { ip: req.ip || req.connection?.remoteAddress });
    console.log('Headers:', req.headers);
    console.log('Body keys:', Object.keys(body));

    // Accept multiple possible field names
    const orderId = body.orderId || body.id || body.order || null;
    const customerEmail = body.customerEmail || body.email || body.userEmail || null;
    const customerName = body.customerName || body.customer || body.username || body.userName || null;
    const productName = body.productName || body.product || null;
    const paymentProofURL = body.paymentProofURL || body.paymentProofUrl || body.paymentProof || null;
    const estimation = body.estimation || body.eta || null;
    const productImage = body.productImage || body.productImageUrl || null;
    const amount = typeof body.amount === 'number' ? body.amount : (body.amount ? Number(body.amount) : null);

    if (!orderId) {
      console.warn('⚠️ [Webhook] Missing orderId in payload');
      return res.status(400).json({ success: false, message: 'Missing orderId' });
    }

    try {
      const orderData = {
        id: orderId,
        productName: productName || 'Unknown Product',
        productImage: productImage || null,
        customerName: customerName || null,
        customerEmail: customerEmail || null,
        paymentProofURL: paymentProofURL || null,
        estimation: estimation || null,
        amount: amount || null,
        status: 'PENDING'
      };

      const channel = await createOrderTicket(client, orderData, 'buy', 'website');

      res.json({ success: true, ticketId: channel.id, channelId: channel.id });
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

  // Close ticket endpoint for rejected orders
  app.post('/close-ticket', async (req, res) => {
    const { orderId, ticketId, reason, status } = req.body;
    
    console.log('📨 [Webhook] Close Ticket called', { orderId, ticketId, status });

    if (!ticketId) {
      return res.status(400).json({ success: false, message: 'Missing ticketId' });
    }

    try {
      const channel = await client.channels.fetch(ticketId);
      
      if (!channel) {
        return res.status(404).json({ success: false, message: 'Channel not found' });
      }

      // Send closing message
      const closeEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('🚫 Order Rejected & Closed')
        .setDescription(`Order **${orderId}** has been rejected.`)
        .addFields(
          { name: 'Status', value: status || 'REJECTED', inline: true },
          { name: 'Reason', value: reason || 'Rejected by admin', inline: false }
        )
        .setFooter({ text: 'Ticket will be closed automatically' })
        .setTimestamp();

      await channel.send({ embeds: [closeEmbed] });

      // Close the channel after 5 seconds
      setTimeout(async () => {
        try {
          await channel.delete();
          console.log(`✅ Ticket channel ${ticketId} deleted for order ${orderId}`);
        } catch (err) {
          console.error('Error deleting channel:', err);
        }
      }, 5000);

      res.json({ success: true, message: 'Ticket will be closed in 5 seconds' });

    } catch (error) {
      console.error('❌ Error closing ticket:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.listen(PORT, () => {
    console.log(`🚀 Bot API Server running on port ${PORT}`);
  });
}

module.exports = { startWebhookServer };
