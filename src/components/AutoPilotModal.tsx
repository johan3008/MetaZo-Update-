import React, { useState, useEffect } from 'react';
import { 
  Zap, X, Check, Sliders, ShieldCheck, Sparkles, UploadCloud, 
  HelpCircle, Settings, FileText, CheckCircle2, AlertCircle, ArrowRight, Lock, Crown
} from 'lucide-react';
import { AppLanguage } from '@/constants';

export interface AutoPilotConfig {
  enabled: boolean;
  keywordCount: number; // 30, 40, 50
  keywordMode: 'mixed' | 'single' | 'multi';
  titleLength: 'concise' | 'medium' | 'descriptive';
  metadataLanguage: string; // 'en', 'id', etc.
  targetKeywords: string; // Instruksi / Target Kata Kunci Tambahan
  isGenerativeAI: boolean;
  aiModelSource: string;
  qcMinScore: number; // 70 - 95 (Passing threshold for QC)
  autoForwardQC: boolean; // false: stay on QC tab, true: auto-forward to MetadataGen after countdown
  enableFtp: boolean; // true: upload to FTP, false: auto download embedded media files (no CSV)
  targetAgencies: string[]; // ['adobestock', 'shutterstock', 'freepik']
}

export const DEFAULT_AUTOPILOT_CONFIG: AutoPilotConfig = {
  enabled: false,
  keywordCount: 50,
  keywordMode: 'mixed',
  titleLength: 'medium',
  metadataLanguage: 'en',
  targetKeywords: '',
  isGenerativeAI: true,
  aiModelSource: 'Midjourney',
  qcMinScore: 75,
  autoForwardQC: true,
  enableFtp: false,
  targetAgencies: ['adobestock', 'shutterstock', 'freepik']
};

interface AutoPilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  uiLanguage: AppLanguage;
  config: AutoPilotConfig;
  onSaveConfig: (newConfig: AutoPilotConfig) => void;
  isLicensed?: boolean;
  onOpenActivation?: () => void;
}

