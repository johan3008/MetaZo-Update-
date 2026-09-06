import React from 'react';
import { FileCode, CheckCircle2, Clock, AlertTriangle, Layers, Sparkles } from 'lucide-react';

interface MetricsRowProps {
  filesLength: number;
  successfulFilesCount: number;
  filesToGenerateCount: number;
  filesWithErrorCount: number;
}

export const MetricsRow: React.FC<MetricsRowProps> = ({
  filesLength,
  successfulFilesCount,
  filesToGenerateCount,
  filesWithErrorCount
}) => {
  const successPct = filesLength > 0 ? Math.round((successfulFilesCount / filesLength) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* CARD 1: TOTAL FILES */}
      <div className="group relative overflow-hidden rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/80 dark:border-white/10 p-4.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/10 hover:border-violet-500/40">
        <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500 shadow-sm shadow-violet-500/50" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Uploaded Queue
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                {filesLength}
              </span>
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {filesLength === 1 ? 'asset' : 'assets'}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500/15 to-indigo-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/20 flex items-center justify-center shadow-sm shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform">
            <FileCode size={20} strokeWidth={2.2} />
          </div>
        </div>
        <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500">
          <span>Batch Workspace</span>
          <span className="text-violet-600 dark:text-violet-400 font-extrabold flex items-center gap-1">
            <Sparkles size={11} /> Ready to tag
          </span>
        </div>
      </div>

      {/* CARD 2: ANALYSES COMPLETE */}
      <div className="group relative overflow-hidden rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/80 dark:border-white/10 p-4.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-500/40">
        <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Metadata Ready
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                {successfulFilesCount}
              </span>
              <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {successPct}%
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-sm shrink-0 group-hover:scale-110 group-hover:-rotate-3 transition-transform">
            <CheckCircle2 size={20} strokeWidth={2.2} />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" 
              style={{ width: `${successPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500">
            <span>Progress status</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold font-mono">
              {successfulFilesCount}/{filesLength} completed
            </span>
          </div>
        </div>
      </div>

      {/* CARD 3: PENDING QUEUE */}
      <div className="group relative overflow-hidden rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/80 dark:border-white/10 p-4.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/10 hover:border-cyan-500/40">
        <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-sm shadow-cyan-500/50" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pending Queue
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                {filesToGenerateCount}
              </span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                waiting
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/15 to-blue-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 flex items-center justify-center shadow-sm shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform">
            <Clock size={20} strokeWidth={2.2} />
          </div>
        </div>
        <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500">
          <span>AI Pipeline</span>
          <span className="text-cyan-600 dark:text-cyan-400 font-extrabold font-mono">
            {filesToGenerateCount > 0 ? `${filesToGenerateCount} in queue` : 'Idle'}
          </span>
        </div>
      </div>

      {/* CARD 4: ISSUES/ERRORS */}
      <div className={`group relative overflow-hidden rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl p-4.5 ${
        filesWithErrorCount > 0 
          ? 'border-rose-500/50 hover:border-rose-500 hover:shadow-rose-500/15' 
          : 'border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
      }`}>
        <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-rose-500/10 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={`w-2 h-2 rounded-full ${filesWithErrorCount > 0 ? 'bg-rose-500 animate-ping shadow-sm shadow-rose-500/80' : 'bg-slate-300 dark:bg-slate-600'}`} />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Quality Alerts
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight font-mono ${filesWithErrorCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                {filesWithErrorCount}
              </span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${filesWithErrorCount > 0 ? 'text-rose-600 bg-rose-500/10 border border-rose-500/20' : 'text-slate-400 dark:text-slate-500'}`}>
                {filesWithErrorCount > 0 ? 'action needed' : '0 issues'}
              </span>
            </div>
          </div>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm shrink-0 group-hover:scale-110 group-hover:-rotate-3 transition-transform ${
            filesWithErrorCount > 0 
              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200/50 dark:border-white/5'
          }`}>
            <AlertTriangle size={20} strokeWidth={2.2} />
          </div>
        </div>
        <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500">
          <span>Diagnostics</span>
          <span className={`font-extrabold ${filesWithErrorCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>
            {filesWithErrorCount > 0 ? 'Retry available' : 'Optimal'}
          </span>
        </div>
      </div>
    </div>
  );
};
