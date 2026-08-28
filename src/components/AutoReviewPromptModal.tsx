import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Star, Heart, X, Check, CheckCircle2, Sparkles, 
  MessageSquare, Camera, UploadCloud, ShieldCheck, ThumbsUp
} from 'lucide-react';
import { CommunityReview } from '@/types';
import { db, collection, query, limit, setDoc, doc } from '@/src/supabase';

interface AutoReviewPromptModalProps {
  user?: any;
  isLicensed?: boolean;
  successfulFilesCount?: number;
  appName?: string;
}

const DEFAULT_EXPERIENCE_TAGS = [
  '🚀 AI Super Cepat',
  '✅ 100% Lolos Adobe Stock',
  '💎 Fitur PRO Sangat Berguna',
  '🎯 Keyword SEO Akurat',
  '🔥 Hemat Waktu 10x',
  '🏆 Sangat Direkomendasikan'
];

export const AutoReviewPromptModal: React.FC<AutoReviewPromptModalProps> = ({
  user,
  isLicensed = false,
  successfulFilesCount = 0,
  appName = 'MetaZo PRO'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasReviewed, setHasReviewed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mz_has_submitted_review') === 'true';
    } catch (e) {
      return false;
    }
  });

  // Review Form States
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['🚀 AI Super Cepat', '✅ 100% Lolos Adobe Stock']);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if review already exists in cache or for this user
  useEffect(() => {
    if (hasReviewed) return;
    try {
      const cached = localStorage.getItem('mz_community_reviews_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && user?.email) {
          const userHasRev = parsed.some((r: any) => r.userEmail && r.userEmail.toLowerCase() === user.email.toLowerCase());
          if (userHasRev) {
            setHasReviewed(true);
            localStorage.setItem('mz_has_submitted_review', 'true');
          }
        }
      }
    } catch (e) {}
  }, [user, hasReviewed]);

  // Engagement Trigger: User active in tools (processed files or stayed 90s engaged)
  useEffect(() => {
    if (hasReviewed) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const lastPromptDate = localStorage.getItem('mz_review_prompt_last_date');

    // Rule: Only once per day if skipped previously
    if (lastPromptDate === todayStr) return;

    let timer: NodeJS.Timeout | null = null;

    // Trigger A: User has successfully processed files with the tool
    if (successfulFilesCount >= 1) {
      timer = setTimeout(() => {
        setIsOpen(true);
      }, 3500); // 3.5s delay after success so user appreciates the result
    } else {
      // Trigger B: User is actively exploring and using the app for 90 seconds
      timer = setTimeout(() => {
        const stillReviewed = localStorage.getItem('mz_has_submitted_review') === 'true';
        const lastPrompt = localStorage.getItem('mz_review_prompt_last_date');
        if (!stillReviewed && lastPrompt !== todayStr) {
          setIsOpen(true);
        }
      }, 90000); // 90s engagement window
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [hasReviewed, successfulFilesCount]);

  // Handle Skip ("Nanti Saja" / "Lain Kali")
  const handleSkip = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem('mz_review_prompt_last_date', todayStr);
    setIsOpen(false);
  };

  // Image compressor for attached screenshots
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.78));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (photos.length + files.length > 4) {
      alert('Maksimal 4 foto ulasan diperbolehkan.');
      return;
    }
    const newPhotos = [...photos];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      try {
        const comp = await compressImage(file);
        newPhotos.push(comp);
      } catch (err) {}
    }
    setPhotos(newPhotos);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      alert('Mohon tuliskan komentar / ulasan singkat Anda.');
      return;
    }

    setIsSubmitting(true);
    const userIdentifier = user?.uid || (user?.email ? user.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_') : 'local_user');
    const reviewId = `rev-user-${userIdentifier}`;
    const authorName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'Kontributor Kreatif');

    const newReview: CommunityReview = {
      id: reviewId,
      userName: authorName,
      userEmail: user?.email || '',
      userAvatar: user?.photoURL || '',
      isPro: isLicensed,
      rating,
      title: title.trim() || `${rating} Bintang - Pengalaman Hebat`,
      comment: comment.trim(),
      tags: selectedTags,
      photos,
      createdAt: new Date().toISOString(),
      helpfulCount: 1,
      verifiedBuyer: isLicensed,
      appVersion: isLicensed ? 'v4.2 PRO' : 'v4.2 Trial'
    };

    try {
      // 1. Save to Database (Upsert based on unique user ID)
      await setDoc(doc(db, 'reviews', reviewId), newReview);

      // 2. Cache locally (Deduplicate)
      const cached = localStorage.getItem('mz_community_reviews_cache');
      const list = cached ? JSON.parse(cached) : [];
      const filtered = Array.isArray(list) ? list.filter((r: any) => r.id !== reviewId && (!user?.email || r.userEmail?.toLowerCase() !== user.email.toLowerCase())) : [];
      localStorage.setItem('mz_community_reviews_cache', JSON.stringify([newReview, ...filtered]));

      // 3. Mark as reviewed permanently so it NEVER appears again
      localStorage.setItem('mz_has_submitted_review', 'true');
      setHasReviewed(true);

      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setIsOpen(false);
      }, 1600);
    } catch (err) {
      console.warn('Error saving review, saving locally:', err);
      localStorage.setItem('mz_has_submitted_review', 'true');
      setHasReviewed(true);
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setIsOpen(false);
      }, 1600);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingLabel = (val: number) => {
    switch (val) {
      case 5: return '🌟 Luar Biasa! Sangat Puas';
      case 4: return '👍 Sangat Bagus & Membantu';
      case 3: return '👌 Cukup Baik';
      case 2: return '👎 Perlu Peningkatan';
      case 1: return '⚠️ Kurang Puas';
      default: return 'Pilih Rating Anda';
    }
  };

  if (hasReviewed || !isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[92vh] overflow-y-auto custom-scrollbar"
        >
          {/* Close / Skip button */}
          <button
            onClick={handleSkip}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Lewati untuk hari ini"
          >
            <X size={18} />
          </button>

          <div className="space-y-4">
            {/* Header */}
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest mb-1 shadow-sm">
                <Sparkles size={12} className="text-amber-500" />
                <span>Play Store In-App Rating</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Suka Menggunakan <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-violet-600">{appName}</span>?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto">
                Bantu kami berkembang dengan memberikan rating bintang & ulasan pengalaman Anda!
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              
              {/* Star Rating Interactive Box */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Beri Nilai Kepuasan
                </span>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-125 active:scale-95 transition-transform cursor-pointer"
                    >
                      <Star 
                        size={32} 
                        className={`transition-colors ${
                          (hoverRating || rating) >= star 
                            ? 'text-amber-400 fill-amber-400 drop-shadow-sm' 
                            : 'text-slate-300 dark:text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  {getRatingLabel(hoverRating || rating)}
                </span>
              </div>

              {/* Title input */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Judul Ulasan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Sangat membantu submit ratusan aset microstock!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-900 dark:text-white transition-all"
                />
              </div>

              {/* Comment Textarea */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Pengalaman Anda <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Apa yang paling Anda sukai? Kecepatan metadata AI, Quality Check, atau penghematan waktunya?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-900 dark:text-white transition-all resize-none"
                />
              </div>

              {/* Experience Tags */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Pilih Tag Pengalaman
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_EXPERIENCE_TAGS.map((tag, idx) => {
                    const isSel = selectedTags.includes(tag);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-2.5 py-1 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer ${
                          isSel 
                            ? 'bg-violet-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Photo Upload */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                    📸 Lampirkan Screenshot / Foto Bukti ({photos.length}/4)
                  </label>
                  <span className="text-[9px] text-slate-400">Opsional</span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />

                <div className="grid grid-cols-4 gap-2">
                  {photos.map((p, pIdx) => (
                    <div key={pIdx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img src={p} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotos(prev => prev.filter((_, i) => i !== pIdx))}
                        className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full shadow hover:bg-rose-700"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}

                  {photos.length < 4 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 flex flex-col items-center justify-center p-2 text-slate-400 hover:text-amber-500 transition-all cursor-pointer group"
                    >
                      <UploadCloud size={18} className="group-hover:scale-110 transition-transform mb-0.5" />
                      <span className="text-[8px] font-black uppercase text-center leading-tight">
                        + Foto
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Success Notification */}
              {submitSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 size={16} />
                  <span>Terima kasih banyak! Ulasan Anda telah diterbitkan.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Nanti Saja
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Kirim Ulasan & Rating</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
