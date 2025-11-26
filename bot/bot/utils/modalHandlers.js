const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { db, admin } = require('./firebase');

async function handleExportModal(interaction) {
  await interaction.deferReply({ ephemeral: true });
  try {
    const startRaw = interaction.fields.getTextInputValue('start_date');
    const endRaw = interaction.fields.getTextInputValue('end_date');
    
    // Simple date parsing (DD-MM-YYYY)
    const parseDate = (str) => {
      const parts = str.split('-');
      if (parts.length !== 3) return null;
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    };

    const startDate = parseDate(startRaw);
    const endDate = parseDate(endRaw);

    if (!startDate || !endDate || isNaN(startDate) || isNaN(endDate)) {
      return interaction.followUp({ content: '❌ Invalid date format (DD-MM-YYYY)', ephemeral: true });
    }

    // Add 1 day to end date to include it
    endDate.setDate(endDate.getDate() + 1);

    const snapshot = await db.collection('orders')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<', endDate)
      .orderBy('createdAt', 'desc')
      .get();

    if (snapshot.empty) {
      return interaction.followUp({ content: 'ℹ️ No orders found.', ephemeral: true });
    }

    const rows = ['Order ID,Date,Status,Product,Email,Amount,Profit'];
    snapshot.forEach(doc => {
      const d = doc.data();
      rows.push(`${doc.id},${d.createdAt?.toDate?.().toISOString() || ''},${d.status},${d.productName},${d.customerEmail || ''},${d.total || 0},${d.finalProfit || 0}`);
    });

    const buffer = Buffer.from(rows.join('\n'), 'utf-8');
    const attachment = new AttachmentBuilder(buffer, { name: 'orders.csv' });

    await interaction.followUp({ content: `✅ Exported ${snapshot.size} orders.`, files: [attachment] });

  } catch (error) {
    console.error('Export Error:', error);
    await interaction.followUp({ content: '❌ Export failed.', ephemeral: true });
  }
}

async function handleCloseOrderModal(interaction, productSlug) {
  await interaction.deferReply();
  try {
    // Find order linked to this channel
    const snapshot = await db.collection('orders').where('ticket_channel_id', '==', interaction.channel.id).limit(1).get();
    if (snapshot.empty) {
      return interaction.followUp({ content: '❌ No linked order found for this channel.' });
    }
    const orderId = snapshot.docs[0].id;

    const cogs = parseFloat(interaction.fields.getTextInputValue('cogs'));
    const sellingPrice = parseFloat(interaction.fields.getTextInputValue('selling_price'));
    const notes = interaction.fields.getTextInputValue('notes');

    const profit = sellingPrice - cogs;
    const margin = (profit / sellingPrice) * 100;

    const updateData = {
      status: 'COMPLETED', // Enforce COMPLETED
      cogs: cogs,
      sellingPrice: sellingPrice,
      finalProfit: profit,
      finalMargin: margin,
      notes: notes,
      closedAt: admin.firestore.FieldValue.serverTimestamp(),
      closedBy: interaction.user.username
    };

    // If productSlug is provided (from 2-step close), update product details
    if (productSlug && productSlug !== 'custom-order') {
        // Fetch product name
        const productSnap = await db.collection('products').where('slug', '==', productSlug).limit(1).get();
        if (!productSnap.empty) {
            const productData = productSnap.docs[0].data();
            updateData.productSlug = productSlug;
            updateData.productId = productSnap.docs[0].id;
            updateData.productName = productData.title;
        }
    }

    await db.collection('orders').doc(orderId).update(updateData);

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Order Closed & Financials Recorded')
      .addFields(
        { name: 'Order ID', value: orderId, inline: true },
        { name: 'Product', value: updateData.productName || 'Unchanged', inline: true },
        { name: 'Profit', value: `${profit.toLocaleString('id-ID')}`, inline: true },
        { name: 'Margin', value: `${margin.toFixed(2)}%`, inline: true }
      );

    await interaction.followUp({ embeds: [embed] });
    
    // Log to channel if it's a ticket
    if (interaction.channel.name.startsWith('ticket-') || interaction.channel.name.startsWith('claim-') || interaction.channel.name.startsWith('support-')) {
       await interaction.channel.send({ content: '🔒 **Ticket Closed by Admin**' });
    }

  } catch (error) {
    console.error('Close Order Error:', error);
    await interaction.followUp({ content: '❌ Failed to close order.' });
  }
}

async function handleDeliveryModal(interaction) {
  const customId = interaction.customId;
  
  // Find order linked to this channel
  const snapshot = await db.collection('orders').where('ticket_channel_id', '==', interaction.channel.id).limit(1).get();
  if (snapshot.empty) {
    return interaction.reply({ content: '❌ No linked order found for this channel.', ephemeral: true });
  }
  
  const orderDoc = snapshot.docs[0];
  const orderId = orderDoc.id;
  const orderData = orderDoc.data();

  await interaction.deferReply();

  if (customId === 'reject_modal') {
    const reason = interaction.fields.getTextInputValue('alasan');
    await db.collection('orders').doc(orderId).update({
      status: 'REJECTED',
      rejectionReason: reason,
      rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
      rejectedBy: interaction.user.username
    });
    
    await interaction.followUp({ content: `❌ **Order Rejected**\nReason: ${reason}` });
    return;
  }

  let content = '';
  let type = '';

  if (customId === 'account_modal') {
    const user = interaction.fields.getTextInputValue('username');
    const pass = interaction.fields.getTextInputValue('password');
    const note = interaction.fields.getTextInputValue('keterangan');
    content = `Username: ${user}\nPassword: ${pass}\nNote: ${note}`;
    type = 'manual_account';
  } else if (customId === 'code_modal') {
    const code = interaction.fields.getTextInputValue('code');
    const note = interaction.fields.getTextInputValue('keterangan');
    content = `Code: ${code}\nNote: ${note}`;
    type = 'manual_code';
  }

  // Update Order
  await db.collection('orders').doc(orderId).update({
    status: 'COMPLETED',
    'delivery.status': 'DELIVERED',
    'delivery.type': type,
    'delivery.content': content,
    'delivery.deliveredAt': admin.firestore.FieldValue.serverTimestamp(),
    'delivery.deliveredBy': interaction.user.username
  });

  // Queue Email (Direct Firestore Write)
  try {
    const scheduledAt = new Date(); // Send immediately
    
    await db.collection('mail_queue').add({
      to: orderData.customerEmail || orderData.email,
      template: 'order_delivered',
      data: {
        customerName: 'Customer', // Bot doesn't have customer name easily, use default
        orderId: orderId,
        productName: orderData.productName,
        productSlug: orderData.productSlug || 'product',
        content: content,
        instructions: 'Please check the details below.'
      },
      status: 'pending',
      scheduledAt: admin.firestore.Timestamp.fromDate(scheduledAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      attempts: 0
    });
    
    console.log('✅ Delivery email queued via Firestore');
  } catch (e) {
    console.error('Email queue failed:', e);
  }

  await interaction.followUp({ content: '✅ **Delivery Sent!** Customer has been notified.' });
}

module.exports = { handleExportModal, handleCloseOrderModal, handleDeliveryModal };
