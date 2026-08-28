import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Star, ThumbsUp, Plus, UploadCloud, X, CheckCircle2, 
  Sparkles, Filter, Search, Award, MessageSquare, 
  ShieldCheck, Camera, Trash2, Maximize2, User, 
  TrendingUp, Check, Heart, ExternalLink, RefreshCw,
  Sliders, Shield, Image as ImageIcon, MessageCircle
} from 'lucide-react';
import { CommunityReview } from '@/types';
import { db, collection, query, limit, onSnapshot, setDoc, doc, updateDoc } from '@/src/supabase';

interface ReviewsViewProps {
  t: any;
  user?: any;
  isLicensed?: boolean;
  appName?: string;
  onOpenDashboard?: () => void;
}

const DEFAULT_EXPERIENCE_TAGS = [
  '🚀 AI Super Cepat',
  '✅ 100% Lolos Adobe Stock',
  '💎 Fitur PRO Sangat Berguna',
  '🎯 Keyword SEO Akurat',
  '🔥 Hemat Waktu 10x',
  '🏆 Sangat Direkomendasikan',
  '📸 Kualitas Prompt Tajam',
  '⚡ Workflow Otomatis'
];

export const ReviewsView: React.FC<ReviewsViewProps> = ({
  t,
  user,
  isLicensed = false,
  appName = 'MetaZo PRO',
  onOpenDashboard
}) => {
  const [reviews, setReviews] = useState<CommunityReview[]>(() => {
    try {
      const cached = localStorage.getItem('mz_community_reviews_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.filter((r: any) => !r.id?.startsWith('rev-seed-'));
        }
      }
    } catch (e) {}
    return [];
  });

  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | 'all'>('all');
  const [onlyWithPhotos, setOnlyWithPhotos] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [likedReviewIds, setLikedReviewIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('mz_liked_reviews');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Lightbox Modal for Photo Zoom
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  // Form states for review submission
  const [formRating, setFormRating] = useState<number>(5);
  const [formHoverRating, setFormHoverRating] = useState<number>(0);
  const [formTitle, setFormTitle] = useState('');
  const [formComment, setFormComment] = useState('');
  const [formSelectedTags, setFormSelectedTags] = useState<string[]>(['✅ 100% Lolos Adobe Stock']);
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real-time synchronization directly from database
  useEffect(() => {
    let active = true;
    try {
      setIsLoadingReviews(true);
      const unsub = onSnapshot(query(collection(db, 'reviews'), limit(100)), (snapshot) => {
        if (!active) return;
        setIsLoadingReviews(false);
        const list: CommunityReview[] = [];
        if (snapshot && typeof snapshot.forEach === 'function') {
          snapshot.forEach((d: any) => {
            const data = d.data();
            list.push({
              id: d.id,
              userName: data.userName || 'Pengguna MetaZo',
              userEmail: data.userEmail || '',
              userAvatar: data.userAvatar || '',
              isPro: data.isPro ?? true,
              rating: Number(data.rating) || 5,
              title: data.title || '',
              comment: data.comment || '',
              tags: Array.isArray(data.tags) ? data.tags : [],
              photos: Array.isArray(data.photos) ? data.photos : [],
              createdAt: data.createdAt || new Date().toISOString(),
              helpfulCount: Number(data.helpfulCount) || 0,
              verifiedBuyer: data.verifiedBuyer ?? true,
              appVersion: data.appVersion || 'v4.2 PRO'
            });
          });
        }

        setReviews(list);
        localStorage.setItem('mz_community_reviews_cache', JSON.stringify(list));
      }, (err) => {
        if (!active) return;
        setIsLoadingReviews(false);
        console.warn('Realtime reviews error, using cache:', err);
      });

      return () => {
        active = false;
        unsub?.();
      };
    } catch (e) {
      if (active) setIsLoadingReviews(false);
    }
  }, []);

  // Compression helper for uploaded screenshots/photos
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
          const compressed = canvas.toDataURL('image/jpeg', 0.78);
          resolve(compressed);
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

    if (formPhotos.length + files.length > 4) {
      alert('Maksimal 4 foto ulasan diperbolehkan.');
      return;
    }

    const newPhotos: string[] = [...formPhotos];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      try {
        const compressedBase64 = await compressImage(file);
        newPhotos.push(compressedBase64);
      } catch (err) {
        console.error('Error compressing image:', err);
      }
    }
    setFormPhotos(newPhotos);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setFormPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const toggleTagSelection = (tag: string) => {
    setFormSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formComment.trim()) {
      alert('Mohon tuliskan ulasan pengalaman Anda.');
      return;
    }

    setIsSubmitting(true);
    const reviewId = 'rev-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const authorName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'Kontributor Kreatif');
    
    const newReview: CommunityReview = {
      id: reviewId,
      userName: authorName,
      userEmail: user?.email || '',
      userAvatar: user?.photoURL || '',
      isPro: isLicensed,
      rating: formRating,
      title: formTitle.trim() || `${formRating} Bintang - Pengalaman Luar Biasa`,
      comment: formComment.trim(),
      tags: formSelectedTags,
      photos: formPhotos,
      createdAt: new Date().toISOString(),
      helpfulCount: 1,
      verifiedBuyer: isLicensed,
      appVersion: isLicensed ? 'v4.2 PRO' : 'v4.2 Trial'
    };

    try {
      // 1. Save to Database
      await setDoc(doc(db, 'reviews', reviewId), newReview);

      // 2. Update local state & cache immediately
      setReviews(prev => [newReview, ...prev]);
      const cached = localStorage.getItem('mz_community_reviews_cache');
      const list = cached ? JSON.parse(cached) : [];
      localStorage.setItem('mz_community_reviews_cache', JSON.stringify([newReview, ...list]));

      setSubmitSuccessMsg(true);
      setTimeout(() => {
        setSubmitSuccessMsg(false);
        setShowWriteModal(false);
        // Reset form
        setFormComment('');
        setFormTitle('');
        setFormPhotos([]);
        setFormRating(5);
      }, 1500);
    } catch (error) {
      console.warn('Error saving review to database, saving locally:', error);
      setReviews(prev => [newReview, ...prev]);
      setShowWriteModal(false);
      alert('Ulasan Anda berhasil dikirim dan tersimpan di perangkat!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHelpfulUpvote = async (reviewId: string) => {
    const isAlreadyLiked = likedReviewIds[reviewId];
    const newLiked = { ...likedReviewIds, [reviewId]: !isAlreadyLiked };
    setLikedReviewIds(newLiked);
    localStorage.setItem('mz_liked_reviews', JSON.stringify(newLiked));

    let updatedCount = 0;
    setReviews(prev => prev.map(r => {
      if (r.id === reviewId) {
        updatedCount = Math.max(0, (r.helpfulCount || 0) + (isAlreadyLiked ? -1 : 1));
        return {
          ...r,
          helpfulCount: updatedCount
        };
      }
      return r;
    }));

    try {
      await updateDoc(doc(db, 'reviews', reviewId), { helpfulCount: updatedCount });
    } catch (e) {
      console.warn('Error updating helpfulCount to database:', e);
    }
  };

  // Compute Statistics based strictly on real reviews
  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) {
      return { 
        avgRating: '0.0', 
        totalCount: 0, 
        breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, 
        countByStar: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } 
      };
    }

    let sum = 0;
    const countByStar: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    reviews.forEach(r => {
      const rounded = Math.min(5, Math.max(1, Math.round(r.rating)));
      sum += r.rating;
      countByStar[rounded] = (countByStar[rounded] || 0) + 1;
    });

    const avg = (sum / total).toFixed(1);
    const breakdown: Record<number, number> = {
      5: Math.round((countByStar[5] / total) * 100),
      4: Math.round((countByStar[4] / total) * 100),
      3: Math.round((countByStar[3] / total) * 100),
      2: Math.round((countByStar[2] / total) * 100),
      1: Math.round((countByStar[1] / total) * 100),
    };

    return {
      avgRating: avg,
      totalCount: total,
      breakdown,
      countByStar
    };
  }, [reviews]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      if (selectedStarFilter !== 'all' && Math.round(r.rating) !== selectedStarFilter) {
        return false;
      }
      if (onlyWithPhotos && (!r.photos || r.photos.length === 0)) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = (r.title || '').toLowerCase().includes(query);
        const matchComment = r.comment.toLowerCase().includes(query);
        const matchAuthor = r.userName.toLowerCase().includes(query);
        const matchTag = (r.tags || []).some(t => t.toLowerCase().includes(query));
        if (!matchTitle && !matchComment && !matchAuthor && !matchTag) return false;
      }
      return true;
    });
  }, [reviews, selectedStarFilter, onlyWithPhotos, searchQuery]);

  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 5: return '🌟 Luar Biasa (Sangat Memuaskan)';
      case 4: return '👍 Sangat Bagus & Membantu';
      case 3: return '👌 Cukup Baik';
      case 2: return '👎 Perlu Peningkatan';
      case 1: return '⚠️ Kurang Puas';
      default: return 'Pilih Rating Anda';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-16 animate-in fade-in duration-300">
      
      {/* 1. HEADER CARD (STANDAR DESAIN METAZO APP) */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        {/* Glow Ambient Orbs */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 -ml-12 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          {/* Left Title & Description */}
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest flex items-center space-x-1.5 shadow-sm">
                <Sparkles size={12} className="text-amber-500" />
                <span>Ulasan & Rating Komunitas</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-[10px] font-black uppercase tracking-wider">
                Realtime Cloud
              </span>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
                <Star size={24} className="fill-slate-950" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Ulasan & Testimonial <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-violet-600">Pengguna</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Pengalaman nyata kontributor microstock dan kreator visual menggunakan ekosistem MetaZo AI.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowWriteModal(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center space-x-2 cursor-pointer"
              >
                <Plus size={16} />
                <span>Tulis Ulasan & Beri Rating</span>
              </button>
              
              {onOpenDashboard && (
                <button
                  onClick={onOpenDashboard}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                >
                  Kembali ke Dashboard
                </button>
              )}
            </div>
          </div>

          {/* Right Play Store Scorecard */}
          <div className="w-full lg:w-auto bg-slate-50/80 dark:bg-slate-950/60 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-6 shrink-0 shadow-sm">
            {/* Big Rating Number */}
            <div className="flex flex-col items-center justify-center text-center shrink-0">
              <span className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                {stats.totalCount > 0 ? stats.avgRating : '0.0'}
              </span>
              <div className="flex items-center space-x-1 my-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    size={16} 
                    className={stats.totalCount > 0 && Number(stats.avgRating) >= star ? "text-amber-400 fill-amber-400" : "text-slate-300 dark:text-slate-700"} 
                  />
                ))}
              </div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {stats.totalCount} Total Ulasan
              </span>
              {stats.totalCount > 0 && (
                <span className="inline-flex items-center space-x-1 mt-1 text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 size={10} />
                  <span>Komunitas Terverifikasi</span>
                </span>
              )}
            </div>

            {/* 5-Star Breakdown Bars */}
            <div className="w-full sm:w-44 space-y-1.5 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 pt-4 sm:pt-0 sm:pl-5">
              {[5, 4, 3, 2, 1].map((starLevel) => {
                const pct = stats.breakdown[starLevel] || 0;
                return (
                  <button
                    key={starLevel}
                    onClick={() => setSelectedStarFilter(selectedStarFilter === starLevel ? 'all' : starLevel)}
                    className={`w-full flex items-center space-x-2 text-[10px] font-bold transition-all group/star cursor-pointer ${selectedStarFilter === starLevel ? 'opacity-100 text-amber-600 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    <span className="w-2.5 text-right shrink-0">{starLevel}</span>
                    <Star size={10} className={selectedStarFilter === starLevel ? "text-amber-400 fill-amber-400" : "text-slate-400 group-hover/star:text-amber-400"} />
                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${selectedStarFilter === starLevel ? 'bg-amber-500' : 'bg-gradient-to-r from-amber-400 to-orange-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-7 text-right text-[9px] font-mono text-slate-400">{pct}%</span>
                  </button>
                );
              })}
            </div>

          </div>

        </div>
      </div>

      {/* 2. FILTER & SEARCH TOOLBAR */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Rating Filter Chips */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2 w-full md:w-auto">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center space-x-1">
            <Filter size={12} />
            <span>Filter:</span>
          </span>

          <button
            onClick={() => setSelectedStarFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              selectedStarFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Semua Bintang ({reviews.length})
          </button>

          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => setSelectedStarFilter(selectedStarFilter === star ? 'all' : star)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1 cursor-pointer ${
                selectedStarFilter === star
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{star}</span>
              <Star size={11} className="fill-current text-amber-400" />
              <span className="text-[10px] opacity-75">({stats.countByStar[star] || 0})</span>
            </button>
          ))}

          <button
            onClick={() => setOnlyWithPhotos(!onlyWithPhotos)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1 cursor-pointer ${
              onlyWithPhotos
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Camera size={12} />
            <span>Ada Foto Bukti</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72 shrink-0">
          <input
            type="text"
            placeholder="Cari ulasan atau topik..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-slate-900 dark:text-white"
          />
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 3. REVIEWS GRID DISPLAY */}
      {filteredReviews.length === 0 ? (
        <div className="text-center py-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-sm">
          <MessageSquare size={40} className="text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-black text-slate-800 dark:text-white mb-1">
            {reviews.length === 0 ? 'Belum Ada Ulasan Komunitas' : 'Belum Ada Ulasan yang Cocok'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-5 font-medium leading-relaxed">
            {reviews.length === 0 
              ? 'Jadilah kreator pertama yang membagikan pengalaman, rating bintang, dan screenshot portfolio Anda!' 
              : 'Tidak menemukan ulasan untuk filter yang Anda pilih. Coba pilih filter bintang lain.'}
          </p>
          <button
            onClick={() => setShowWriteModal(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer transition-all inline-flex items-center space-x-2 active:scale-95"
          >
            <Plus size={14} />
            <span>Tulis Ulasan Pertama (+ Foto)</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredReviews.map((review) => {
            const isLiked = likedReviewIds[review.id];
            const initial = (review.userName || 'U').charAt(0).toUpperCase();

            return (
              <div 
                key={review.id}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 hover:border-violet-500/40 dark:hover:border-violet-500/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group/card"
              >
                <div className="space-y-3">
                  {/* Top Row: User Avatar & Badge & Date */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {review.userAvatar ? (
                        <img 
                          src={review.userAvatar} 
                          alt={review.userName} 
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-violet-500/20">
                          {initial}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight">
                            {review.userName}
                          </h4>
                          {review.isPro && (
                            <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[8px] font-black uppercase tracking-wider border border-emerald-200 dark:border-emerald-500/20">
                              <ShieldCheck size={9} />
                              <span>PRO Verified</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {review.appVersion} • {new Date(review.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* Star Rating Badge */}
                    <div className="flex items-center space-x-0.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-500/20 px-2.5 py-1 rounded-xl">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star 
                          key={s} 
                          size={12} 
                          className={s <= review.rating ? "text-amber-400 fill-amber-400" : "text-slate-300 dark:text-slate-700"} 
                        />
                      ))}
                    </div>
                  </div>

                  {/* Title & Comment */}
                  <div className="space-y-1">
                    {review.title && (
                      <h5 className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {review.title}
                      </h5>
                    )}
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                      {review.comment}
                    </p>
                  </div>

                  {/* Tags */}
                  {review.tags && review.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {review.tags.map((tag, idx) => (
                        <span 
                          key={idx}
                          className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Attached Photos / Screenshots (Clickable to Lightbox) */}
                  {review.photos && review.photos.length > 0 && (
                    <div className="pt-1.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                        📸 Lampiran Bukti / Hasil ({review.photos.length}):
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {review.photos.map((photo, pIdx) => (
                          <div 
                            key={pIdx}
                            onClick={() => setZoomedPhoto(photo)}
                            className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group/img cursor-pointer bg-slate-100 dark:bg-slate-800"
                          >
                            <img 
                              src={photo} 
                              alt={`Lampiran ulasan ${pIdx + 1}`} 
                              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Maximize2 size={16} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Helpful Button */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-semibold">
                    Apakah ulasan ini membantu?
                  </span>
                  
                  <button
                    onClick={() => handleHelpfulUpvote(review.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                      isLiked
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <ThumbsUp size={11} className={isLiked ? 'fill-current' : ''} />
                    <span>Membantu ({review.helpfulCount || 0})</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. MODAL WRITE A REVIEW (TULIS ULASAN & UNGGAH FOTO) */}
      <AnimatePresence>
        {showWriteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <button
                onClick={() => setShowWriteModal(false)}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="space-y-4">
                <div>
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-black uppercase tracking-widest mb-1.5">
                    <Star size={10} className="fill-current" />
                    <span>Ulasan Pengguna MetaZo</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Tulis Ulasan & Pengalaman Anda
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Bagikan rating dan screenshot bukti kemudahan metadata Anda kepada sesama kreator!
                  </p>
                </div>

                <form onSubmit={handleSubmitReview} className="space-y-4 pt-1">
                  
                  {/* Star Picker */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Beri Nilai Bintang
                    </span>
                    <div className="flex items-center space-x-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setFormHoverRating(star)}
                          onMouseLeave={() => setFormHoverRating(0)}
                          onClick={() => setFormRating(star)}
                          className="p-1 hover:scale-125 active:scale-95 transition-transform cursor-pointer"
                        >
                          <Star 
                            size={28} 
                            className={`transition-colors ${
                              (formHoverRating || formRating) >= star 
                                ? 'text-amber-400 fill-amber-400' 
                                : 'text-slate-300 dark:text-slate-700'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      {getRatingLabel(formHoverRating || formRating)}
                    </span>
                  </div>

                  {/* Review Title */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                      Judul Ulasan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Approval Adobe Stock 100% lancar & cepat!"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-900 dark:text-white transition-all"
                    />
                  </div>

                  {/* Review Comment Textarea */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                      Isi Komentar / Ulasan <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ceritakan pengalaman Anda menggunakan fitur AI Metadata, Prompt, Quality Check, atau penghematan waktu yang Anda rasakan..."
                      value={formComment}
                      onChange={(e) => setFormComment(e.target.value)}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-900 dark:text-white transition-all resize-none"
                    />
                  </div>

                  {/* Experience Tags Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                      Pilih Tag Pengalaman (Opsional)
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {DEFAULT_EXPERIENCE_TAGS.map((tag, idx) => {
                        const isSelected = formSelectedTags.includes(tag);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleTagSelection(tag)}
                            className={`px-2.5 py-1 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer ${
                              isSelected
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

                  {/* Photo Upload Area */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                        📸 Unggah Foto Bukti / Screenshot ({formPhotos.length}/4)
                      </label>
                      <span className="text-[9px] text-slate-400 font-semibold">
                        Max 4 gambar (Auto Compress)
                      </span>
                    </div>

                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />

                    {/* Previews Grid & Upload Trigger Button */}
                    <div className="grid grid-cols-4 gap-2">
                      {formPhotos.map((photo, pIdx) => (
                        <div key={pIdx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group/preview">
                          <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(pIdx)}
                            className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full shadow hover:bg-rose-700 transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}

                      {formPhotos.length < 4 && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-400 flex flex-col items-center justify-center p-2 text-slate-400 hover:text-amber-500 transition-all cursor-pointer group"
                        >
                          <UploadCloud size={20} className="group-hover:scale-110 transition-transform mb-1 text-slate-400 group-hover:text-amber-500" />
                          <span className="text-[8px] font-black uppercase text-center leading-tight">
                            Tambah Foto
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {submitSuccessMsg && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center space-x-2">
                      <CheckCircle2 size={16} />
                      <span>Terima kasih! Ulasan Anda berhasil diterbitkan.</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2 flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowWriteModal(false)}
                      className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-[2] py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>Menerbitkan...</span>
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          <span>Kirim Ulasan</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. LIGHTBOX MODAL FOR ZOOMING PHOTOS */}
      <AnimatePresence>
        {zoomedPhoto && (
          <div 
            onClick={() => setZoomedPhoto(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in"
          >
            <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <img 
                src={zoomedPhoto} 
                alt="Zoomed Review Attachment" 
                className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-white/20 shadow-2xl"
              />
              <button
                onClick={() => setZoomedPhoto(null)}
                className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full backdrop-blur-md transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
