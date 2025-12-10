const { SlashCommandBuilder } = require('discord.js');
const { db } = require('../utils/firebase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('showqr')
    .setDescription('Show a specific QR image in the ticket')
    .addStringOption(opt => opt.setName('orderid').setDescription('Order ID').setRequired(true))
    .addStringOption(opt => opt.setName('name').setDescription('QR image name to show').setRequired(true)),
  async execute(interaction) {
    const orderId = interaction.options.getString('orderid');
    const name = interaction.options.getString('name');
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) return interaction.reply({ content: 'Order not found.', ephemeral: true });
    const order = orderDoc.data();
    if (!order.qrImages || !Array.isArray(order.qrImages)) return interaction.reply({ content: 'No QR images found for this order.', ephemeral: true });
    const qr = order.qrImages.find(q => q.name === name);
    if (!qr) return interaction.reply({ content: `QR image '${name}' not found.`, ephemeral: true });
    await interaction.reply({ content: `QR image: ${name}`, files: [qr.url], ephemeral: false });
  }
};
