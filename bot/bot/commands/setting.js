const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');
const { db } = require('../utils/firebase');

// Configuration Mapping: Links subcommands to Firestore keys
const CONFIG_MAP = {
    log: {
        order: 'orderLogChannelId',
        public_order: 'publicLogChannelId',
        feedback: 'feedbackLogChannelId',
        security: 'securityLogChannelId',
        'low-stock': 'lowStockLogChannelId',
        staff_logs: 'staffLogChannelId'
    },
    channel: {
        testimonials: 'testimonialChannelId',
        announcement: 'announcementChannelId'
    },
    category: {
        ticket: 'ticketCategoryId',
        claim: 'claimCategoryId',
        support: 'supportCategoryId'
    },
    role: {
        admin: 'adminRoleId'
    }
};

/**
 * Centralized helper to update settings
 */
async function updateSetting(interaction, key, value, successMessage) {
    const settingsRef = db.collection('bot_settings').doc('main_config');
    
    try {
        const settingToUpdate = { [key]: value };
        await settingsRef.set(settingToUpdate, { merge: true });
        
        // Update local cache if available
        if (interaction.client.settings) {
            Object.assign(interaction.client.settings, settingToUpdate);
        }
        
        await interaction.editReply(successMessage);
        console.log(`[Config] Updated ${key} to ${value}`);
    } catch (error) {
        console.error(`Failed to update ${key}:`, error);
        await interaction.editReply({ content: '❌ Terjadi kesalahan saat menyimpan pengaturan ke database.' });
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setting')
        .setDescription('[Admin] Pusat kendali untuk semua pengaturan channel & kategori bot.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)

        // 1. View Settings
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('Melihat semua pengaturan bot yang aktif saat ini.')
        )

        // 2. Log Settings
        .addSubcommandGroup(group =>
            group.setName('log')
                .setDescription('Mengatur semua channel logging.')
                .addSubcommand(subcommand =>
                    subcommand.setName('order')
                        .setDescription('Channel untuk log transaksi & transkrip.')
                        .addChannelOption(option => option.setName('channel').setDescription('Channel teks yang akan digunakan.').setRequired(true).addChannelTypes(ChannelType.GuildText)))
                .addSubcommand(subcommand =>
                    subcommand.setName('public_order')
                        .setDescription('Channel untuk log transaksi PUBLIK (Social Proof).')
                        .addChannelOption(option => option.setName('channel').setDescription('Channel teks yang akan digunakan.').setRequired(true).addChannelTypes(ChannelType.GuildText)))
                .addSubcommand(subcommand =>
                    subcommand.setName('feedback')
                        .setDescription('Channel untuk log ulasan/rating dari pengguna.')
                        .addChannelOption(option => option.setName('channel').setDescription('Channel teks yang akan digunakan.').setRequired(true).addChannelTypes(ChannelType.GuildText)))
                .addSubcommand(subcommand =>
                    subcommand.setName('security')
                        .setDescription('Channel untuk log keamanan (misal: percobaan perintah admin).')
                        .addChannelOption(option => option.setName('channel').setDescription('Channel teks yang akan digunakan.').setRequired(true).addChannelTypes(ChannelType.GuildText)))
                .addSubcommand(subcommand =>
                    subcommand.setName('low-stock')
                        .setDescription('Channel untuk notifikasi stok produk yang rendah.')
                        .addChannelOption(option => option.setName('channel').setDescription('Channel teks yang akan digunakan.').setRequired(true).addChannelTypes(ChannelType.GuildText)))
                .addSubcommand(subcommand =>
                    subcommand.setName('staff_logs')
                        .setDescription('Channel untuk log aksi admin (staff actions).')
                        .addChannelOption(option => option.setName('channel').setDescription('Channel teks yang akan digunakan.').setRequired(true).addChannelTypes(ChannelType.GuildText)))
        )

        // 3. Functional Channels
        .addSubcommandGroup(group =>
            group.setName('channel')
                .setDescription('Mengatur channel fungsional lainnya.')
                .addSubcommand(subcommand =>
                    subcommand.setName('testimonials')
                        .setDescription('Channel tempat testimoni akan dikirim.')
                        .addChannelOption(option => option.setName('channel').setDescription('Channel teks yang akan digunakan.').setRequired(true).addChannelTypes(ChannelType.GuildText)))
                .addSubcommand(subcommand =>
                    subcommand.setName('announcement')
                        .setDescription('Mengatur channel untuk pengumuman produk baru.')
                        .addChannelOption(option => option.setName('channel').setDescription('Channel pengumuman yang akan digunakan.').setRequired(true).addChannelTypes(ChannelType.GuildAnnouncement, ChannelType.GuildText)))
        )

        // 4. Categories
        .addSubcommandGroup(group =>
            group.setName('category')
                .setDescription('Mengatur kategori untuk pembuatan channel.')
                .addSubcommand(subcommand =>
                    subcommand.setName('ticket')
                        .setDescription('Kategori tempat tiket pembelian baru akan dibuat.')
                        .addChannelOption(option => option.setName('category').setDescription('Kategori channel yang akan digunakan.').setRequired(true).addChannelTypes(ChannelType.GuildCategory)))
                .addSubcommand(subcommand =>
                    subcommand.setName('claim')
                        .setDescription('Kategori tempat tiket claim order akan dibuat.')
                        .addChannelOption(option => option.setName('category').setDescription('Kategori channel yang akan digunakan.').setRequired(true).addChannelTypes(ChannelType.GuildCategory)))
                .addSubcommand(subcommand =>
                    subcommand.setName('support')
                        .setDescription('Kategori tempat tiket bantuan/support baru akan dibuat.')
                        .addChannelOption(option => option.setName('category').setDescription('Kategori channel yang akan digunakan.').setRequired(true).addChannelTypes(ChannelType.GuildCategory)))
        )

        // 5. Roles
        .addSubcommandGroup(group =>
            group.setName('role')
                .setDescription('Mengatur role fungsional untuk bot.')
                .addSubcommand(subcommand =>
                    subcommand.setName('admin')
                        .setDescription('Mengatur role yang akan di-tag di setiap tiket baru.')
                        .addRoleOption(option => option.setName('role').setDescription('Role admin yang akan di-tag.').setRequired(true)))
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        const group = interaction.options.getSubcommandGroup(false);

        // --- VIEW SETTINGS ---
        if (subcommand === 'view') {
            // Fetch fresh settings if not in cache (or relying on cache)
            // For robustness, we might want to fetch fresh, but let's use what's available or fetch
            let settings = interaction.client.settings;
            if (!settings) {
                 const doc = await db.collection('bot_settings').doc('main_config').get();
                 settings = doc.exists ? doc.data() : {};
                 interaction.client.settings = settings; // Update cache
            }

            const formatChannel = (id) => id ? `<#${id}>` : '❌ *Belum diatur*';
            const formatRole = (id) => id ? `<@&${id}>` : '❌ *Belum diatur*';

            const embed = new EmbedBuilder()
                .setColor('#3498DB')
                .setTitle('⚙️ Pengaturan Bot Saat Ini')
                .addFields(
                    { name: '📊 LOGGING', value: '---', inline: false },
                    { name: 'Log Order & Transkrip', value: formatChannel(settings.orderLogChannelId), inline: true },
                    { name: 'Log Order (Publik)', value: formatChannel(settings.publicLogChannelId), inline: true },
                    { name: 'Log Feedback', value: formatChannel(settings.feedbackLogChannelId), inline: true },
                    { name: 'Log Keamanan', value: formatChannel(settings.securityLogChannelId), inline: true },
                    { name: 'Log Stok Rendah', value: formatChannel(settings.lowStockLogChannelId), inline: true },
                    { name: 'Log Staff Actions', value: formatChannel(settings.staffLogChannelId), inline: true },
                    
                    { name: '📢 CHANNEL', value: '---', inline: false },
                    { name: 'Channel Testimoni', value: formatChannel(settings.testimonialChannelId), inline: true },
                    { name: 'Channel Pengumuman', value: formatChannel(settings.announcementChannelId), inline: true },
                    
                    { name: '📂 KATEGORI', value: '---', inline: false },
                    { name: 'Kategori Tiket', value: formatChannel(settings.ticketCategoryId), inline: true },
                    { name: 'Kategori Claim', value: formatChannel(settings.claimCategoryId), inline: true },
                    { name: 'Kategori Support', value: formatChannel(settings.supportCategoryId), inline: true },
                    
                    { name: '👮 ROLE', value: '---', inline: false },
                    { name: 'Role Admin', value: formatRole(settings.adminRoleId), inline: true },
                )
                .setFooter({ text: 'Gunakan subcommand /setting [grup] [opsi] untuk mengubah.' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        // --- UPDATE SETTINGS ---
        
        // 1. Identify the setting key from the map
        const groupConfig = CONFIG_MAP[group];
        if (!groupConfig) {
            return interaction.editReply({ content: '❌ Grup perintah tidak dikenali.' });
        }

        const settingKey = groupConfig[subcommand];
        if (!settingKey) {
            return interaction.editReply({ content: '❌ Subcommand tidak dikenali dalam konfigurasi.' });
        }

        // 2. Get the value (Role or Channel)
        let target;
        let valueId;
        let successMsg = '';

        if (group === 'role') {
            target = interaction.options.getRole('role');
            valueId = target.id;
            successMsg = `✅ Berhasil! **Role Admin** sekarang diatur ke ${target}.`;
        } else if (group === 'category') {
            target = interaction.options.getChannel('category');
            valueId = target.id;
            successMsg = `✅ Berhasil! Kategori **${subcommand}** sekarang diatur ke **${target.name}**.`;
        } else {
            // Log or Channel groups
            target = interaction.options.getChannel('channel');
            valueId = target.id;
            const typeName = group === 'log' ? `Log ${subcommand.replace('_', ' ')}` : subcommand;
            successMsg = `✅ Berhasil! Channel **${typeName}** sekarang diatur ke ${target}.`;
        }

        // 3. Execute Update
        await updateSetting(interaction, settingKey, valueId, successMsg);
    }
};
