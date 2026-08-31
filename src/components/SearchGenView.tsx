import React, { useState } from 'react';
import { 
  Search, Sparkles, TrendingUp, Flame, Check, Copy, ArrowRight, 
  ExternalLink, Layers, Film, ImageIcon, Box, Tag, ShieldCheck, 
  Users, Briefcase, Zap, Compass, RefreshCw, AlertCircle, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SearchGenResult, ContentGapItem } from '../../types';
import { fetchSearchGenAnalysis } from '../../services/geminiService';
import { FeatureGuideButton } from './FeatureGuideModal';

interface SearchGenViewProps {
  t: any;
  onSendToPrompt?: (text: string) => void;
  onSendToMetadata?: (keywords: string[], title?: string) => void;
  aiOptions?: any;
}

const TRENDING_RADAR_PRESETS = [
  { label: '🤖 AI Drone Agriculture', query: 'AI Drone Agriculture Precision', icon: '🌱' },
  { label: '⚡ Solid-State EV Battery', query: 'Solid-state battery electric vehicle', icon: '🔋' },
  { label: '🧬 Synthetic Biology Lab', query: 'Synthetic biology bioreactor automated laboratory', icon: '🔬' },
  { label: '☀️ Perovskite Solar Farm', query: 'Perovskite solar cell installation farm', icon: '☀️' },
  { label: '🦾 Neural Prosthetic Bionics', query: 'Modern bionic limb neural prosthetic interface', icon: '🦾' },
  { label: '🏢 Vertical Forest Architecture', query: 'Vertical forest sustainable skyscraper architecture', icon: '🌿' },
  { label: '📦 Robotic Automated Warehouse', query: 'Automated warehouse AMR robotics swarm logistics', icon: '📦' },
  { label: '🧊 Glassmorphic 3D FinTech', query: '3D isometric FinTech payment security glassmorphism', icon: '💳' }
];

