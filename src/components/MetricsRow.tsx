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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* CARD 1: TOTAL FILES */}
      <div className="group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-white/5 p-4.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/5 hover:border-violet-500/30">
        <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-violet-500/10 transition-colors" />
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Uploaded Queue
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {filesLength}
              </span>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                {filesLength === 1 ? 'file' : 'files'}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shadow-sm shrink-0 group-hover:scale-110 transition-transform">
            <FileCode size={20} strokeWidth={2.2} />
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500">
          <span>Batch capacity</span>
          <span className="text-violet-600 dark:text-violet-400 font-bold">Active Workspace</span>
        </div>
      </div>

      {/* CARD 2: ANALYSES COMPLETE */}
      <div className="group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-white/5 p-4.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-500/30">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Analysis Complete
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {successfulFilesCount}
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-md">
                ready
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm shrink-0 group-hover:scale-110 transition-transform">
            <CheckCircle2 size={20} strokeWidth={2.2} />
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500">
          <span>Success rate</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
            {filesLength > 0 ? `${Math.round((successfulFilesCount / filesLength) * 100)}%` : '0%'}
          </span>
        </div>
      </div>

      {/* CARD 3: PENDING CONVERSIONS */}
      <div className="group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-white/5 p-4.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/5 hover:border-cyan-500/30">
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/10 transition-colors" />
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pending Queue
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {filesToGenerateCount}
              </span>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                waiting
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-sm shrink-0 group-hover:scale-110 transition-transform">
            <Clock size={20} strokeWidth={2.2} />
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500">
          <span>AI backlog</span>
          <span className="text-cyan-600 dark:text-cyan-400 font-bold">
            {filesToGenerateCount > 0 ? `${filesToGenerateCount} to run` : 'Idle'}
          </span>
        </div>
      </div>

      {/* CARD 4: ISSUES/ERRORS */}
      <div className={`group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl p-4.5 ${
        filesWithErrorCount > 0 
          ? 'border-rose-500/40 hover:border-rose-500 hover:shadow-rose-500/10' 
          : 'border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'
      }`}>
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/10 transition-colors" />
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={`w-2 h-2 rounded-full ${filesWithErrorCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Processing Errors
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight ${filesWithErrorCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                {filesWithErrorCount}
              </span>
              <span className={`text-xs font-bold ${filesWithErrorCount > 0 ? 'text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-md' : 'text-slate-400'}`}>
                {filesWithErrorCount > 0 ? 'requires retry' : 'clean'}
              </span>
            </div>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 group-hover:scale-110 transition-transform ${
            filesWithErrorCount > 0 
              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}>
            <AlertTriangle size={20} strokeWidth={2.2} />
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500">
          <span>Quality status</span>
          <span className={`font-bold ${filesWithErrorCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
            {filesWithErrorCount > 0 ? 'Action required' : 'All clear'}
          </span>
        </div>
      </div>
    </div>
  );
};
