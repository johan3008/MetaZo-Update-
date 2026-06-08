
import React, { useState, useEffect } from 'react';
import { GitCommit, RefreshCw } from 'lucide-react';

export const SyncGitHubPanel: React.FC<{ filesLength: number }> = ({ filesLength }) => {
  const [commitMessage, setCommitMessage] = useState('');

  useEffect(() => {
    setCommitMessage(`Update: Processed ${filesLength} files at ${new Date().toLocaleTimeString()}`);
  }, [filesLength]);

  return (
    <div className="bg-white dark:bg-[#111827] border border-[#e3e6f0]/80 dark:border-white/5 rounded-lg p-4 shadow-sm">
      <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center space-x-2 mb-3">
         <GitCommit size={15} /> <span>Sync to GitHub</span>
      </h3>
      <input 
        type="text"
        className="w-full text-xs p-2 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-200"
        value={commitMessage}
        onChange={(e) => setCommitMessage(e.target.value)}
      />
      <button 
        onClick={() => alert('Syncing to GitHub: ' + commitMessage)}
        className="mt-3 w-full flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-xs font-black transition-all"
      >
        <RefreshCw size={14} />
        <span>Sync</span>
      </button>
    </div>
  );
};
