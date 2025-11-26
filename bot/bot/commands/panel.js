const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Post the main interaction panel')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('Channel to post the panel in (optional)')
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    const embed = new EmbedBuilder()
      .setColor('#2B2D31')
      .setTitle('🛒 Jambi Store Service')
      .setDescription('Pilih opsi di bawah untuk melanjutkan pesanan atau permintaan dukungan Anda.')
      .addFields(
        { name: '🛒 Buy / Beli Produk', value: 'Beli produk atau layanan baru.', inline: true },
        { name: '📦 Claim Order / Claim Pesanan', value: 'Klaim order ID / Claim order ID.', inline: true },
        { name: '🎧 Support / Dukungan', value: 'Dapatkan bantuan / Get order support.', inline: true }
      )
      .setImage('https://media.discordapp.net/attachments/117183348000000000/117183348000000000/banner.png') // Placeholder or config
      .setFooter({ text: 'Jambi Store Automation' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('buy_button')
        .setLabel('Beli Produk / Buy Product')
        .setEmoji('🛒')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('claim_button')
        .setLabel('Claim Pesanan / Claim Order')
        .setEmoji('📦')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('support_button')
        .setLabel('Dukungan / Support')
        .setEmoji('🎧')
        .setStyle(ButtonStyle.Secondary)
    );

    await channel.send({ embeds: [embed], components: [row] });

    await interaction.reply({ content: `✅ Panel posted in ${channel}`, ephemeral: true });
  },
};
