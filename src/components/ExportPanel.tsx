import React from 'react';
import { Check, Download, Layers, Sparkles, FileSpreadsheet, FileJson, CheckCircle2 } from 'lucide-react';

interface ExportPanelProps {
  exportAdobe: boolean;
  setExportAdobe: (v: boolean) => void;
  exportShutterstock: boolean;
  setExportShutterstock: (v: boolean) => void;
  exportVecteezy: boolean;
  setExportVecteezy: (v: boolean) => void;
  exportCanva: boolean;
  setExportCanva: (v: boolean) => void;
  exportFreepik: boolean;
  setExportFreepik: (v: boolean) => void;
  exportPond5: boolean;
  setExportPond5: (v: boolean) => void;
  exportDepositPhotos: boolean;
  setExportDepositPhotos: (v: boolean) => void;
  exportMiriCanvas: boolean;
  setExportMiriCanvas: (v: boolean) => void;
  export123RF: boolean;
  setExport123RF: (v: boolean) => void;
  shutterstockDescMode: 'desc' | 'title_desc';
  setShutterstockDescMode: (v: 'desc' | 'title_desc') => void;
  autoDownloadCSV: boolean;
  setAutoDownloadCSV: (v: boolean) => void;
  canDownload: boolean;
  handleExport: () => void;
  handleBackupJSON?: () => void;
  handleDownloadEmbedded?: () => void;
  embedDownloading?: boolean;
  t: any;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  exportAdobe,
  setExportAdobe,
  exportShutterstock,
  setExportShutterstock,
  exportVecteezy,
  setExportVecteezy,
  exportCanva,
  setExportCanva,
  exportFreepik,
  setExportFreepik,
  exportPond5,
  setExportPond5,
  exportDepositPhotos,
  setExportDepositPhotos,
  exportMiriCanvas,
  setExportMiriCanvas,
  export123RF,
  setExport123RF,
  shutterstockDescMode,
  setShutterstockDescMode,
  autoDownloadCSV,
  setAutoDownloadCSV,
  canDownload,
  handleExport,
  handleBackupJSON,
  handleDownloadEmbedded,
  embedDownloading,
  t
}) => {
  const platforms = [
    {
      id: 'adobe',
      name: 'Adobe Stock',
      tag: 'AD',
      desc: 'Categories & CLIP keywords',
      checked: exportAdobe,
      setChecked: setExportAdobe,
      color: 'border-slate-800 dark:border-violet-500 bg-slate-900/5 dark:bg-violet-500/10 text-slate-900 dark:text-violet-300'
    },
    {
      id: 'shutterstock',
      name: 'Shutterstock',
      tag: 'SST',
      desc: 'Dual category formatting',
      checked: exportShutterstock,
      setChecked: setExportShutterstock,
      color: 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400'
    },
    {
      id: 'vecteezy',
      name: 'Vecteezy',
      tag: 'VZ',
      desc: 'Standard vector indexing',
      checked: exportVecteezy,
      setChecked: setExportVecteezy,
      color: 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
    },
    {
      id: 'canva',
      name: 'Canva',
      tag: 'CNV',
      desc: 'Simplified comma tags',
      checked: exportCanva,
      setChecked: setExportCanva,
      color: 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
    },
    {
      id: 'freepik',
      name: 'Freepik',
      tag: 'FP',
      desc: 'Category & split keywords',
      checked: exportFreepik,
      setChecked: setExportFreepik,
      color: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    },
    {
      id: 'pond5',
      name: 'Pond5',
      tag: 'P5',
      desc: 'Footage & audio metadata',
      checked: exportPond5,
      setChecked: setExportPond5,
      color: 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400'
    },
    {
      id: 'depositphotos',
      name: 'DepositPhotos',
      tag: 'DP',
      desc: 'Standard CSV structure',
      checked: exportDepositPhotos,
      setChecked: setExportDepositPhotos,
      color: 'border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400'
    },
    {
      id: 'miricanvas',
      name: 'MiriCanvas',
      tag: 'MC',
      desc: 'Korean/Global market tags',
      checked: exportMiriCanvas,
      setChecked: setExportMiriCanvas,
      color: 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
    },
    {
      id: '123rf',
      name: '123RF',
      tag: '123',
      desc: 'Standard microstock CSV',
      checked: export123RF,
      setChecked: setExport123RF,
      color: 'border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-400'
    }
  ];

  const selectedCount = platforms.filter(p => p.checked).length;

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-white/5 rounded-2xl shadow-xl shadow-black/5 flex flex-col relative overflow-hidden transition-all duration-300">
      {/* HEADER */}
      <div className="bg-slate-50/70 dark:bg-slate-850/50 py-3.5 px-5 border-b border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-violet-500/20">
            04
          </div>
          <div>
            <h3 className="m-0 font-extrabold text-slate-800 dark:text-white text-xs sm:text-sm uppercase tracking-wider">
              Bulk Multi-Platform Export Controls
            </h3>
            <p className="text-[11px] text-slate-400 font-semibold hidden sm:block">
              Select stock platforms to export CSV metadata or embed tags directly into files
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg self-start sm:self-auto">
          {selectedCount} platform{selectedCount !== 1 ? 's' : ''} selected
        </span>
      </div>

      {/* BODY */}
      <div className="p-5 sm:p-6 space-y-5">
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2.5">
            Select Target Marketplaces
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {platforms.map((plat) => (
              <label 
                key={plat.id}
                className={`flex flex-col justify-between p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none ${
                  plat.checked 
                    ? `${plat.color} shadow-xs` 
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={plat.checked} 
                  onChange={(e) => plat.setChecked(e.target.checked)} 
                />
                <div className="flex items-center justify-between w-full mb-2">
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                    plat.checked ? 'bg-black/10 dark:bg-white/10' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {plat.tag}
                  </span>
                  <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                    plat.checked 
                      ? 'bg-violet-600 border-violet-600 text-white' 
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                  }`}>
                    {plat.checked && <Check size={11} strokeWidth={3} />}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-black block truncate">{plat.name}</span>
                  <span className="text-[9px] opacity-70 mt-0.5 block truncate leading-tight font-medium">
                    {plat.desc}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* DETAILS ADVANCED CONTROLS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {/* Shutterstock format toggle */}
          {exportShutterstock && (
            <div className="p-3.5 bg-slate-50/70 dark:bg-black/20 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 animate-in fade-in duration-200">
              <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Shutterstock Description Mode
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button 
                  onClick={() => setShutterstockDescMode('desc')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    shutterstockDescMode === 'desc' 
                      ? 'bg-rose-600 text-white shadow-sm' 
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Description Only
                </button>
                <button 
                  onClick={() => setShutterstockDescMode('title_desc')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    shutterstockDescMode === 'title_desc' 
                      ? 'bg-rose-600 text-white shadow-sm' 
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Title + Description
                </button>
              </div>
            </div>
          )}

          {/* Master Auto-Download Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50/70 dark:bg-black/20 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div>
              <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                Auto-Download CSV
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Trigger CSV package download automatically</span>
            </div>
            <button 
              onClick={() => setAutoDownloadCSV(!autoDownloadCSV)}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors relative flex items-center cursor-pointer ${
                autoDownloadCSV ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div 
                className={`w-5 h-5 rounded-full bg-white transition-all shadow-sm transform ${
                  autoDownloadCSV ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* BUTTON ACTION FLOOR */}
        <div className="pt-3 border-t border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row justify-end gap-2.5">
          {handleBackupJSON && (
            <button
              onClick={handleBackupJSON}
              disabled={!canDownload}
              className={`px-5 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
                canDownload 
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-750' 
                  : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-800'
              }`}
            >
              <FileJson size={15} />
              <span>Backup as JSON</span>
            </button>
          )}

          {handleDownloadEmbedded && (
            <button
              onClick={handleDownloadEmbedded}
              disabled={!canDownload || embedDownloading}
              className={`px-5 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
                canDownload && !embedDownloading 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              {embedDownloading ? (
                <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              ) : (
                <Download size={15} />
              )}
              <span>{embedDownloading ? 'Embedding Tags...' : 'Download Embedded Files'}</span>
            </button>
          )}

          <button
            onClick={handleExport}
            disabled={!canDownload}
            className={`px-6 py-3 text-xs font-black uppercase tracking-wider rounded-xl text-white transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
              canDownload 
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/25' 
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <FileSpreadsheet size={16} />
            <span>Export Compiled CSV Package</span>
          </button>
        </div>
      </div>
    </div>
  );
};
