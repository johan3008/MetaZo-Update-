
import React from 'react';
import { HelpCircle } from 'lucide-react';

export const HelpIcon: React.FC<{ title: string }> = ({ title }) => (
  <button 
    title={title} 
    className="text-slate-400 hover:text-violet-500 transition-colors"
  >
    <HelpCircle size={14} />
  </button>
);
