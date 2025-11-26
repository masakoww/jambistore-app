const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { isAdmin } = require('../utils/helpers');
const { db } = require('../utils/firebase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close an order and record financials')
    .addStringOption(option => 
      option.setName('orderid')
        .setDescription('The Order ID to close')
        .setRequired(false)), // Optional because we can infer from channel
        
  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ **Anda tidak memiliki izin.**', ephemeral: true });
    }

    const orderIdOption = interaction.options.getString('orderid');
    let targetOrderId = orderIdOption;

    // Try to infer orderId from channel topic or name if not provided
    if (!targetOrderId && interaction.channel.name.startsWith('ticket-')) {
       // Try to find order linked to this channel
       const snapshot = await db.collection('orders').where('ticket_channel_id', '==', interaction.channel.id).limit(1).get();
       if (!snapshot.empty) {
         targetOrderId = snapshot.docs[0].id;
       }
    }

    if (!targetOrderId) {
       return interaction.reply({ content: '❌ **Order ID tidak ditemukan.** Gunakan `/close orderid:ORD-XXX`', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`close_order_${targetOrderId}`)
      .setTitle('Close Order - Financial Data');

    const cogsInput = new TextInputBuilder()
      .setCustomId('cogs')
      .setLabel('COGS (Modal)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., 50000')
      .setRequired(true);

    const sellingPriceInput = new TextInputBuilder()
      .setCustomId('selling_price')
      .setLabel('Selling Price (Jual)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., 75000')
      .setRequired(true);

    const notesInput = new TextInputBuilder()
      .setCustomId('notes')
      .setLabel('Notes')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(cogsInput),
      new ActionRowBuilder().addComponents(sellingPriceInput),
      new ActionRowBuilder().addComponents(notesInput)
    );

    await interaction.showModal(modal);
  }
};
