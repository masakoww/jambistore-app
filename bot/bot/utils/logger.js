const { EmbedBuilder } = require('discord.js');
const admin = require('firebase-admin');

const STAFF_LOG_CHANNEL_ID = process.env.STAFF_LOG_CHANNEL_ID || process.env.DISCORD_STAFF_LOG_CHANNEL_ID;

/**
 * Discord Logging Utility
 * Logs events to different channels based on type
 */
class DiscordLogger {
  constructor(client, db) {
    this.client = client;
    this.db = db;
  }

  /**
   * Get reference to Discord log state doc
   */
  getLogStateRef() {
    return this.db.collection('system').doc('logs').collection('discord').doc('state');
  }

  /**
   * Check if a notification with this ID was already sent
   */
  async shouldSendNotification(notificationId) {
    if (!notificationId) return true;

    try {
      const ref = this.getLogStateRef();
      const snap = await ref.get();
      const data = snap.exists ? snap.data() : {};

      if (data.lastNotificationId === notificationId) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error checking notification dedup state:', error);
      return true;
    }
  }

  /**
   * Mark a notification ID as sent
   */
  async markNotificationSent(notificationId) {
    if (!notificationId) return;

    try {
      const ref = this.getLogStateRef();
      await ref.set(
        {
          lastNotificationId: notificationId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error('❌ Error updating notification dedup state:', error);
    }
  }

  /**
   * Get Discord settings from Firestore
   */
  async getSettings() {
    try {
      const settingsDoc = await this.db.collection('settings').doc('discord').get();
      return settingsDoc.exists ? settingsDoc.data() : null;
    } catch (error) {
      console.error('❌ Error fetching Discord settings:', error);
      return null;
    }
  }

  /**
   * Send log to a specific channel
   */
  async sendLog(channelId, embed, content = null, notificationId = null) {
    if (!channelId) return false;

    try {
      const shouldSend = await this.shouldSendNotification(notificationId);
      if (!shouldSend) {
        console.log('⚠️ Skipping duplicate notification:', notificationId);
        return false;
      }

      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        console.error(`❌ Invalid channel: ${channelId}`);
        return false;
      }

      await channel.send({
        content,
        embeds: [embed]
      });

      await this.markNotificationSent(notificationId);

      return true;
    } catch (error) {
      console.error(`❌ Error sending log to channel ${channelId}:`, error);
      return false;
    }
  }

  /**
   * Log: Order Created (Public channel with role mention)
   */
  async logOrderCreated(orderId, orderData, ticketChannelId) {
    const settings = await this.getSettings();
    if (!settings?.logChannels?.orderCreated) {
      console.log('⚠️ Order Created log channel not configured');
      return false;
    }

    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle('🆕 New Order Created')
      .addFields(
        { name: '🆔 Order ID', value: `\`${orderId}\``, inline: true },
        { name: '📦 Product', value: orderData.productName || 'Unknown', inline: true },
        { name: '💰 Amount', value: `$${orderData.total || orderData.amount || 0}`, inline: true },
        { name: '👤 Customer', value: orderData.customer?.email || orderData.email || 'Unknown', inline: true },
        { name: '🎫 Ticket', value: ticketChannelId ? `<#${ticketChannelId}>` : 'N/A', inline: true },
        { name: '📋 Status', value: orderData.status || 'PENDING', inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'New order requires admin attention' });

    // Add role mention if configured
    const mentionContent = settings.mentionRoleId 
      ? `<@&${settings.mentionRoleId}> New order received!` 
      : '📢 New order received!';

    const success = await this.sendLog(
      settings.logChannels.orderCreated,
      embed,
      mentionContent,
      `order_created_${orderId}`
    );
    if (success) {
      console.log(`✅ Logged order created: ${orderId}`);
    }
    return success;
  }

  /**
   * Log: Order Finished (Public or admin channel)
   */
  async logOrderFinished(orderId, orderData) {
    const settings = await this.getSettings();
    if (!settings?.logChannels?.orderFinished) {
      console.log('⚠️ Order Finished log channel not configured');
      return false;
    }

    const fields = [
      { name: '🆔 Order ID', value: `\`${orderId}\``, inline: true },
      { name: '📦 Product', value: orderData.productName || 'Unknown', inline: true },
      { name: '💰 Amount', value: `$${orderData.total || orderData.amount || 0}`, inline: true },
      { name: '👤 Customer', value: orderData.customer?.email || orderData.email || 'Unknown', inline: true },
      { name: '🚚 Delivered By', value: orderData.deliveredBy || 'System', inline: true },
      { name: '⏰ Completed At', value: new Date().toLocaleString(), inline: true },
    ];

    if (typeof orderData.finalProfit === 'number') {
      fields.push({
        name: orderData.finalProfit >= 0 ? '📈 Profit' : '📉 Loss',
        value: `$${orderData.finalProfit.toFixed(2)}`,
        inline: true,
      });
    }

    if (typeof orderData.finalMargin === 'number') {
      fields.push({
        name: '📊 Margin',
        value: `${orderData.finalMargin.toFixed(2)}%`,
        inline: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Order Completed')
      .addFields(fields)
      .setTimestamp()
      .setFooter({ text: 'Order successfully completed' });

    const success = await this.sendLog(
      settings.logChannels.orderFinished,
      embed,
      null,
      `order_finished_${orderId}`
    );
    if (success) {
      console.log(`✅ Logged order finished: ${orderId}`);
    }
    return success;
  }

  /**
   * Log: Transcript (Admin-only channel)
   */
  async logTranscript(orderId, orderData, transcript) {
    const settings = await this.getSettings();
    if (!settings?.logChannels?.transcripts) {
      console.log('⚠️ Transcripts log channel not configured');
      return false;
    }

    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle('📝 Order Transcript')
      .setDescription(`Transcript for order \`${orderId}\``)
      .addFields(
        { name: '🆔 Order ID', value: `\`${orderId}\``, inline: true },
        { name: '👤 Customer', value: orderData.customer?.email || orderData.email || 'Unknown', inline: true },
        { name: '📦 Product', value: orderData.productName || 'Unknown', inline: true },
        { name: '💬 Messages', value: `${transcript.length} messages`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'Full chat transcript saved' });

    const success = await this.sendLog(
      settings.logChannels.transcripts,
      embed,
      null,
      `transcript_${orderId}`
    );
    if (success) {
      console.log(`✅ Logged transcript: ${orderId}`);
    }
    return success;
  }

  /**
   * Log: Customer Review (Public channel)
   */
  async logReview(orderId, orderData, review) {
    const settings = await this.getSettings();
    if (!settings?.logChannels?.reviews) {
      console.log('⚠️ Reviews log channel not configured');
      return false;
    }

    const stars = '⭐'.repeat(review.rating || 5);
    
    const embed = new EmbedBuilder()
      .setColor('#F1C40F')
      .setTitle('⭐ New Customer Review')
      .setDescription(review.comment || 'No comment provided')
      .addFields(
        { name: '📦 Product', value: orderData.productName || 'Unknown', inline: true },
        { name: '⭐ Rating', value: stars, inline: true },
        { name: '👤 Customer', value: orderData.customer?.displayName || 'Anonymous', inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'Customer feedback' });

    const success = await this.sendLog(
      settings.logChannels.reviews,
      embed,
      null,
      `review_${orderId}_${review.id || 'unknown'}`
    );
    if (success) {
      console.log(`✅ Logged review: ${orderId}`);
    }
    return success;
  }

  /**
   * Log: Order Rejected
   */
  async logOrderRejected(orderId, orderData, reason) {
    const settings = await this.getSettings();
    if (!settings?.logChannels?.orderCreated) {
      return false; // Use same channel as order created
    }

    const embed = new EmbedBuilder()
      .setColor('#E74C3C')
      .setTitle('❌ Order Rejected')
      .addFields(
        { name: '🆔 Order ID', value: `\`${orderId}\``, inline: true },
        { name: '📦 Product', value: orderData.productName || 'Unknown', inline: true },
        { name: '💰 Amount', value: `$${orderData.total || orderData.amount || 0}`, inline: true },
        { name: '👤 Customer', value: orderData.customer?.email || orderData.email || 'Unknown', inline: true },
        { name: '❌ Reason', value: reason || 'No reason provided', inline: false }
      )
      .setTimestamp()
      .setFooter({ text: 'Order has been rejected' });

    const success = await this.sendLog(
      settings.logChannels.orderCreated,
      embed,
      null,
      `order_rejected_${orderId}`
    );
    if (success) {
      console.log(`✅ Logged order rejected: ${orderId}`);
    }
    return success;
  }

  /**
   * Log: Support Ticket (Admin channel)
   */
  async logSupport(ticketId, userEmail, action, channelId = null) {
    const settings = await this.getSettings();
    if (!settings?.logChannels?.orderCreated) {
      return false; // Use order created channel for support logs
    }

    let embed;
    
    switch (action) {
      case 'ticket_created':
        embed = new EmbedBuilder()
          .setColor('#3B82F6')
          .setTitle('🎧 Support Ticket Created')
          .addFields(
            { name: '🆔 Ticket ID', value: `\`${ticketId}\``, inline: true },
            { name: '📧 User Email', value: userEmail || 'Unknown', inline: true },
            { name: '🎫 Channel', value: channelId ? `<#${channelId}>` : 'N/A', inline: true }
          )
          .setTimestamp()
          .setFooter({ text: 'New support ticket opened' });
        break;

      case 'ticket_closed':
        embed = new EmbedBuilder()
          .setColor('#10B981')
          .setTitle('✅ Support Ticket Closed')
          .addFields(
            { name: '🆔 Ticket ID', value: `\`${ticketId}\``, inline: true },
            { name: '📧 User Email', value: userEmail || 'Unknown', inline: true }
          )
          .setTimestamp()
          .setFooter({ text: 'Support ticket resolved' });
        break;

      default:
        return false;
    }

    const success = await this.sendLog(settings.logChannels.orderCreated, embed);
    if (success) {
      console.log(`✅ Logged support ${action}: ${ticketId}`);
    }
    return success;
  }
}

module.exports = DiscordLogger;
