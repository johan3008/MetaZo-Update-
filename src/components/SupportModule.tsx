import React, { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { db, collection, addDoc } from '../supabase';

export const SupportModule: React.FC = () => {
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

    const handleSubmit = async () => {
        if (!message) return;
        setStatus('sending');
        try {
            await addDoc(collection(db, 'feedback'), {
                message,
                timestamp: new Date().toISOString(),
                userEmail: 'johanchrismant4@gmail.com'
            });
            setStatus('sent');
            setMessage('');
            setTimeout(() => setStatus('idle'), 3000);
        } catch (e) {
            console.error('Feedback error:', e);
            setStatus('idle');
        }
    };

    return (
        <div className="p-4 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 space-y-3">
            <h3 className="font-black flex items-center gap-2 text-slate-800 dark:text-white uppercase tracking-wider text-xs">
                <MessageSquare size={14} /> Bantuan & Feedback
            </h3>
            <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ada kendala atau saran fitur? Tulis di sini..."
                className="w-full text-xs p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 dark:text-white"
                rows={3}
            />
            <button 
                onClick={handleSubmit}
                disabled={status !== 'idle' || !message}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl flex items-center justify-center gap-2 font-bold text-xs disabled:opacity-50"
            >
                {status === 'sending' ? 'Mengirim...' : status === 'sent' ? 'Terkirim!' : 'Kirim Feedback'}
                <Send size={12} />
            </button>
        </div>
    );
};
