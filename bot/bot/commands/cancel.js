const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../utils/helpers');
const { db } = require('../utils/firebase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cancel')
    .setDescription('Cancel and close a rejected order ticket')
    .addStringOption(option => 
      option.setName('orderid')
        .setDescription('The Order ID to cancel')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for cancellation (optional)')
        .setRequired(false)),
        
  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ **Anda tidak memiliki izin.**', ephemeral: true });
    }

    const orderIdOption = interaction.options.getString('orderid');
    const reason = interaction.options.getString('reason') || 'Order rejected by admin';
    let targetOrderId = orderIdOption;

    // Try to infer orderId from channel if not provided
    if (!targetOrderId && interaction.channel.name.startsWith('ticket-')) {
      const snapshot = await db.collection('orders')
        .where('ticket_id', '==', interaction.channel.id)
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        targetOrderId = snapshot.docs[0].id;
      }
    }

    if (!targetOrderId) {
      return interaction.reply({ 
        content: '❌ **Order ID tidak ditemukan.** Gunakan `/cancel orderid:ORD-XXX` atau jalankan command ini di channel ticket.', 
        ephemeral: true 
      });
    }

    try {
      // Get order from Firestore
      const orderRef = db.collection('orders').doc(targetOrderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        return interaction.reply({
          content: `❌ **Order \`${targetOrderId}\` tidak ditemukan.**`,
          ephemeral: true
        });
      }

      const orderData = orderDoc.data();

      // Check if order is already rejected
      if (orderData.status !== 'REJECTED') {
        return interaction.reply({
          content: `⚠️ **Order ini belum di-reject.** Status saat ini: \`${orderData.status}\`\n\nGunakan reject order terlebih dahulu dari admin panel.`,
          ephemeral: true
        });
      }

      // Send closing message
      const closeEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('🚫 Order Cancelled')
        .setDescription(`Order **${targetOrderId}** telah dibatalkan.`)
        .addFields(
          { name: 'Status', value: 'REJECTED', inline: true },
          { name: 'Reason', value: reason, inline: false },
          { name: 'Rejected By', value: orderData.rejectionReason || 'Admin', inline: false }
        )
        .setFooter({ text: `Closed by ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.channel.send({ embeds: [closeEmbed] });

      // Close/delete the channel after 5 seconds
      await interaction.reply({
        content: `✅ **Ticket untuk order \`${targetOrderId}\` akan ditutup dalam 5 detik...**`,
        ephemeral: false
      });

      setTimeout(async () => {
        try {
          await interaction.channel.delete();
          console.log(`✅ Ticket channel closed for rejected order: ${targetOrderId}`);
        } catch (err) {
          console.error('Error deleting channel:', err);
        }
      }, 5000);

    } catch (error) {
      console.error('Error cancelling order:', error);
      return interaction.reply({
        content: `❌ **Error:** ${error.message}`,
        ephemeral: true
      });
    }
  }
};
