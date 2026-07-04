import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle, Zap, Key, Clock, Tag, RefreshCcw } from 'lucide-react';

interface FAQItem {
  id: string;
  icon: React.ReactNode;
  question: {
    id: string;
    en: string;
  };
  answer: {
    id: string;
    en: string;
  };
}

interface FAQAccordionProps {
  language: 'id' | 'en';
}

export const FAQAccordion: React.FC<FAQAccordionProps> = ({ language }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const faqData: FAQItem[] = [
    {
      id: 'free-trial',
      icon: <Clock size={16} className="text-violet-500 shrink-0" />,
      question: {
        id: "Bagaimana cara kerja Free Trial (Uji Coba Gratis)?",
        en: "How does the Free Trial work?"
      },
      answer: {
        id: "Setiap pengguna baru secara otomatis mendapatkan Free Trial setelah pendaftaran untuk mencoba seluruh pipeline AI Metadata kami. Periode uji coba ini memiliki batasan harian standar, memungkinkan Anda mencoba fitur generator dan analisis kami sebelum memutuskan untuk meningkatkan ke PRO. Sisa hari uji coba dapat Anda lihat langsung di dashboard.",
        en: "Every new user starts with a Free Trial upon registration to test our AI Metadata pipelines. The trial is subject to standard daily limits, allowing you to try the generator and analyzer features before upgrading. You can check your remaining trial days and limits on the dashboard."
      }
    },
    {
      id: 'transition-pro',
      icon: <Key size={16} className="text-amber-500 shrink-0" />,
      question: {
        id: "Bagaimana cara beralih dari Free Trial ke Langganan Berbayar / PRO?",
        en: "How do I transition to a Paid / PRO Subscription?"
      },
      answer: {
        id: "Untuk meningkatkan ke PRO, Anda dapat membeli Kode Lisensi resmi dari Reseller kami atau menukarkan Voucher diskon. Cukup klik tombol 'Gunakan Voucher / Lisensi Sekarang' di Pengaturan atau tab Reseller, masukkan kode Anda, dan status akun Anda akan langsung beralih secara instan dari Free Trial ke PRO yang berlisensi penuh.",
        en: "To upgrade to PRO, you can purchase a License Key from our authorized resellers or redeem a discount Voucher. Simply click the 'Redeem License Key / Voucher' button in Settings or the Reseller tab, input your code, and your account status instantly transitions from Free Trial to Licensed PRO."
      }
    },
    {
      id: 'pro-benefits',
      icon: <Zap size={16} className="text-[#7c3aed] shrink-0" />,
      question: {
        id: "Apa saja keuntungan setelah upgrade ke akun PRO?",
        en: "What benefits does the Paid PRO subscription offer?"
      },
      answer: {
        id: "Akun PRO membuka akses penuh ke pipeline berkecepatan tinggi tanpa batas harian (Unlimited Batch Processing) serta optimasi Stock SEO Standar Industri. Ini memastikan hasil metadata Anda menggunakan kata kunci berkualitas tinggi yang ramah algoritma microstock untuk meningkatkan posisi pencarian karya Anda di Adobe Stock, Freepik, dan Shutterstock.",
        en: "Upgrading to PRO unlocks our premium high-speed pipeline with Unlimited Batch Processing (no daily generation or batch limits) and our Industrial Stock SEO Engine. This ensures your metadata uses highly optimized, industry-standard keywords to help you rank higher on Adobe Stock, Freepik, and Shutterstock."
      }
    },
    {
      id: 'buy-license',
      icon: <Tag size={16} className="text-emerald-500 shrink-0" />,
      question: {
        id: "Di mana saya bisa membeli Kode Lisensi atau mendapatkan Voucher Promo?",
        en: "Where can I buy a License Key or get promo vouchers?"
      },
      answer: {
        id: "Voucher diskon dapat Anda temukan secara berkala melalui jendela promo 'Penawaran Terbatas'. Sedangkan Kode Lisensi resmi dapat dibeli secara aman melalui jaringan Reseller kami. Anda dapat membuka portal pembelian atau menghubungi dukungan pelanggan langsung via WhatsApp melalui link di tab Reseller Portal.",
        en: "Discount vouchers are occasionally shared in our 'Limited Offer' promo window. Official serial license keys can be purchased through our reseller network. You can access the authorized purchase portal or contact customer support directly using the WhatsApp link inside the Reseller Portal tab."
      }
    },
    {
      id: 'expiry',
      icon: <RefreshCcw size={16} className="text-indigo-500 shrink-0" />,
      question: {
        id: "Bagaimana jika masa aktif langganan PRO saya habis?",
        en: "What happens when my PRO subscription period ends?"
      },
      answer: {
        id: "Setelah diaktifkan, masa aktif langganan Anda dilacak secara dinamis. Jika masa aktif langganan PRO habis, akun Anda akan kembali ke tier standar dengan aman. Anda tidak akan kehilangan riwayat data lokal atau pengaturan API key Anda, namun batasan pemrosesan harian standar akan kembali diberlakukan.",
        en: "Once activated, your subscription period is tracked dynamically. When your PRO subscription period ends, your account status transitions back to the standard tier safely. You will not lose any of your offline local history or configuration keys, but standard daily processing limits will apply again."
      }
    }
  ];

  const toggleItem = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <div className="space-y-2.5 max-w-md mx-auto">
      {faqData.map(item => {
        const isExpanded = expandedId === item.id;
        const questionText = language === 'id' ? item.question.id : item.question.en;
        const answerText = language === 'id' ? item.answer.id : item.answer.en;

        return (
          <div 
            key={item.id} 
            className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/40 transition-colors duration-200"
          >
            <button
              onClick={() => toggleItem(item.id)}
              className="w-full flex items-center justify-between p-3.5 text-left font-bold text-xs text-slate-800 dark:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors focus:outline-none"
            >
              <div className="flex items-center space-x-2.5">
                {item.icon}
                <span className="leading-tight">{questionText}</span>
              </div>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-slate-400 dark:text-slate-500 shrink-0 ml-2"
              >
                <ChevronDown size={14} />
              </motion.div>
            </button>
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                >
                  <div className="p-3.5 pt-0 border-t border-slate-100 dark:border-slate-800/50 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                    {answerText}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