export const SearchGenView: React.FC<SearchGenViewProps> = ({
  t,
  onSendToPrompt,
  onSendToMetadata,
  aiOptions
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaType, setMediaType] = useState<'all' | 'photo' | 'video' | 'vector'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SearchGenResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activePromptTab, setActivePromptTab] = useState<'image' | 'video' | '3d'>('image');

  const handleSearch = async (queryToSearch?: string) => {
    const targetQuery = (queryToSearch !== undefined ? queryToSearch : searchQuery).trim();
    if (!targetQuery) return;

    setSearchQuery(targetQuery);
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchSearchGenAnalysis(targetQuery, mediaType, aiOptions);
      setResult(data);
    } catch (err: any) {
      console.error('Search Gen failed:', err);
      setError(err?.message || 'Gagal memuat analisis pasar. Pastikan koneksi atau kuota API tersedia.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getScoreBadge = (score: number, badge: string) => {
    if (score >= 85 || badge === 'GOLDEN_NICHE') {
      return {
        bg: 'bg-gradient-to-r from-amber-500 to-emerald-500 text-white shadow-lg shadow-emerald-500/20',
        label: '🔥 GOLDEN NICHE (Ultra High Potential)',
        border: 'border-emerald-500/40',
        color: 'text-emerald-400'
      };
    }
    if (score >= 70 || badge === 'HIGH_OPPORTUNITY') {
      return {
        bg: 'bg-emerald-500 text-slate-950 font-black',
        label: '🟢 HIGH OPPORTUNITY',
        border: 'border-emerald-500/30',
        color: 'text-emerald-400'
      };
    }
    if (score >= 50 || badge === 'MODERATE') {
      return {
        bg: 'bg-amber-500 text-slate-950 font-black',
        label: '🟡 MODERATE COMPETITION',
        border: 'border-amber-500/30',
        color: 'text-amber-400'
      };
    }
    return {
      bg: 'bg-rose-500 text-white font-black',
      label: '🔴 OVERSATURATED (High Competition)',
      border: 'border-rose-500/30',
      color: 'text-rose-400'
    };
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/20 p-6 sm:p-8 shadow-2xl text-white">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-black tracking-wider uppercase">
              <Compass size={14} className="animate-spin text-indigo-400" style={{ animationDuration: '8s' }} />
              <span>Real-Time Market Radar</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              Search Gen <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-emerald-400">Radar</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Temukan niche komersial dengan persaingan rendah (*Low Competition*) dan potensi permintaan tinggi (*High Demand*) langsung dari database pasar Adobe Stock secara *real-time*.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <FeatureGuideButton featureKey="search_gen" />
          </div>
        </div>

        {/* Main Search Input Form */}
        <div className="mt-8 space-y-4">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
            className="flex flex-col sm:flex-row items-stretch gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik topik atau keyword (misal: AI Drone Agriculture, Hydrogen Fuel Cell, dll.)..."
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-800/90 border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white placeholder-slate-400 text-sm font-medium transition-all shadow-inner outline-none"
              />
            </div>

            {/* Media Type Filter */}
            <div className="flex items-center bg-slate-800/90 rounded-2xl border border-slate-700/80 p-1 shrink-0">
              <button
                type="button"
                onClick={() => setMediaType('all')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${mediaType === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setMediaType('photo')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${mediaType === 'photo' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Foto
              </button>
              <button
                type="button"
                onClick={() => setMediaType('video')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${mediaType === 'video' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Video
              </button>
              <button
                type="button"
                onClick={() => setMediaType('vector')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${mediaType === 'vector' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Vektor
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || !searchQuery.trim()}
              className="px-6 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-sm tracking-wide flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-98 shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Memindai Pasar...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Scan Radar</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Presets / Radar Tags */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Flame size={13} className="text-amber-400" />
              <span>Trending Niche Picks Hari Ini:</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {TRENDING_RADAR_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSearch(preset.query)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-indigo-900/50 border border-slate-700/60 hover:border-indigo-500/40 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  <span>{preset.icon}</span>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-start space-x-3 animate-in fade-in">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold">Terjadi Kendala</p>
            <p className="text-xs mt-0.5 opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-slate-100 dark:bg-slate-800/50 rounded-2xl" />
            ))}
          </div>
          <div className="h-40 bg-slate-100 dark:bg-slate-800/50 rounded-2xl" />
        </div>
      )}

      {/* Results View */}
      <AnimatePresence>
        {result && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Opportunity Banner Card */}
            {(() => {
              const badgeInfo = getScoreBadge(result.opportunityScore, result.statusBadge);
              return (
                <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${badgeInfo.bg}`}>
                        {badgeInfo.label}
                      </span>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                        Kategori: {result.category || 'General Stock'}
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white capitalize">
                      {result.query}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                      Rasio peluang dihitung dari volume kompetisi di Adobe Stock vs potensi kebutuhan komersial pembeli.
                    </p>
                  </div>

                  {/* Score Gauge Circle */}
                  <div className="flex items-center space-x-4 shrink-0 self-start md:self-auto bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="text-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Score</span>
                      <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-500">
                        {result.opportunityScore}<span className="text-sm text-slate-400">/100</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric 1: Total Assets */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Kompetisi Pasar</span>
                  <Layers size={16} className="text-indigo-400" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {result.metrics?.totalEstimatedAssets?.toLocaleString('id-ID') || '< 1.000'} <span className="text-xs font-normal text-slate-400">aset</span>
                </div>
                <p className="text-[11px] font-medium text-emerald-500">
                  Level: {result.metrics?.competitionLevel || 'Low'}
                </p>
              </div>

              {/* Metric 2: Demand Velocity */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Tren Permintaan</span>
                  <TrendingUp size={16} className="text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {result.metrics?.demandVelocity || 'Rising (+120%)'}
                </div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Tipe: {result.metrics?.demandType || 'Evergreen'}
                </p>
              </div>

              {/* Metric 3: Target Buyers */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Target Pembeli</span>
                  <Users size={16} className="text-violet-400" />
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                  {(result.metrics?.targetBuyers || []).slice(0, 2).join(', ') || 'Corporate, Tech Media'}
                </div>
                <p className="text-[11px] font-medium text-slate-400">
                  {result.metrics?.targetBuyers?.length || 2} segmen industri
                </p>
              </div>

              {/* Metric 4: Commercial Use Cases */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Kebutuhan Komersial</span>
                  <Briefcase size={16} className="text-amber-400" />
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                  {(result.metrics?.commercialUseCases || []).slice(0, 2).join(', ') || 'Hero Banner, Pitch Deck'}
                </div>
                <p className="text-[11px] font-medium text-slate-400">
                  Aplikasi: Web, Ads, Presentation
                </p>
              </div>
            </div>

            {/* Content Gap (Ide Celah Visual yang Belum Ada di Pasar) */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Zap className="text-amber-400" size={20} />
                    <span>Content Gap (Sudut Visual yang Belum Banyak Dibuat)</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Fokus buat aset dengan konsep-konsep di bawah ini untuk langsung mengisi kekosongan pasar microstock.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(result.contentGaps || []).map((gap: ContentGapItem, idx: number) => (
                  <div 
                    key={idx}
                    className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-4 hover:border-indigo-500/50 transition-all group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          {gap.format || 'Photo'}
                        </span>
                        <span className="text-[10px] font-extrabold text-slate-400">GAP #{idx + 1}</span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white leading-snug group-hover:text-indigo-400 transition-colors">
                        "{gap.angle}"
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        <span className="font-bold text-slate-900 dark:text-slate-100">Alasan Laku: </span>
                        {gap.whyItSells}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{gap.competitionNotes || 'Kompetisi sangat minim'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ready-to-Use Master AI Prompts */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="text-indigo-400" size={20} />
                    <span>Master AI Generation Prompts</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Prompt siap pakai yang dioptimalkan khusus untuk menghasilkan visual komersial bernilai jual tinggi.
                  </p>
                </div>

                {/* Prompt Type Tabs */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setActivePromptTab('image')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activePromptTab === 'image' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    <ImageIcon size={13} />
                    <span>Foto AI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePromptTab('video')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activePromptTab === 'video' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    <Film size={13} />
                    <span>Video 4K</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePromptTab('3d')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activePromptTab === '3d' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    <Box size={13} />
                    <span>3D / CGI</span>
                  </button>
                </div>
              </div>

              {/* Active Prompt Box */}
              {(() => {
                const currentPromptText = 
                  activePromptTab === 'image' ? result.readyPrompts?.imagePrompt :
                  activePromptTab === 'video' ? result.readyPrompts?.videoPrompt :
                  (result.readyPrompts?.isometricOr3dPrompt || result.readyPrompts?.imagePrompt);

                return (
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-4">
                    <p className="text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap selection:bg-indigo-500 selection:text-white">
                      {currentPromptText || 'Prompt not generated.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => handleCopy(currentPromptText || '', 'master-prompt')}
                        className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow cursor-pointer active:scale-95"
                      >
                        {copiedKey === 'master-prompt' ? (
                          <>
                            <Check size={14} className="text-emerald-300" />
                            <span>Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Salin Prompt</span>
                          </>
                        )}
                      </button>

                      {onSendToPrompt && (
                        <button
                          type="button"
                          onClick={() => onSendToPrompt(currentPromptText || '')}
                          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold transition-all cursor-pointer active:scale-95"
                        >
                          <span>Kirim ke Prompt Gen</span>
                          <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Ready SEO Keywords */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Tag className="text-emerald-400" size={20} />
                    <span>SEO Microstock Keywords ({result.readyKeywords?.length || 0})</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Koleksi kata kunci komersial dengan performa pencarian tinggi bebas dari trademark.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleCopy((result.readyKeywords || []).join(', '), 'all-keywords')}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold transition-all cursor-pointer active:scale-95"
                  >
                    {copiedKey === 'all-keywords' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copiedKey === 'all-keywords' ? 'Semua Tersalin!' : 'Salin Semua Keyword'}</span>
                  </button>

                  {onSendToMetadata && (
                    <button
                      type="button"
                      onClick={() => onSendToMetadata(result.readyKeywords || [], result.query)}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow cursor-pointer active:scale-95"
                    >
                      <span>Buka di Metadata Gen</span>
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Keyword Pills */}
              <div className="flex flex-wrap gap-2 pt-2">
                {(result.readyKeywords || []).map((kw, i) => (
                  <span
                    key={i}
                    onClick={() => handleCopy(kw, `kw-${i}`)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-slate-200/80 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer select-none"
                    title="Klik untuk salin satu kata kunci"
                  >
                    {copiedKey === `kw-${i}` ? '✓ Tersalin' : kw}
                  </span>
                ))}
              </div>
            </div>

            {/* Adobe Stock Top Ranking References (if available) */}
            {result.topReferenceAssets && result.topReferenceAssets.length > 0 && (
              <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Compass className="text-indigo-400" size={20} />
                    <span>Aset Teratas di Adobe Stock Saat Ini</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Contoh visual aset kompetitor yang saat ini menduduki halaman pertama Adobe Stock untuk referensi komposisi.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {result.topReferenceAssets.map((asset, idx) => (
                    <a
                      key={idx}
                      href={asset.detailUrl || `https://stock.adobe.com/search?k=${encodeURIComponent(result.query)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col transition-all hover:scale-[1.02] hover:shadow-lg"
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-200 dark:bg-slate-950 flex items-center justify-center">
                        <img 
                          src={asset.imageUrl} 
                          alt={asset.title || 'Stock reference'} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          loading="lazy"
                        />
                      </div>
                      <div className="p-3 space-y-1">
                        <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-indigo-400 transition-colors">
                          {asset.title || `Aset #${asset.id}`}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Adobe Stock</span>
                          <ExternalLink size={11} className="opacity-70 group-hover:opacity-100" />
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
