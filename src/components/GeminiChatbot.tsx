import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, X, MessageSquare, Minimize2, Maximize2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { chatWithGemini } from '../../services/geminiService';

export const GeminiChatbot: React.FC = () => {
    const [messages, setMessages] = useState<{role: 'user'|'model', content: string}[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen && !isMinimized) {
            scrollToBottom();
        }
    }, [messages, isOpen, isMinimized]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        
        const userMessage = input.trim();
        const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);
        
        try {
            const response = await chatWithGemini(userMessage, messages);
            setMessages([...newMessages, { role: 'model', content: response.reply }]);
        } catch (error: any) {
            console.error('Chat error:', error);
            setMessages([...newMessages, { role: 'model', content: 'Maaf, terjadi kesalahan saat berkomunikasi dengan AI. Silakan coba lagi.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => {
        if (window.confirm('Bersihkan riwayat chat?')) {
            setMessages([]);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[1000] flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ 
                            opacity: 1, 
                            y: 0, 
                            scale: 1,
                            height: isMinimized ? '40px' : '400px',
                        }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="w-[280px] sm:w-[320px] bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-xl border border-white/10 overflow-hidden mb-4 flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-3 py-2 bg-gradient-to-r from-emerald-600/20 to-slate-900 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center">
                                    <Bot className="text-emerald-400" size={14} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[10px] text-white uppercase tracking-wider">MetaZo Assistant</h3>
                                    <div className="flex items-center space-x-1">
                                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span className="text-[8px] text-emerald-400 font-bold uppercase">Online</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-0.5">
                                {messages.length > 0 && !isMinimized && (
                                    <button 
                                        onClick={clearChat}
                                        className="p-1 hover:bg-white/10 rounded-md transition-colors text-slate-400 hover:text-rose-400"
                                        title="Clear Chat"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                                <button 
                                    onClick={() => setIsMinimized(!isMinimized)}
                                    className="p-1 hover:bg-white/10 rounded-md transition-colors text-slate-400"
                                >
                                    {isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
                                </button>
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:bg-white/10 rounded-md transition-colors text-slate-400 hover:text-white"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        </div>
                        
                        {!isMinimized && (
                            <>
                                <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar bg-slate-950/40">
                                    {messages.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4 space-y-3 text-center">
                                            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center rotate-3">
                                                <Sparkles className="text-emerald-400" size={24} />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-white uppercase tracking-tighter mb-1">Ada yang bisa dibantu?</p>
                                                <p className="text-[10px] leading-relaxed text-slate-400 font-medium">Asisten MetaZo PRO siap menjawab.</p>
                                            </div>
                                            <div className="flex flex-col gap-1.5 w-full mt-2">
                                                <button onClick={() => setInput('Batch Processing?')} className="text-[9px] bg-white/5 border border-white/10 py-1.5 px-3 rounded-lg hover:bg-white/10 text-slate-300 text-left">Batch Processing?</button>
                                                <button onClick={() => setInput('Quality Check?')} className="text-[9px] bg-white/5 border border-white/10 py-1.5 px-3 rounded-lg hover:bg-white/10 text-slate-300 text-left">Quality Check?</button>
                                            </div>
                                        </div>
                                    )}
                                    {messages.map((msg, i) => (
                                        <div key={i} className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                            <div className={`mt-0.5 shrink-0 w-5 h-5 rounded flex items-center justify-center ${
                                                msg.role === 'model' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-700 text-slate-300'
                                            }`}>
                                                {msg.role === 'model' ? <Bot size={12} /> : <User size={12} />}
                                            </div>
                                            <div className={`px-3 py-2 rounded-xl text-[11px] max-w-[85%] leading-relaxed shadow-sm ${
                                                msg.role === 'user' 
                                                    ? 'bg-emerald-600 text-white rounded-tr-none' 
                                                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-white/5'
                                            }`}>
                                                {msg.role === 'model' ? (
                                                    <div className="prose prose-invert prose-p:leading-relaxed prose-p:m-0 prose-strong:text-emerald-400 prose-ul:my-1 prose-li:my-0.5 prose-headings:text-[12px] prose-headings:font-bold prose-headings:mb-1">
                                                        <Markdown>{msg.content}</Markdown>
                                                    </div>
                                                ) : (
                                                    msg.content
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {isLoading && (
                                        <div className="flex items-start gap-2">
                                            <div className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-500 flex items-center justify-center animate-pulse">
                                                <Bot size={12} />
                                            </div>
                                            <div className="px-3 py-2 rounded-xl rounded-tl-none bg-slate-800 border border-white/5 flex gap-1 items-center">
                                                <span className="w-1 h-1 bg-emerald-500/40 rounded-full animate-bounce"></span>
                                                <span className="w-1 h-1 bg-emerald-500/40 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                                <span className="w-1 h-1 bg-emerald-500/40 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                <div className="p-3 bg-white/5 border-t border-white/10">
                                    <div className="flex items-center gap-1.5 bg-slate-800 border border-white/10 rounded-xl px-1 py-1 focus-within:border-emerald-500/50 transition-all">
                                        <input 
                                            type="text" 
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                            placeholder="Tanya..."
                                            className="flex-1 bg-transparent border-none px-2 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none"
                                        />
                                        <button 
                                            onClick={handleSend}
                                            disabled={isLoading || !input.trim()}
                                            className="w-7 h-7 flex items-center justify-center bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-20 disabled:hover:bg-emerald-600 transition-all active:scale-90"
                                        >
                                            <Send size={12} />
                                        </button>
                                    </div>
                                    <p className="text-[8px] text-slate-500 text-center mt-1.5 font-medium uppercase">MetaZo Assistant (Beta)</p>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    setIsOpen(!isOpen);
                    setIsMinimized(false);
                }}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all duration-500 border-2 ${
                    isOpen 
                        ? 'bg-slate-900 border-white/10 rotate-90' 
                        : 'bg-emerald-500 border-emerald-400 hover:bg-emerald-400'
                } text-white group relative`}
            >
                {isOpen ? <X size={20} /> : <MessageSquare size={20} className="group-hover:scale-110 transition-transform" />}
                
                {!isOpen && (
                    <>
                        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 border border-emerald-600"></span>
                        </span>
                    </>
                )}
            </motion.button>
        </div>
    );
};

