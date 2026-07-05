import React from 'react';
import { Check, Download } from 'lucide-react';

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
  shutterstockDescMode: 'desc' | 'title_desc';
  setShutterstockDescMode: (v: 'desc' | 'title_desc') => void;
  autoDownloadCSV: boolean;
  setAutoDownloadCSV: (v: boolean) => void;
  canDownload: boolean;
  handleExport: () => void;
  handleBackupJSON?: () => void;
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
  shutterstockDescMode,
  setShutterstockDescMode,
  autoDownloadCSV,
  setAutoDownloadCSV,
  canDownload,
  handleExport,
  handleBackupJSON,
  t
}) => {
  return (
    <div className="bg-white dark:bg-[#111827] border border-[#e3e6f0]/80 dark:border-white/5 rounded-2xl shadow-md shadow-black/5 flex flex-col relative overflow-hidden">
      {/* HEADER */}
      <div className="bg-[#f8f9fc] dark:bg-slate-900 py-3.5 px-5 border-b border-[#e3e6f0]/60 dark:border-white/5 rounded-t-lg">
        <h3 className="m-0 font-extrabold text-[#7c3aed] dark:text-violet-400 text-xs sm:text-sm uppercase tracking-wider">
          Bulk Multi-Platform Export Controls
        </h3>
      </div>

      {/* BODY */}
      <div className="p-6 space-y-6">
        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 block mb-3">
            Target Stock Platforms
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Adobe Stock */}
            <label className={`flex flex-col justify-between p-3.5 rounded-[1.5rem] border-2 cursor-pointer transition-all ${
              exportAdobe ? 'border-slate-800 dark:border-indigo-500 bg-slate-50/50 dark:bg-indigo-500/5 shadow-inner' : 'border-slate-200 dark:border-white/5 hover:border-slate-350 dark:hover:border-slate-800'
            }`}>
              <input type="checkbox" className="hidden" checked={exportAdobe} onChange={(e) => setExportAdobe(e.target.checked)} />
              <div className="flex items-center justify-between w-full mb-3">
                <span className="text-[9px] font-black px-1.5 py-0.5 bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 rounded uppercase">AD</span>
                <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center border ${
                  exportAdobe ? 'bg-slate-900 dark:bg-indigo-500 text-white border-transparent' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-slate-800'
                }`}>
                  {exportAdobe && <Check size={10} />}
                </div>
              </div>
              <div>
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-100 block">Adobe Stock</span>
                <span className="text-[9px] text-slate-400 mt-0.5 block leading-tight">Adobe categories parsed</span>
              </div>
            </label>

            {/* Shutterstock */}
            <label className={`flex flex-col justify-between p-3.5 rounded-[1.5rem] border-2 cursor-pointer transition-all ${
              exportShutterstock ? 'border-red-500 bg-red-500/5 shadow-inner' : 'border-slate-200 dark:border-white/5 hover:border-red-300 dark:hover:border-slate-800'
            }`}>
              <input type="checkbox" className="hidden" checked={exportShutterstock} onChange={(e) => setExportShutterstock(e.target.checked)} />
              <div className="flex items-center justify-between w-full mb-3">
                <span className="text-[9px] font-black px-1.5 py-0.5 bg-red-600 text-white rounded uppercase">SST</span>
                <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center border  ${
                  exportShutterstock ? 'bg-red-500 text-white border-transparent' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-slate-800'
                }`}>
                  {exportShutterstock && <Check size={10} />}
                </div>
              </div>
              <div>
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-100 block">Shutterstock</span>
                <span className="text-[9px] text-slate-400 mt-0.5 block leading-tight font-medium">Auto categories formats</span>
              </div>
            </label>

            {/* Vecteezy */}
            <label className={`flex flex-col justify-between p-3.5 rounded-[1.5rem] border-2 cursor-pointer transition-all ${
              exportVecteezy ? 'border-orange-500 bg-orange-500/5 shadow-inner' : 'border-slate-200 dark:border-white/5 hover:border-orange-355 dark:hover:border-slate-800'
            }`}>
              <input type="checkbox" className="hidden" checked={exportVecteezy} onChange={(e) => setExportVecteezy(e.target.checked)} />
              <div className="flex items-center justify-between w-full mb-3">
                <span className="text-[9px] font-black px-1.5 py-0.5 bg-orange-500 text-white rounded uppercase">VZ</span>
                <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center border ${
                  exportVecteezy ? 'bg-orange-500 text-white border-transparent' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-slate-800'
                }`}>
                  {exportVecteezy && <Check size={10} />}
                </div>
              </div>
              <div>
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-100 block">Vecteezy</span>
                <span className="text-[9px] text-slate-400 mt-0.5 block leading-tight font-medium">Standard vector exports</span>
              </div>
            </label>

            {/* Canva */}
            <label className={`flex flex-col justify-between p-3.5 rounded-[1.5rem] border-2 cursor-pointer transition-all ${
              exportCanva ? 'border-violet-500 bg-violet-500/5 shadow-inner' : 'border-slate-200 dark:border-white/5 hover:border-blue-300 dark:hover:border-slate-800'
            }`}>
              <input type="checkbox" className="hidden" checked={exportCanva} onChange={(e) => setExportCanva(e.target.checked)} />
              <div className="flex items-center justify-between w-full mb-3">
                <span className="text-[9px] font-black px-1.5 py-0.5 bg-violet-500 text-white rounded uppercase">CANVO</span>
                <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center border ${
                  exportCanva ? 'bg-violet-500 text-white border-transparent' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-slate-800'
                }`}>
                  {exportCanva && <Check size={10} />}
                </div>
              </div>
              <div>
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-100 block">Canva</span>
                <span className="text-[9px] text-slate-400 mt-0.5 block leading-tight font-medium">Simple listings tags</span>
              </div>
            </label>

            {/* Freepik */}
            <label className={`flex flex-col justify-between p-3.5 rounded-[1.5rem] border-2 cursor-pointer transition-all ${
              exportFreepik ? 'border-emerald-500 bg-emerald-500/5 shadow-inner' : 'border-slate-200 dark:border-white/5 hover:border-emerald-300 dark:hover:border-slate-800'
            }`}>
              <input type="checkbox" className="hidden" checked={exportFreepik} onChange={(e) => setExportFreepik(e.target.checked)} />
              <div className="flex items-center justify-between w-full mb-3">
                <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-500 text-white rounded uppercase">FP</span>
                <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center border ${
                  exportFreepik ? 'bg-emerald-500 text-white border-transparent' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-slate-800'
                }`}>
                  {exportFreepik && <Check size={10} />}
                </div>
              </div>
              <div>
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-100 block">Freepik</span>
                <span className="text-[9px] text-slate-400 mt-0.5 block leading-tight font-medium">Category keywords split</span>
              </div>
            </label>
          </div>
        </div>

        {/* DETAILS ADVANCED CONTROLS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Shutterstock format toggle */}
          {exportShutterstock && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] space-y-2 animate-in slide-in-from-top-1 duration-200">
              <label className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                Shutterstock Description Column Mode
              </label>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setShutterstockDescMode('desc')}
                  className={`flex-1 py-1.5 px-3 rounded-2xl text-[10px] font-bold transition-all ${
                    shutterstockDescMode === 'desc' ? 'bg-[#e74a3b] text-white shadow-md shadow-black/5' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Description Only
                </button>
                <button 
                  onClick={() => setShutterstockDescMode('title_desc')}
                  className={`flex-1 py-1.5 px-3 rounded-2xl text-[10px] font-bold transition-all ${
                    shutterstockDescMode === 'title_desc' ? 'bg-[#e74a3b] text-white shadow-md shadow-black/5' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Title + Description
                </button>
              </div>
            </div>
          )}

          {/* Master Auto-Download Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem]">
            <div>
              <label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-widest block">
                Auto-Download All
              </label>
              <span className="text-[9px] text-slate-400">Trigger CSV package automatically</span>
            </div>
            <button 
              onClick={() => setAutoDownloadCSV(!autoDownloadCSV)}
              className={`w-12 h-6.5 rounded-full p-0.5 transition-colors relative flex items-center ${
                autoDownloadCSV ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div 
                className={`w-5.5 h-5.5 rounded-full bg-white transition-all shadow-md transform ${
                  autoDownloadCSV ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* BUTTON ACTION FLOOR */}
        <div className="pt-4 border-t border-[#e3e6f0]/60 dark:border-white/5 flex flex-col sm:flex-row justify-end gap-3">
          {handleBackupJSON && (
            <button
              onClick={handleBackupJSON}
              disabled={!canDownload}
              className={`w-full sm:w-auto px-6 py-3 text-sm font-black rounded-[1.5rem] shadow transition-all flex items-center justify-center space-x-2 active:scale-[0.98] ${
                canDownload ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-700' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Download size={15} />
              <span>BACKUP AS JSON</span>
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={!canDownload}
            className={`w-full sm:w-auto px-6 py-3 text-sm font-black rounded-[1.5rem] text-white shadow transition-all flex items-center justify-center space-x-2 active:scale-[0.98] ${
              canDownload ? 'bg-gradient-to-r from-[#7c3aed] to-indigo-600 hover:from-blue-620 shadow-violet-500/10' : 'bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Download size={15} />
            <span>EXPORT COMPILED CSV PACKAGE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