export const AutoPilotModal: React.FC<AutoPilotModalProps> = ({
  isOpen,
  onClose,
  uiLanguage,
  config,
  onSaveConfig,
  isLicensed = false,
  onOpenActivation
}) => {
  const isIndo = uiLanguage === 'id';
  const [localConfig, setLocalConfig] = useState<AutoPilotConfig>(config);
  const [activeTab, setActiveTab] = useState<'metadata' | 'qc_pipeline' | 'ftp'>('metadata');
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    let configToSave = !isLicensed ? { ...localConfig, enabled: false } : localConfig;
    if (configToSave.enabled && (configToSave.autoForwardQC === undefined || configToSave.autoForwardQC === null)) {
      configToSave = { ...configToSave, autoForwardQC: true };
    }
    onSaveConfig(configToSave);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 600);
  };

  const toggleAgency = (agencyKey: string) => {
    setLocalConfig(prev => {
      const exists = prev.targetAgencies.includes(agencyKey);
      const updated = exists 
        ? prev.targetAgencies.filter(a => a !== agencyKey)
        : [...prev.targetAgencies, agencyKey];
      return { ...prev, targetAgencies: updated };
    });
  };

  return (
    <div 
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col relative max-h-[92vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Ribbon & Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors"
          title={isIndo ? "Tutup" : "Close"}
        >
          <X size={15} />
        </button>

        <div className="flex items-center space-x-3 mb-4 pb-4 border-b border-slate-100 dark:border-white/5 shrink-0 select-none">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Zap size={20} className="text-white fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Auto Pilot Gen
              </h2>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs">
                PRO PIPELINE
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {isIndo 
                ? 'Otomatisasi alur: Quality Check ➔ Metadata AI ➔ Auto FTP / Embed Download'
                : 'Automate pipeline: Quality Check ➔ AI Metadata ➔ Auto FTP / Embed Download'}
            </p>
          </div>
        </div>

        {/* PRO Restriction Alert Banner if unlicensed */}
        {!isLicensed && (
          <div className="p-3.5 mb-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/30 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                <Crown size={17} />
              </div>
              <div>
                <p className="text-xs font-black text-amber-900 dark:text-amber-200">
                  {isIndo ? 'Fitur Eksklusif PRO' : 'PRO Exclusive Feature'}
                </p>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                  {isIndo 
                    ? 'Upgrade ke Lisensi PRO untuk mengaktifkan otomatisasi alur kerja Auto Pilot Gen.'
                    : 'Upgrade to PRO License to activate automated Auto Pilot Gen workflow.'}
                </p>
              </div>
            </div>
            {onOpenActivation && (
              <button
                type="button"
                onClick={onOpenActivation}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-[11px] uppercase tracking-wider shrink-0 shadow-sm shadow-amber-500/25 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Lock size={12} />
                <span>{isIndo ? 'Aktivasi PRO' : 'Upgrade PRO'}</span>
              </button>
            )}
          </div>
        )}

        {/* Master Switch Banner */}
        <div className={`p-4 rounded-2xl border mb-4 transition-all duration-300 flex items-center justify-between gap-4 ${
          localConfig.enabled && isLicensed
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100 shadow-sm'
            : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${localConfig.enabled && isLicensed ? 'bg-amber-500 animate-ping' : 'bg-slate-400 opacity-30'}`} />
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-black uppercase tracking-wider">
                  {isIndo ? 'Status Fitur Auto Pilot' : 'Auto Pilot Mode Status'}
                </p>
                {!isLicensed && (
                  <span className="text-[8.5px] px-1.5 py-0.2 rounded font-black bg-amber-500/20 text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                    PRO
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                {!isLicensed
                  ? (isIndo ? '🔒 Terkunci — Memerlukan Lisensi PRO aktif' : '🔒 Locked — Requires active PRO License')
                  : localConfig.enabled 
                    ? (isIndo ? '🟢 AKTIF — File lolos QC akan otomatis diproses ke Metadata & FTP' : '🟢 ACTIVE — QC-passed files will auto-process into Metadata & FTP')
                    : (isIndo ? '⚪ NONAKTIF — Proses berjalan manual per modul' : '⚪ DISABLED — Operates manually per module')}
              </p>
            </div>
          </div>

          <label 
            className="relative inline-flex items-center cursor-pointer shrink-0"
            onClick={(e) => {
              if (!isLicensed) {
                e.preventDefault();
                if (onOpenActivation) onOpenActivation();
              }
            }}
          >
            <input 
              type="checkbox"
              checked={localConfig.enabled && !!isLicensed}
              onChange={(e) => {
                if (!isLicensed) {
                  if (onOpenActivation) onOpenActivation();
                  return;
                }
                setLocalConfig(prev => ({ ...prev, enabled: e.target.checked }));
              }}
              disabled={!isLicensed}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500 shadow-inner peer-disabled:opacity-60 peer-disabled:cursor-not-allowed"></div>
          </label>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-white/5 mb-4 shrink-0 overflow-x-auto custom-scrollbar">
          {[
            { id: 'metadata', label: isIndo ? 'Pengaturan Metadata AI' : 'AI Metadata Settings', icon: FileText },
            { id: 'qc_pipeline', label: isIndo ? 'Ambang Batas QC' : 'QC Threshold', icon: ShieldCheck },
            { id: 'ftp', label: isIndo ? 'Distribusi FTP / Unduhan' : 'FTP / Distribution', icon: UploadCloud }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2.5 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all shrink-0 cursor-pointer ${
                  isActive 
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/5'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Configuration Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs select-none custom-scrollbar">
          {activeTab === 'metadata' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Jumlah Keyword & Style */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10.5px] block">
                    {isIndo ? 'Count Keyword (Jumlah)' : 'Keyword Count'}
                  </label>
                  <select
                    value={localConfig.keywordCount}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, keywordCount: Number(e.target.value) }))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 outline-none font-bold text-slate-800 dark:text-slate-100 focus:border-amber-500 transition-all"
                  >
                    <option value={30}>30 Kata Kunci (Standard)</option>
                    <option value={40}>40 Kata Kunci (Expanded)</option>
                    <option value={50}>50 Kata Kunci (Maksimal SEO)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10.5px] block">
                    {isIndo ? 'Keyword Style (Gaya)' : 'Keyword Style'}
                  </label>
                  <select
                    value={localConfig.keywordMode}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, keywordMode: e.target.value as any }))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 outline-none font-bold text-slate-800 dark:text-slate-100 focus:border-amber-500 transition-all"
                  >
                    <option value="mixed">{isIndo ? 'Campuran (1 & 2-3 Kata) - Rekomendasi' : 'Mixed (1 & 2-3 Words) - Recommended'}</option>
                    <option value="single">{isIndo ? 'Hanya 1 Kata (Single Words)' : 'Single Words Only'}</option>
                    <option value="multi">{isIndo ? 'Frasa 2-3 Kata (Long Tail)' : 'Multi-words (Long Tail)'}</option>
                  </select>
                </div>
              </div>

              {/* Panjang Title & Bahasa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10.5px] block">
                    {isIndo ? 'Panjang Judul (Title Length)' : 'Title Length'}
                  </label>
                  <select
                    value={localConfig.titleLength}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, titleLength: e.target.value as any }))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 outline-none font-bold text-slate-800 dark:text-slate-100 focus:border-amber-500 transition-all"
                  >
                    <option value="concise">{isIndo ? 'Ringkas & Padat (~5-8 Kata)' : 'Concise (~5-8 Words)'}</option>
                    <option value="medium">{isIndo ? 'Sedang SEO (~9-14 Kata) - Rekomendasi' : 'Medium SEO (~9-14 Words) - Recommended'}</option>
                    <option value="descriptive">{isIndo ? 'Deskriptif Panjang (~15-20 Kata)' : 'Descriptive Long (~15-20 Words)'}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10.5px] block">
                    {isIndo ? 'Bahasa Metadata' : 'Metadata Language'}
                  </label>
                  <select
                    value={localConfig.metadataLanguage}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, metadataLanguage: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 outline-none font-bold text-slate-800 dark:text-slate-100 focus:border-amber-500 transition-all"
                  >
                    <option value="en">English (Standar Global Microstock)</option>
                    <option value="id">Bahasa Indonesia</option>
                  </select>
                </div>
              </div>

              {/* Target Kata Kunci / Instruksi Tambahan */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10.5px]">
                    {isIndo ? 'AI Instruksi / Target Kata Kunci' : 'AI Instructions / Target Keywords'}
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Opsional</span>
                </div>
                <textarea
                  rows={3}
                  value={localConfig.targetKeywords}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, targetKeywords: e.target.value }))}
                  placeholder={isIndo 
                    ? "Contoh: Fokus pada niche ramadan, keluarga muslim modern, warna pastel cerah, hindari kata brand..."
                    : "E.g.: Focus on sustainable green energy, solar panels, aerial drone perspective, exclude brand names..."}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all resize-none"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {isIndo 
                    ? 'AI Auto Pilot akan menyisipkan kata kunci atau gaya spesifik ini ke seluruh file yang diproses secara otomatis.' 
                    : 'Auto Pilot AI will enforce these niche targets and styling across all automatically processed assets.'}
                </p>
              </div>

              {/* Generative AI Checkbox & Source */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles size={14} className="text-amber-500" />
                    <span className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-[11px]">
                      {isIndo ? 'Centang AI / Generative AI Asset' : 'Generative AI Asset Tagging'}
                    </span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={localConfig.isGenerativeAI}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, isGenerativeAI: e.target.checked }))}
                    className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                  />
                </div>

                {localConfig.isGenerativeAI && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                    <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400">
                      {isIndo ? 'Model AI Pembuat Gambar:' : 'AI Image Engine Source:'}
                    </label>
                    <select
                      value={localConfig.aiModelSource}
                      onChange={(e) => setLocalConfig(prev => ({ ...prev, aiModelSource: e.target.value }))}
                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                    >
                      <option value="Midjourney">Midjourney</option>
                      <option value="Stable Diffusion">Stable Diffusion / Flux</option>
                      <option value="Adobe Firefly">Adobe Firefly</option>
                      <option value="DALL-E 3">DALL-E 3</option>
                      <option value="Leonardo AI">Leonardo AI</option>
                      <option value="Piclumen">Piclumen</option>
                      <option value="Other">Other / Umum</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'qc_pipeline' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    <span className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-[11px]">
                      {isIndo ? 'Ambang Batas Nilai Lolos QC (Passing Score)' : 'QC Passing Score Threshold'}
                    </span>
                  </div>
                  <span className="font-black text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    ≥ {localConfig.qcMinScore}%
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {isIndo 
                    ? 'Hanya file dengan skor QC di atas nilai ambang batas ini dan berstatus PASS yang akan dialihkan otomatis oleh Pilot ke MetadataGen dan FTP.'
                    : 'Only files with a QC score exceeding this threshold and marked PASS will automatically transfer to MetadataGen & FTP.'}
                </p>

                <input 
                  type="range"
                  min={70}
                  max={90}
                  step={5}
                  value={localConfig.qcMinScore}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, qcMinScore: Number(e.target.value) }))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />

                <div className="flex justify-between text-[10px] font-black text-slate-400">
                  <span>70% (Toleran)</span>
                  <span>75% (Standar Rekomendasi)</span>
                  <span>80% (Ketat)</span>
                  <span>90% (Ultra Curation)</span>
                </div>
              </div>

              {/* Opsi: Otomatis Pindah ke Tab MetadataGen saat Lolos QC */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="pr-4">
                    <div className="flex items-center space-x-2">
                      <ArrowRight size={14} className="text-amber-500" />
                      <p className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                        {isIndo ? 'Otomatis Pindah ke Tab MetadataGen saat Lolos QC' : 'Auto-Transfer to MetadataGen on QC Pass'}
                      </p>
                    </div>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                      {isIndo 
                        ? 'Jika AKTIF (Rekomendasi), setelah seluruh antrean selesai diaudit, file yang berstatus Lolos akan otomatis dialihkan ke Tab MetadataGen.' 
                        : 'If ENABLED (Recommended), once all queue items finish audit, passed files automatically transfer to MetadataGen tab.'}
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox"
                      checked={localConfig.autoForwardQC}
                      onChange={(e) => setLocalConfig(prev => ({ ...prev, autoForwardQC: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500 shadow-inner"></div>
                  </label>
                </div>
              </div>

              <div className="p-3.5 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start space-x-2.5">
                <HelpCircle size={15} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
                  {isIndo 
                    ? 'File yang terdeteksi FAIL (seperti blur berlebih, noise ekstrem, atau artefak kecacatan) akan tetap tersimpan di daftar QC agar tidak menghabiskan kuota atau merusak reputasi akun kontributor Anda.' 
                    : 'Files flagged FAIL (blur, severe noise, AI defects) will remain safely parked in QC to preserve your contributor standing.'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'ftp' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Option: Upload to FTP vs Auto-Download */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                      {isIndo ? 'Upload Otomatis ke FTP / SFTP' : 'Auto-Upload to FTP / SFTP'}
                    </p>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      {isIndo 
                        ? 'Matikan jika FTP agensi Anda belum siap (sistem akan mengunduh file media yang sudah di-embed IPTC/XMP tanpa CSV)'
                        : 'Disable if your agency FTP is not configured (system will auto-download embedded media files with IPTC/XMP metadata, no CSV)'}
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox"
                      checked={localConfig.enableFtp}
                      onChange={(e) => setLocalConfig(prev => ({ ...prev, enableFtp: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500 shadow-inner"></div>
                  </label>
                </div>

                {localConfig.enableFtp ? (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      {isIndo ? 'Agensi Target Auto Pilot:' : 'Target Microstock Agencies:'}
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { key: 'adobestock', label: 'Adobe Stock (SFTP)' },
                        { key: 'shutterstock', label: 'Shutterstock (FTP)' },
                        { key: 'freepik', label: 'Freepik (FTP)' }
                      ].map(agency => {
                        const isChecked = localConfig.targetAgencies.includes(agency.key);
                        return (
                          <button
                            key={agency.key}
                            type="button"
                            onClick={() => toggleAgency(agency.key)}
                            className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                              isChecked 
                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-black' 
                                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 font-bold'
                            }`}
                          >
                            <span className="text-[11px] truncate">{agency.label}</span>
                            {isChecked && <CheckCircle2 size={13} className="shrink-0 text-emerald-500 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-400 italic">
                      * Pastikan kredensial username & password FTP Anda sudah diisi di tab "FTP Uploader".
                    </p>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      💡 {isIndo 
                        ? 'Mode Unduhan: Setelah AI selesai membuat metadata dan embedding, file dengan metadata ter-embed (JPG/PNG/EPS/SVG/MP4) akan otomatis terunduh ke perangkat Anda (tanpa file CSV).'
                        : 'Download Mode: Once AI completes metadata generation and embedding, files with embedded metadata (JPG/PNG/EPS/SVG/MP4) will auto-download directly to your computer (no CSV files).'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {savedToast && (
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-500 animate-in fade-in">
                <Check size={14} /> {isIndo ? 'Pengaturan Disimpan!' : 'Settings Saved!'}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              {isIndo ? 'Batal' : 'Cancel'}
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Check size={14} />
              <span>{isIndo ? 'Simpan Pengaturan' : 'Save Config'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
