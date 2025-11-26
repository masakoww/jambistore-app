'use client';

import { motion } from 'framer-motion';
import { Shield, CreditCard, RefreshCw, Ban, User, FileText, AlertCircle, MessageSquare } from 'lucide-react';
import { useWebsite } from '@/lib/websiteContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FloatingButton from '@/components/FloatingButton';

export default function TermsOfService() {
  const { language } = useWebsite();

  const content = {
    id: {
      title: 'Syarat & Ketentuan',
      subtitle: 'Dengan membeli produk di',
      storeName: 'Jambi Store',
      subtitleEnd: ', kamu setuju dengan semua syarat berikut',
      badge: 'Dokumen Legal',
      lastUpdated: 'Terakhir diperbarui: November 2025',
      importantTitle: 'Penting!',
      importantText: 'Dengan melanjutkan pembelian di Jambi Store, kamu dianggap telah membaca, memahami, dan menyetujui seluruh ketentuan layanan ini. Jika ada pertanyaan, silakan hubungi tim support kami melalui Discord.',
      sections: [
        {
          icon: FileText,
          title: 'Produk',
          content: [
            'Semua produk bersifat digital (akun premium, lisensi, dll).',
            'Pengiriman dilakukan otomatis/manual setelah pembayaran.'
          ]
        },
        {
          icon: CreditCard,
          title: 'Pembayaran',
          content: [
            'Pembayaran via QRIS, e-wallet, atau transfer bank.',
            'Produk dikirim dalam 5–30 menit (maks), kecuali ada kendala.'
          ]
        },
        {
          icon: Shield,
          title: 'Garansi',
          content: [
            'Garansi 24 jam jika:',
            '  • Ada bukti video/screenshot lengkap.',
            '  • Tidak ada perubahan data oleh pembeli.',
            'Tidak berlaku jika akun dibanned karena pelanggaran.'
          ]
        },
        {
          icon: RefreshCw,
          title: 'Refund',
          content: [
            'Tidak ada refund kecuali karena kesalahan kami.',
            'Refund tidak berlaku karena salah beli, salah login, atau pelanggaran aturan platform.'
          ]
        },
        {
          icon: User,
          title: 'Penggunaan Produk',
          content: [
            'Hanya untuk penggunaan pribadi.',
            'Dilarang untuk kegiatan ilegal, spam, atau melanggar ToS platform.'
          ]
        },
        {
          icon: Ban,
          title: 'Privasi',
          content: [
            'Data kamu aman dan tidak dibagikan tanpa izin.'
          ]
        },
        {
          icon: AlertCircle,
          title: 'Perubahan',
          content: [
            'Jambi Store berhak mengubah harga, stok, & layanan kapan saja.'
          ]
        },
        {
          icon: MessageSquare,
          title: 'Aturan Server Discord',
          content: [
            'Hormati semua anggota & staff.',
            'Dilarang flame, toxic, spam, atau post konten SARA/NSFW.',
            'Gunakan channel sesuai fungsi. Order hanya di tempat yang sesuai.',
            'Taat pada keputusan staff/admin.'
          ]
        }
      ]
    },
    en: {
      title: 'Terms of Service',
      subtitle: 'By purchasing products at',
      storeName: 'Jambi Store',
      subtitleEnd: ', you agree to all the following terms',
      badge: 'Legal Document',
      lastUpdated: 'Last updated: November 2025',
      importantTitle: 'Important!',
      importantText: 'By proceeding with a purchase at Jambi Store, you are deemed to have read, understood, and agreed to all these terms of service. If you have any questions, please contact our support team via Discord.',
      sections: [
        {
          icon: FileText,
          title: 'Products',
          content: [
            'All products are digital (premium accounts, licenses, etc).',
            'Delivery is done automatically/manually after payment.'
          ]
        },
        {
          icon: CreditCard,
          title: 'Payment',
          content: [
            'Payment via QRIS, e-wallet, or bank transfer.',
            'Products delivered within 5–30 minutes (max), unless there are issues.'
          ]
        },
        {
          icon: Shield,
          title: 'Warranty',
          content: [
            '24-hour warranty if:',
            '  • Complete video/screenshot proof is provided.',
            '  • No data changes made by the buyer.',
            'Does not apply if account is banned due to violations.'
          ]
        },
        {
          icon: RefreshCw,
          title: 'Refund',
          content: [
            'No refunds except for our mistakes.',
            'Refunds do not apply for wrong purchases, wrong login, or platform rule violations.'
          ]
        },
        {
          icon: User,
          title: 'Product Usage',
          content: [
            'For personal use only.',
            'Prohibited for illegal activities, spam, or violating platform ToS.'
          ]
        },
        {
          icon: Ban,
          title: 'Privacy',
          content: [
            'Your data is safe and not shared without permission.'
          ]
        },
        {
          icon: AlertCircle,
          title: 'Changes',
          content: [
            'Jambi Store reserves the right to change prices, stock, & services at any time.'
          ]
        },
        {
          icon: MessageSquare,
          title: 'Discord Server Rules',
          content: [
            'Respect all members & staff.',
            'No flaming, toxicity, spam, or SARA/NSFW content.',
            'Use channels according to their purpose. Orders only in designated places.',
            'Comply with staff/admin decisions.'
          ]
        }
      ]
    }
  };

  const t = content[language];

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-900/20 via-black to-black border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(120,0,255,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(0,150,255,0.1),transparent_50%)]" />
        
        <div className="relative max-w-7xl mx-auto px-4 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300 text-sm font-medium">{t.badge}</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              {t.title}
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              {t.subtitle} <span className="text-purple-400 font-semibold">{t.storeName}</span>{t.subtitleEnd}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Terms Content */}
      <div className="max-w-5xl mx-auto px-4 py-20">
        <div className="space-y-8">
          {t.sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-purple-500/30 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-purple-400" />
                  </div>
                  
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      {section.title}
                    </h2>
                    <div className="space-y-2">
                      {section.content.map((line, i) => (
                        <p key={i} className="text-gray-300 leading-relaxed">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-yellow-400 font-semibold mb-2">{t.importantTitle}</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                {t.importantText}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Last Updated */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            {t.lastUpdated}
          </p>
        </div>

        <FloatingButton />
      </div>
      <Footer />
    </div>
  );
}