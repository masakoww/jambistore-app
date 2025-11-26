const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getBotConfig, ADMIN_ROLES } = require('./helpers');
const { db, admin } = require('./firebase');

/**
 * Create a generic ticket channel
 */
async function createTicket(guild, categoryId, channelName, topic, embed, components = []) {
  if (!guild || !categoryId) throw new Error('Guild or Category ID missing');

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: categoryId,
    topic: topic,
    permissionOverwrites: [
       { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
       // Add admin roles
       ...ADMIN_ROLES.map(roleId => ({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }))
    ]
  });

  await channel.send({ 
    content: ADMIN_ROLES.map(r => `<@&${r}>`).join(' '), // Tag admins
    embeds: [embed],
    components: components
  });

  return channel;
}

/**
 * Create an Order Ticket (Buy or Claim)
 */
async function createOrderTicket(client, orderData, type = 'buy') {
  const config = await getBotConfig();
  const guild = client.guilds.cache.first();
  const categoryId = type === 'claim' ? config?.claimCategoryId : config?.ticketCategoryId; // Use claim category if available, else default ticket category
  
  // If claim category is not set, fallback to ticket category or error? 
  // For now, let's assume if claimCategoryId isn't in config, we use ticketCategoryId
  const finalCategoryId = categoryId || config?.ticketCategoryId;

  if (!finalCategoryId) throw new Error('Ticket Category ID not configured');

  const channelName = `${type === 'claim' ? 'claim' : 'ticket'}-${orderData.id.slice(0, 6)}`;
  
  const embed = new EmbedBuilder()
    .setColor(type === 'claim' ? '#F1C40F' : '#0099ff')
    .setTitle(type === 'claim' ? `⚠️ Claim Order: ${orderData.id}` : `📦 New Order: ${orderData.id}`)
    .addFields(
      { name: 'Product', value: orderData.productName || 'N/A', inline: true },
      { name: 'Customer', value: `${orderData.customerName || 'Guest'} (${orderData.customerEmail || 'No Email'})`, inline: true },
      { name: 'Status', value: orderData.status || 'PENDING', inline: true },
      { name: 'Estimation', value: orderData.estimation || 'N/A', inline: true }
    )
    .setTimestamp();

  if (orderData.paymentProofURL) {
    embed.setImage(orderData.paymentProofURL);
    embed.addFields({ name: 'Payment Proof', value: '[View Image](' + orderData.paymentProofURL + ')' });
  }

  if (orderData.notes) {
    embed.addFields({ name: 'Notes', value: orderData.notes });
  }

  if (type === 'claim' && orderData.claimReason) {
    embed.addFields({ name: 'Claim Reason', value: orderData.claimReason });
  }

  // Buttons
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger)
  );

  // If it's a buy order, maybe add Claim button if it came from webhook? 
  // But for panel flow, we don't need claim button inside the ticket usually, 
  // unless it's for someone else to claim? 
  // Let's keep it simple: Close Ticket is the main action. 
  // If it's a webhook order, we might want the Claim button.
  if (type === 'buy' && !orderData.discordId) {
      row.addComponents(
          new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim Ticket').setStyle(ButtonStyle.Primary)
      );
  }

  const channel = await createTicket(guild, finalCategoryId, channelName, `Order: ${orderData.id} | ${orderData.customerEmail}`, embed, [row]);

  // Give user permission if discordId is present
  if (orderData.discordId) {
    await channel.permissionOverwrites.edit(orderData.discordId, {
      ViewChannel: true,
      SendMessages: true
    });
  }

  // Update Firestore
  await db.collection('orders').doc(orderData.id).update({
    ticket_id: channel.id,
    ticket_channel_id: channel.id,
    ticketCreatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return channel;
}

/**
 * Create a Support Ticket
 */
async function createSupportTicket(client, ticketData) {
  const config = await getBotConfig();
  const guild = client.guilds.cache.first();
  const categoryId = config?.supportCategoryId;

  if (!categoryId) throw new Error('Support Category ID not configured');

  const channelName = `support-${ticketData.orderId.slice(0, 6)}`;
  
  const embed = new EmbedBuilder()
    .setColor('#E67E22')
    .setTitle(`🎧 Support Ticket: ${ticketData.orderId}`)
    .setDescription(ticketData.reason || 'No description')
    .addFields(
      { name: 'User', value: `<@${ticketData.discordId}>`, inline: true },
      { name: 'Order Status', value: ticketData.orderStatus || 'Unknown', inline: true }
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger)
  );

  const channel = await createTicket(guild, categoryId, channelName, `Support: ${ticketData.orderId}`, embed, [row]);

  // Give user permission
  await channel.permissionOverwrites.edit(ticketData.discordId, {
    ViewChannel: true,
    SendMessages: true
  });

  return channel;
}

module.exports = { createTicket, createOrderTicket, createSupportTicket };
