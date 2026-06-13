import React from 'react';
import { FileCode, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* CARD 1: TOTAL FILES */}
      <div className="bg-white dark:bg-[#111827] border border-[#e3e6f0]/80 dark:border-white/5 rounded-2xl shadow-md shadow-black/5 py-4 px-5 relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#7c3aed]" />
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold text-[#7c3aed] uppercase tracking-wider leading-none">
              Uploaded Queue
            </div>
            <div className="text-xl font-black text-slate-800 dark:text-white mt-1.5 leading-none">
              {filesLength} <span className="text-xs text-slate-400 font-bold">files</span>
            </div>
          </div>
          <FileCode size={24} className="text-[#7c3aed] opacity-25" />
        </div>
      </div>

      {/* CARD 2: ANALYSES COMPLETE */}
      <div className="bg-white dark:bg-[#111827] border border-[#e3e6f0]/80 dark:border-white/5 rounded-2xl shadow-md shadow-black/5 py-4 px-5 relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1cc88a]" />
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold text-[#1cc88a] uppercase tracking-wider leading-none">
              Analyses Complete
            </div>
            <div className="text-xl font-black text-slate-800 dark:text-white mt-1.5 leading-none">
              {successfulFilesCount} <span className="text-xs text-slate-400 font-bold">done</span>
            </div>
          </div>
          <CheckCircle2 size={24} className="text-[#1cc88a] opacity-25" />
        </div>
      </div>

      {/* CARD 3: PENDING CONVERSIONS */}
      <div className="bg-white dark:bg-[#111827] border border-[#e3e6f0]/80 dark:border-white/5 rounded-2xl shadow-md shadow-black/5 py-4 px-5 relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#36b9cc]" />
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold text-[#36b9cc] uppercase tracking-wider leading-none">
              Conversions Pending
            </div>
            <div className="text-xl font-black text-slate-800 dark:text-white mt-1.5 leading-none">
              {filesToGenerateCount} <span className="text-xs text-slate-400 font-bold">wait</span>
            </div>
          </div>
          <Clock size={24} className="text-[#36b9cc] opacity-25" />
        </div>
      </div>

      {/* CARD 4: ISSUES/ERRORS */}
      <div className="bg-white dark:bg-[#111827] border border-[#e3e6f0]/80 dark:border-white/5 rounded-2xl shadow-md shadow-black/5 py-4 px-5 relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#e74a3b]" />
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold text-[#e74a3b] uppercase tracking-wider leading-none">
              Processing Issues
            </div>
            <div className="text-xl font-black text-slate-800 dark:text-white mt-1.5 leading-none">
              {filesWithErrorCount} <span className="text-xs text-slate-400 font-bold">fails</span>
            </div>
          </div>
          <AlertTriangle size={24} className="text-[#e74a3b] opacity-25" />
        </div>
      </div>
    </div>
  );
};
