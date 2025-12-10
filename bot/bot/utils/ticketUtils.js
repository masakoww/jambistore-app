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

  // Tag admins with fallback to @here if no admin roles configured
  // Prefer configured admin role(s) stored in bot config, fall back to env ADMIN_ROLES, else @here
  let adminMention = '@here';
  try {
    const botConfig = await getBotConfig();
    if (botConfig) {
      // single role id
      if (botConfig.adminRoleId) {
        adminMention = `<@&${botConfig.adminRoleId}>`;
      }
      // or array of role ids
      else if (Array.isArray(botConfig.adminRoleIds) && botConfig.adminRoleIds.length > 0) {
        adminMention = botConfig.adminRoleIds.map(r => `<@&${r}>`).join(' ');
      }
    }
  } catch (err) {
    console.warn('⚠️ Failed to read bot config for admin roles:', err?.message || err);
  }

  if (!adminMention || adminMention === '@here') {
    if (ADMIN_ROLES && ADMIN_ROLES.length > 0) {
      adminMention = ADMIN_ROLES.map(r => `<@&${r}>`).join(' ');
    }
  }

  await channel.send({ 
    content: adminMention,
    embeds: [embed],
    components: components
  });

  return channel;
}

/**
 * Create an Order Ticket (Buy or Claim)
 */
