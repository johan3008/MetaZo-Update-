import React, { useState, useEffect } from 'react';
import { Calendar, Search, Loader2, Sparkles, Wand2, ArrowRight, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchCalendarEvents, fetchEventKeywords } from '../../services/geminiService';

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface CalendarGenViewProps {
  onSendToPrompt?: (text: string) => void;
}

export const CalendarGenView: React.FC<CalendarGenViewProps> = ({ onSendToPrompt }) => {
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loadingKeywordsFor, setLoadingKeywordsFor] = useState<string | null>(null);
  const [eventKeywords, setEventKeywords] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);

  useEffect(() => {
    handleGenerate();
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setGenerationProgress(0);
    setEvents([]); // Clear previous results
    
    // Simulate progress while generating
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 15;
      });
    }, 400);

    try {
      const data = await fetchCalendarEvents(selectedMonth);
      setEvents(data.events || []);
    } catch (err: any) {
      setError(err.message || "Failed to generate events");
    } finally {
      clearInterval(progressInterval);
      setGenerationProgress(100);
      setTimeout(() => setIsGenerating(false), 300);
    }
  };

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={`cal-skel-${i}`} className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm rounded-3xl p-6 border border-slate-200 dark:border-white/5 h-80 flex flex-col animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div className="flex flex-col gap-2">
              <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700/50 rounded-2xl" />
              <div className="w-16 h-3 bg-slate-200 dark:bg-slate-700/50 rounded-full" />
            </div>
            <div className="w-16 h-6 bg-slate-200 dark:bg-slate-700/50 rounded-full" />
          </div>
          <div className="w-3/4 h-8 bg-slate-200 dark:bg-slate-700/50 rounded-lg mb-3" />
          <div className="w-full h-4 bg-slate-200 dark:bg-slate-700/50 rounded-md mb-2" />
          <div className="w-5/6 h-4 bg-slate-200 dark:bg-slate-700/50 rounded-md" />
          <div className="mt-auto pt-4 border-t border-slate-200 dark:border-white/5 space-y-2">
            <div className="w-24 h-3 bg-slate-200 dark:bg-slate-700/50 rounded-md" />
            <div className="flex gap-2">
              <div className="w-12 h-5 bg-slate-200 dark:bg-slate-700/50 rounded-md" />
              <div className="w-16 h-5 bg-slate-200 dark:bg-slate-700/50 rounded-md" />
              <div className="w-14 h-5 bg-slate-200 dark:bg-slate-700/50 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const handleGenerateKeywords = async (eventName: string, commercialPotential: string) => {
    setLoadingKeywordsFor(eventName);
    try {
      const data = await fetchEventKeywords(eventName, commercialPotential);
      setEventKeywords(prev => ({
        ...prev,
        [eventName]: data.keywords
      }));
    } catch (err: any) {
      console.error("Failed to generate keywords:", err);
    } finally {
      setLoadingKeywordsFor(null);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col p-4 md:p-8 overflow-y-auto">
      {/* View Title */}
      <div className="w-full max-w-4xl mx-auto mb-6 flex items-center space-x-3">
        <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          <Calendar className="text-emerald-500" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Calendar Gen</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Stock Content Event Finder</p>
        </div>
      </div>

      {/* Search Header */}
      <div className="w-full max-w-4xl mx-auto mb-8">
        <div className="bg-white/50 dark:bg-slate-900/40 backdrop-blur-md p-6 rounded-[2rem] border border-slate-200/80 dark:border-white/5 shadow-xl relative overflow-hidden">
          {/* Progress Bar Glow */}
          {isGenerating && (
            <div 
              className="absolute top-0 left-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 transition-all duration-300 ease-out z-50 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
              style={{ width: `${generationProgress}%` }}
            />
          )}

          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Select Month
              </label>
              <div className="relative">
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  disabled={isGenerating}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-3.5 text-slate-700 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer disabled:opacity-50"
                >
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Calendar size={18} />
                </div>
              </div>
            </div>

            <div className="flex items-end pt-2 md:pt-6 w-full md:w-auto">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 text-white font-black px-8 py-4 rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center space-x-2 h-[52px]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Search size={20} />
                    <span>Find Events</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="w-full max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="flex flex-col items-center justify-center text-center py-10 space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
                  <Loader2 size={48} className="text-emerald-500 animate-spin relative" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-700 dark:text-emerald-400 uppercase tracking-tighter">
                    {generationProgress < 30 ? "Gathering International Data..." : 
                     generationProgress < 60 ? "Searching National Holidays..." : 
                     generationProgress < 90 ? "Identifying Niche Perayaan..." : "Polishing Global List..."}
                  </h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    AI is scanning {selectedMonth} for high-value stock opportunities
                  </p>
                </div>
              </div>
              <LoadingSkeleton />
            </motion.div>
          ) : error ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-center font-bold mb-6"
            >
              {error}
            </motion.div>
          ) : events.length > 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {events.map((event, idx) => (
                <motion.div
                  key={`${event.name}-${event.date}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-emerald-500/10 transition-all flex flex-col h-full"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                          <Sparkles className="text-emerald-500" size={14} />
                        </div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                          {event.location || 'Global'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                      {event.date}
                    </span>
                  </div>
                  
                  <h3 className="text-base font-black text-slate-900 dark:text-white mb-2 leading-tight">
                    {event.name}
                  </h3>
                  
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-normal leading-relaxed line-clamp-3">
                    {event.commercial_potential}
                  </p>

                  <div className="space-y-4 mt-auto">
                    {/* Event Keywords Selection */}
                    <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Focus Tags</span>
                        {!eventKeywords[event.name] ? (
                          <button 
                            onClick={() => handleGenerateKeywords(event.name, event.commercial_potential)}
                            disabled={loadingKeywordsFor === event.name}
                            className="text-[9px] flex items-center space-x-1 text-emerald-600 hover:text-emerald-700 font-bold disabled:text-slate-400"
                          >
                            {loadingKeywordsFor === event.name ? <Loader2 size={10} className="animate-spin" /> : <Tag size={10} />}
                            <span>{loadingKeywordsFor === event.name ? '...' : 'Get Tags'}</span>
                          </button>
                        ) : (
                          <button 
                            onClick={() => onSendToPrompt?.(event.name + ": " + eventKeywords[event.name].join(", "))}
                            className="text-emerald-600 font-black text-[9px] hover:text-emerald-700"
                          >
                            Copy Prompt
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {(eventKeywords[event.name] || event.suggested_topics)?.slice(0, 8).map((topic: string) => (
                          <button
                            key={topic}
                            onClick={() => onSendToPrompt?.(`${event.name}: ${topic}`)}
                            className="text-[9px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors"
                          >
                            {topic}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : !isGenerating && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 bg-white/30 dark:bg-slate-900/20 backdrop-blur-sm rounded-[3rem] border border-dashed border-slate-300 dark:border-white/10"
            >
              <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-500/20">
                <Calendar size={40} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-3">Calendar Gen</h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
                Pilih bulan dan temukan event-event penting untuk panduan pembuatan konten stock Anda.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
