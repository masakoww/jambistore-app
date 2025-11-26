const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { handleExportModal, handleCloseOrderModal, handleDeliveryModal } = require('../utils/modalHandlers');
const { createOrderViaApi, validateOrderForClaim, validateOrderForSupport } = require('../utils/orderUtils');
const { createOrderTicket, createSupportTicket } = require('../utils/ticketUtils');
const { db } = require('../utils/firebase');
const admin = require('firebase-admin');

// Cooldown Map: userId -> timestamp
const cooldowns = new Map();

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // 1. Handle Chat Input Commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: 'There was an error executing this command!', ephemeral: true });
        } else {
          await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
        }
      }
      return;
    }

    // 2. Handle Buttons
    if (interaction.isButton()) {
      const { customId } = interaction;

      // --- PANEL BUTTONS ---
      if (['buy_button', 'claim_button', 'support_button'].includes(customId)) {
        // Check Cooldown
        const cooldownTime = customId === 'buy_button' ? 5 * 60 * 1000 : 
                             customId === 'claim_button' ? 10 * 60 * 1000 : 
                             30 * 60 * 1000;
        
        const lastUsed = cooldowns.get(`${interaction.user.id}_${customId}`);
        if (lastUsed && Date.now() - lastUsed < cooldownTime) {
          const remaining = Math.ceil((cooldownTime - (Date.now() - lastUsed)) / 60000);
          return interaction.reply({ content: `⏳ Please wait ${remaining} minutes before using this again.`, ephemeral: true });
        }

        // Show Modal
        if (customId === 'buy_button') {
          const modal = new ModalBuilder().setCustomId('buy_modal').setTitle('Buy Product');
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('productName').setLabel('Product Name').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('quantity').setLabel('Quantity').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('notes').setLabel('Notes (Optional)').setStyle(TextInputStyle.Paragraph).setRequired(false))
          );
          await interaction.showModal(modal);
        } else if (customId === 'claim_button') {
          const modal = new ModalBuilder().setCustomId('claim_modal').setTitle('Claim Order');
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('orderId').setLabel('Order ID').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel('Reason / Notes').setStyle(TextInputStyle.Paragraph).setRequired(false))
          );
          await interaction.showModal(modal);
        } else if (customId === 'support_button') {
          const modal = new ModalBuilder().setCustomId('support_modal').setTitle('Support Request');
          modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('orderId').setLabel('Order ID').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel('Issue Description').setStyle(TextInputStyle.Paragraph).setRequired(true))
          );
          await interaction.showModal(modal);
        }
        return;
      }

      // --- TICKET ACTIONS ---
      if (customId === 'close_ticket') {
        // 2-Step Close Flow: Select Product -> Modal
        const productsSnapshot = await db.collection('products').where('status', '==', 'ACTIVE').get();
        const options = productsSnapshot.docs.map(doc => ({
          label: doc.data().title,
          value: doc.data().slug,
          description: `ID: ${doc.id.slice(0, 8)}...`
        })).slice(0, 25); // Max 25 options

        // Add "Custom / Other" option
        options.push({ label: 'Other / Custom', value: 'custom-order', description: 'Product not listed' });

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('close_product_select')
          .setPlaceholder('Select the product for this order')
          .addOptions(options);

        await interaction.reply({ 
          content: 'Please select the product associated with this order:', 
          components: [new ActionRowBuilder().addComponents(selectMenu)], 
          ephemeral: true 
        });
        return;
      }
      
      if (customId === 'claim_ticket') {
          await interaction.reply({ content: 'Feature coming soon.', ephemeral: true });
      }
    }

    // 3. Handle Select Menus
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'close_product_select') {
        const selectedSlug = interaction.values[0];
        
        // Show Financials Modal
        const modal = new ModalBuilder().setCustomId(`close_financial_modal:${selectedSlug}`).setTitle('Close Order Financials');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('selling_price').setLabel('Selling Price').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('cogs').setLabel('COGS (Capital Cost)').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('notes').setLabel('Closing Notes').setStyle(TextInputStyle.Paragraph).setRequired(false))
        );
        
        await interaction.showModal(modal);
      }
    }

    // 4. Handle Modals
    if (interaction.isModalSubmit()) {
      const { customId } = interaction;

      // --- PANEL MODALS ---
      if (customId === 'buy_modal') {
        await interaction.deferReply({ ephemeral: true });
        const productName = interaction.fields.getTextInputValue('productName');
        const quantity = parseFloat(interaction.fields.getTextInputValue('quantity'));
        const notes = interaction.fields.getTextInputValue('notes');

        if (isNaN(quantity) || quantity <= 0) {
          return interaction.editReply('❌ Invalid quantity.');
        }

        try {
          // Manual creation for Custom Orders to bypass product lookup
          const orderId = `JMB${new Date().toISOString().slice(0,10).replace(/-/g,'')}${Math.random().toString(36).substring(2,12).toUpperCase()}`;
          
          const newOrder = {
             id: orderId,
             productSlug: 'custom-order',
             productName: productName,
             amount: 0, // Price TBD
             total: 0, // Price TBD
             quantity: quantity,
             currency: 'IDR',
             status: 'PENDING',
             discordId: interaction.user.id, // MANDATORY
             customerEmail: 'discord@jambi.store',
             
             // Schema Normalization
             paymentMethod: 'balance', // Default for bot buy
             plan: 'custom',
             paymentProofURL: null,
             currency: 'IDR',
             
             createdAt: admin.firestore.FieldValue.serverTimestamp(),
             notes: notes,
             source: 'discord'
          };
          
          await db.collection('orders').doc(orderId).set(newOrder);

          // Create Ticket
          const channel = await createOrderTicket(interaction.client, newOrder, 'buy');
          
          // Set Cooldown
          cooldowns.set(`${interaction.user.id}_buy_button`, Date.now());

          await interaction.editReply(`✅ Ticket created: ${channel}`);

        } catch (error) {
          console.error('Buy Flow Error:', error);
          await interaction.editReply('❌ Failed to create order.');
        }
      }

      else if (customId === 'claim_modal') {
        await interaction.deferReply({ ephemeral: true });
        const orderId = interaction.fields.getTextInputValue('orderId');
        const reason = interaction.fields.getTextInputValue('reason');

        const { valid, message, order } = await validateOrderForClaim(orderId, interaction.user.id);
        if (!valid) {
          return interaction.editReply(`❌ ${message}`);
        }

        try {
          // Create Ticket
          const orderWithReason = { ...order, claimReason: reason };
          const channel = await createOrderTicket(interaction.client, orderWithReason, 'claim');
          
          // Set Cooldown
          cooldowns.set(`${interaction.user.id}_claim_button`, Date.now());

          await interaction.editReply(`✅ Claim ticket created: ${channel}`);
        } catch (error) {
          console.error('Claim Flow Error:', error);
          await interaction.editReply('❌ Failed to create claim ticket.');
        }
      }

      else if (customId === 'support_modal') {
        await interaction.deferReply({ ephemeral: true });
        const orderId = interaction.fields.getTextInputValue('orderId');
        const reason = interaction.fields.getTextInputValue('reason');

        const { valid, message, order } = await validateOrderForSupport(orderId, interaction.user.id);
        if (!valid) {
          return interaction.editReply(`❌ ${message}`);
        }

        try {
          const ticketData = {
            orderId: order.id,
            discordId: interaction.user.id,
            reason: reason,
            orderStatus: order.status
          };
          
          const channel = await createSupportTicket(interaction.client, ticketData);
          
          // Set Cooldown
          cooldowns.set(`${interaction.user.id}_support_button`, Date.now());

          await interaction.editReply(`✅ Support ticket created: ${channel}`);
        } catch (error) {
          console.error('Support Flow Error:', error);
          await interaction.editReply('❌ Failed to create support ticket.');
        }
      }

      // --- CLOSE FLOW MODAL ---
      else if (customId.startsWith('close_financial_modal:')) {
        const productSlug = customId.split(':')[1];
        await handleCloseOrderModal(interaction, productSlug); // We need to pass slug to handler
      }

      // --- EXISTING MODALS ---
      else if (customId === 'export_modal') {
        await handleExportModal(interaction);
      }
      else if (['account_modal', 'code_modal', 'reject_modal'].includes(customId)) {
        await handleDeliveryModal(interaction);
      }
    }
  },
};