async function createOrderTicket(client, orderData, type = 'buy', ticketSource = 'discord') {
  const config = await getBotConfig();
  const guild = client.guilds.cache.first();
  const categoryId = type === 'claim' ? config?.claimCategoryId : config?.ticketCategoryId;
  
  const finalCategoryId = categoryId || config?.ticketCategoryId;

  if (!finalCategoryId) throw new Error('Ticket Category ID not configured');

  // Build ticket channel name based on source
  let channelName;
  if (ticketSource === 'website') {
    // Format: email(5)-productname
    const emailPrefix = (orderData.customerEmail || orderData.email || 'user')
      .split('@')[0]
      .slice(0, 5)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const productSlug = (orderData.productName || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 15);
    channelName = `${emailPrefix}-${productSlug}`;
  } else {
    channelName = `${type === 'claim' ? 'claim' : 'ord'}-${orderData.id.slice(0, 25)}`;
  }

  // Build embed based on source
  let embed;
  if (ticketSource === 'website') {
    console.log('📨 Creating website ticket with orderData keys:', Object.keys(orderData));
    // Helpful debug log to inspect incoming fields (kept minimal)
    // Normalize a few alternate field names we sometimes receive
    orderData.paymentProofURL = orderData.paymentProofURL || orderData.paymentProofUrl || orderData.paymentProof || orderData.proofUrl || (orderData.payment && (orderData.payment.proofUrl || (orderData.payment.proof && (orderData.payment.proof.url || orderData.payment.proof.secure_url)))) || orderData.payment_proof_url || null;
    orderData.customerEmail = orderData.customerEmail || orderData.email || (orderData.payment && orderData.payment.email) || orderData.userEmail || null;
    orderData.amount = Number(orderData.amount || orderData.total || (orderData.payment && orderData.payment.amount) || 0) || 0;
    // Website order - simplified embed with key info
    embed = new EmbedBuilder()
      .setColor('#00D1FF')
      .setTitle('🛍️ New Order from Website')
      .addFields(
        { name: '📧 Email', value: orderData.customerEmail || orderData.email || 'N/A', inline: false },
        { name: '📦 Product', value: orderData.productName || 'Unknown', inline: true },
        { name: '💎 Plan', value: orderData.plan || orderData.planName || 'Standard', inline: true },
        { name: '💰 Amount', value: `Rp ${Number(orderData.amount || 0).toLocaleString('id-ID')}`, inline: true },
        { name: '🆔 Order ID', value: orderData.id, inline: false }
      )
      .setTimestamp();
    
    // Add payment proof image if available
    if (orderData.paymentProofURL) {
      try {
        embed.setImage(orderData.paymentProofURL);
      } catch (err) {
        console.warn('⚠️ Failed to set embed image for website ticket:', err?.message || err);
      }
    }
  } else {
    // Discord order - keep existing detailed embed
    const paymentFields = [];
    if (orderData.amount) paymentFields.push(`• Harga Pesanan: Rp ${Number(orderData.amount).toLocaleString('id-ID')}`);
    if (orderData.uniqueCode) paymentFields.push(`• Kode Unik: Rp ${Number(orderData.uniqueCode).toLocaleString('id-ID')}`);
    if (orderData.totalAmount) paymentFields.push(`• Total Bayar: Rp ${Number(orderData.totalAmount).toLocaleString('id-ID')}`);

    embed = new EmbedBuilder()
      .setColor('#F1C40F')
      .setTitle(`Pembelian: ${orderData.productName || 'N/A'} - Redeem Code`)
      .setThumbnail(orderData.productImage || null)
      .addFields(
        { name: 'Detail Pembayaran:', value: paymentFields.join('\n') || 'N/A', inline: false },
        { name: 'Instruksi', value: '• Tunggu staff untuk memproses pesanan.\n• Jangan spam atau tiket akan ditutup.', inline: false },
        { name: 'Jumlah', value: String(orderData.quantity || 1), inline: true },
        { name: 'Status Pembayaran', value: orderData.paymentStatus || orderData.status || 'Tertunda', inline: true }
      )
      .setTimestamp();
  }

  // Different components based on ticket source
  let components;
  
  if (ticketSource === 'website') {
    // Website order processing - use select menu for actions
    const StringSelectMenuBuilder = require('discord.js').StringSelectMenuBuilder;
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('order_action')
      .setPlaceholder('Choose an action...')
      .addOptions([
        { label: 'Send Account', value: 'send_account', description: 'Email/username + password', emoji: '✅' },
        { label: 'Send Code', value: 'send_code', description: 'Redemption code only', emoji: '🔑' },
        { label: 'Reject Order', value: 'reject_order', description: 'Reject with reason', emoji: '❌' },
        { label: 'Close Order', value: 'close_order', description: 'Complete order', emoji: '✔️' }
      ]);
    components = [new ActionRowBuilder().addComponents(selectMenu)];
  } else {
    // Discord negotiation - QR selection and close button
    let qrOptions = [];
    if (orderData.qrImages && Array.isArray(orderData.qrImages)) {
      qrOptions = orderData.qrImages.map((img, idx) => ({
        label: img.name || `QR ${idx+1}`,
        value: img.name || `qr${idx+1}`,
        description: img.desc || '',
        emoji: '🟩'
      })).slice(0, 3);
    }
    if (qrOptions.length === 0) {
      qrOptions.push({ label: 'Belum ada QR', value: 'none', description: 'QR belum diupload', emoji: '❌' });
    }
    const qrSelectRow = new ActionRowBuilder().addComponents(
      new (require('discord.js').StringSelectMenuBuilder)()
        .setCustomId('select_qr')
        .setPlaceholder('Pilih QR Code untuk ditampilkan')
        .addOptions(qrOptions)
    );

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger)
    );
    
    components = [qrSelectRow, closeRow];
  }

  const channel = await createTicket(
    guild,
    finalCategoryId,
    channelName,
    `Order: ${orderData.id} | ${orderData.customerEmail}`,
    embed,
    components
  );

  // Give user permission ONLY for Discord tickets (not website tickets)
  // Website tickets are admin-only for order processing
  if (ticketSource === 'discord' && orderData.discordId && /^\d{17,19}$/.test(orderData.discordId)) {
    try {
      await channel.permissionOverwrites.edit(orderData.discordId, {
        ViewChannel: true,
        SendMessages: true
      });
    } catch (error) {
      console.error('⚠️ Failed to set user permissions:', error.message);
    }
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
