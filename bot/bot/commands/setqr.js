const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { db } = require('../utils/firebase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setqr')
    .setDescription('Upload up to 3 QR images for this order')
    .addAttachmentOption(opt => opt.setName('qr1').setDescription('QR Image 1'))
    .addAttachmentOption(opt => opt.setName('qr2').setDescription('QR Image 2'))
    .addAttachmentOption(opt => opt.setName('qr3').setDescription('QR Image 3'))
    .addStringOption(opt => opt.setName('default').setDescription('Default QR image: qr1, qr2, or qr3')),
  async execute(interaction) {
    const qr1 = interaction.options.getAttachment('qr1');
    const qr2 = interaction.options.getAttachment('qr2');
    const qr3 = interaction.options.getAttachment('qr3');
    const defaultName = interaction.options.getString('default');

    const qrImages = [];
    if (qr1) qrImages.push({ name: 'qr1', url: qr1.url });
    if (qr2) qrImages.push({ name: 'qr2', url: qr2.url });
    if (qr3) qrImages.push({ name: 'qr3', url: qr3.url });

    if (qrImages.length === 0) {
      return interaction.reply({ content: 'No QR images uploaded.', ephemeral: true });
    }

    // Validate default
    let defaultQR = 'qr1';
    if (['qr1','qr2','qr3'].includes(defaultName)) {
      defaultQR = defaultName;
    } else if (qrImages.length > 0) {
      defaultQR = qrImages[0].name;
    }

    // Update Firestore for all orders with these QR images
    // Find the latest order for this admin in Firestore
    // (You may want to customize this logic for your workflow)
    // For now, just update the latest order created by this admin
    const ordersRef = db.collection('orders').where('discordId', '==', interaction.user.id).orderBy('createdAt', 'desc').limit(1);
    const ordersSnap = await ordersRef.get();
    if (ordersSnap.empty) {
      return interaction.reply({ content: 'No order found for you. Create a ticket first.', ephemeral: true });
    }
    const orderDoc = ordersSnap.docs[0];
    await orderDoc.ref.update({
      qrImages,
      defaultQR
    });

    await interaction.reply({ content: `QR images uploaded. Default: ${defaultQR}`, ephemeral: true });
  }
};
