import React, { useState, useEffect, useRef } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, query, orderBy, addDoc, serverTimestamp, onSnapshot, 
  setDoc, doc, where, limit, getDocs, updateDoc 
} from 'firebase/firestore';
import { 
  Send, Search, MessageCircle, User, Globe, Users, ArrowLeft, 
  Clock, Sparkles, Shield, AlertCircle 
} from 'lucide-react';
import { motion } from 'motion/react';

interface ChatViewProps {
  t: any;
  uiLanguage: 'en' | 'id';
  currentUser: any;
  preselectedPeer?: UserProfile | null;
  onPeerChange?: (peer: UserProfile | null) => void;
  onMarkRead?: (type: 'global' | 'direct', peerId?: string) => void;
}

interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  lastSeen?: { toDate: () => Date } | any;
}

interface Message {
  id: string;
  senderUid: string;
  senderEmail: string;
  senderName: string;
  text: string;
  timestamp: any;
}

interface ChatRoom {
  id: string;
  user1: string;
  user2: string;
  user1Email: string;
  user2Email: string;
  user1Name: string;
  user2Name: string;
  lastMessage?: string;
  lastMessageTime?: any;
}

export const ChatView: React.FC<ChatViewProps> = ({ 
  t, 
  uiLanguage, 
  currentUser,
  preselectedPeer,
  onPeerChange,
  onMarkRead
}) => {
  // Active Tab: 'global' | 'direct'
  const [activeTab, setActiveTab] = useState<'global' | 'direct'>('global');
  
  // All registered users (excluding current user)
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Currently selected private peer user to chat with
  const [selectedPeer, setSelectedPeer] = useState<UserProfile | null>(null);

  // Sync selectedPeer with preselectedPeer prop
  useEffect(() => {
    if (preselectedPeer !== undefined) {
      if (preselectedPeer) {
        setSelectedPeer(preselectedPeer);
        setActiveTab('direct');
        setIsMobileListOpen(false);
      } else {
        setSelectedPeer(null);
      }
    }
  }, [preselectedPeer]);

  // Messages state
  const [globalMessages, setGlobalMessages] = useState<Message[]>([]);
  const [directMessages, setDirectMessages] = useState<Message[]>([]);

  // Input text
  const [messageText, setMessageText] = useState('');
  
  // Active DM Chat rooms/conversations
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  
  // UI helpers
  const [isMobileListOpen, setIsMobileListOpen] = useState(true);
  const [loading, setLoading] = useState({ users: true, global: true, direct: false });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const getInitials = (name?: string, email?: string) => {
    const text = name || email || 'US';
    return text.substring(0, 2).toUpperCase();
  };

  const isOnline = (user: UserProfile) => {
    if (!user.lastSeen) return false;
    let lastSeenDate: Date;
    if (typeof user.lastSeen.toDate === 'function') {
      lastSeenDate = user.lastSeen.toDate();
    } else {
      lastSeenDate = new Date(user.lastSeen);
    }
    const diffMs = Date.now() - lastSeenDate.getTime();
    return diffMs < 5 * 60 * 1000; // 5 minutes window
  };

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Sync unread marks with parents on tab shifts or message arrivals
  useEffect(() => {
    if (activeTab === 'global') {
      onMarkRead?.('global');
    } else if (activeTab === 'direct' && selectedPeer) {
      onMarkRead?.('direct', selectedPeer.id);
    }
  }, [activeTab, selectedPeer, globalMessages.length, directMessages.length]);

  // 1. Fetch Global Messages
  useEffect(() => {
    if (!currentUser) {
      setGlobalMessages([]);
      setLoading(prev => ({ ...prev, global: false }));
      return;
    }

    setLoading(prev => ({ ...prev, global: true }));
    const globalMessagesRef = collection(db, 'global_messages');
    const q = query(globalMessagesRef, orderBy('timestamp', 'asc'), limit(150));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        msgs.push({
          id: docSnap.id,
          senderUid: d.senderUid,
          senderEmail: d.senderEmail,
          senderName: d.senderName || '',
          text: d.text || '',
          timestamp: d.timestamp
        });
      });
      setGlobalMessages(msgs);
      setLoading(prev => ({ ...prev, global: false }));
      setTimeout(scrollToBottom, 200);
    }, (error) => {
      console.error("Failed to load global messages:", error);
      handleFirestoreError(error, OperationType.LIST, 'global_messages');
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 2. Fetch Users List
  useEffect(() => {
    if (!currentUser) return;
    setLoading(prev => ({ ...prev, users: true }));
    const usersCollection = collection(db, 'users');

    const unsubscribe = onSnapshot(usersCollection, (snapshot) => {
      const uList: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        if (docSnap.id === currentUser.uid) return; // skip self
        const d = docSnap.data();
        uList.push({
          id: docSnap.id,
          email: d.email || '',
          displayName: d.displayName || '',
          lastSeen: d.lastSeen
        });
      });
      setUsers(uList);
      setLoading(prev => ({ ...prev, users: false }));
    }, (error) => {
      console.error("Failed to load users list:", error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Search filter
  useEffect(() => {
    const qLower = searchQuery.toLowerCase().trim();
    if (!qLower) {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(
        users.filter(u => 
          u.email.toLowerCase().includes(qLower) || 
          (u.displayName && u.displayName.toLowerCase().includes(qLower))
        )
      );
    }
  }, [searchQuery, users]);

  // 3. Fetch Active DM Chat rooms for the current user
  useEffect(() => {
    if (!currentUser) return;
    const roomsCollection = collection(db, 'chats');
    const q1 = query(roomsCollection, where('user1', '==', currentUser.uid));
    const q2 = query(roomsCollection, where('user2', '==', currentUser.uid));

    let activeRooms: Record<string, ChatRoom> = {};

    const handleRoomData = (snapshot: any) => {
      snapshot.forEach((docSnap: any) => {
        const d = docSnap.data();
        activeRooms[docSnap.id] = {
          id: docSnap.id,
          user1: d.user1,
          user2: d.user2,
          user1Email: d.user1Email || '',
          user2Email: d.user2Email || '',
          user1Name: d.user1Name || '',
          user2Name: d.user2Name || '',
          lastMessage: d.lastMessage || '',
          lastMessageTime: d.lastMessageTime
        };
      });
      // Sort rooms by lastMessageTime descending
      const sorted = Object.values(activeRooms).sort((a, b) => {
        const timeA = a.lastMessageTime?.toDate ? a.lastMessageTime.toDate().getTime() : 0;
        const timeB = b.lastMessageTime?.toDate ? b.lastMessageTime.toDate().getTime() : 0;
        return timeB - timeA;
      });
      setChatRooms(sorted);
    };

    const unsub1 = onSnapshot(q1, handleRoomData);
    const unsub2 = onSnapshot(q2, handleRoomData);

    return () => {
      unsub1();
      unsub2();
    };
  }, [currentUser]);

  // 4. Listen to DM thread messages when a peer is selected
  useEffect(() => {
    if (!currentUser || !selectedPeer) {
      setDirectMessages([]);
      return;
    }
    
    setLoading(prev => ({ ...prev, direct: true }));

    // Deterministic threadId
    const threadId = currentUser.uid < selectedPeer.id 
      ? `${currentUser.uid}_${selectedPeer.id}`
      : `${selectedPeer.id}_${currentUser.uid}`;

    const dmRef = collection(db, 'chats', threadId, 'messages');
    const q = query(dmRef, orderBy('timestamp', 'asc'), limit(150));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        msgs.push({
          id: docSnap.id,
          senderUid: d.senderUid,
          senderEmail: d.senderEmail,
          senderName: d.senderName || '',
          text: d.text || '',
          timestamp: d.timestamp
        });
      });
      setDirectMessages(msgs);
      setLoading(prev => ({ ...prev, direct: false }));
      setTimeout(scrollToBottom, 200);
    }, (error) => {
      console.error("Failed to load direct messages:", error);
      handleFirestoreError(error, OperationType.GET, `chats/${threadId}`);
    });

    return () => unsubscribe();
  }, [currentUser, selectedPeer]);

  // 5. Send message action
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const txt = messageText.trim();
    if (!txt || !currentUser) return;

    setMessageText('');

    try {
      if (activeTab === 'global') {
        const globalMessagesRef = collection(db, 'global_messages');
        await addDoc(globalMessagesRef, {
          senderUid: currentUser.uid,
          senderEmail: currentUser.email || '',
          senderName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
          text: txt,
          timestamp: serverTimestamp()
        });
      } else {
        if (!selectedPeer) return;

        const threadId = currentUser.uid < selectedPeer.id 
          ? `${currentUser.uid}_${selectedPeer.id}`
          : `${selectedPeer.id}_${currentUser.uid}`;

        // Ensure room doc exists or is updated
        const roomDocRef = doc(db, 'chats', threadId);
        await setDoc(roomDocRef, {
          user1: currentUser.uid,
          user2: selectedPeer.id,
          user1Email: currentUser.email || '',
          user2Email: selectedPeer.email,
          user1Name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
          user2Name: selectedPeer.displayName || selectedPeer.email.split('@')[0] || 'User',
          lastMessage: txt,
          lastMessageTime: serverTimestamp()
        }, { merge: true });

        // Add to subcollection
        const messagesSubRef = collection(db, 'chats', threadId, 'messages');
        await addDoc(messagesSubRef, {
          senderUid: currentUser.uid,
          senderEmail: currentUser.email || '',
          senderName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
          text: txt,
          timestamp: serverTimestamp()
        });
      }
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error("Failed to post message:", err);
    }
  };

  const handleStartChatWithUser = (user: UserProfile) => {
    setSelectedPeer(user);
    onPeerChange?.(user);
    setActiveTab('direct');
    setIsMobileListOpen(false); // On mobile, view the active feed
  };

  const activeMessages = activeTab === 'global' ? globalMessages : directMessages;
  const isDirectMode = activeTab === 'direct';

  return (
    <div id="mz-account-chat-view" className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-115px)] rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden relative shadow-lg">
      
      {/* 2. CHAT CONTAINER LAYOUT */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* LEFT COLUMN: NAVIGATION, ACTIVE THREADS AND USER DISCOVERY */}
        <div className={`w-full md:w-80 shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/30 dynamic-sidebar ${
          !isMobileListOpen && isDirectMode && selectedPeer ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Tabs header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => { setActiveTab('global'); setSelectedPeer(null); onPeerChange?.(null); }}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-black transition-all ${
                  activeTab === 'global' 
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Globe size={13} />
                <span>{uiLanguage === 'id' ? 'Chat Global' : 'Global Chat'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('direct')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-black transition-all ${
                  activeTab === 'direct' 
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Users size={13} />
                <span>{uiLanguage === 'id' ? 'Pesan Langsung' : 'Direct Messages'}</span>
              </button>
            </div>

            {/* Quick search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={uiLanguage === 'id' ? 'Cari mitra chat...' : 'Search accounts...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-extrabold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {/* Direct message sections */}
            {isDirectMode ? (
              <>
                {/* Active Discussions / Rooms */}
                <div className="px-2 pb-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    {uiLanguage === 'id' ? 'Diskusi Aktif' : 'Active Chats'}
                  </p>
                  
                  {chatRooms.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic px-2 py-1">
                      {uiLanguage === 'id' ? 'Belum ada obrolan.' : 'No active discussions.'}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {chatRooms.map((room) => {
                        const isPartnerUser1 = room.user2 === currentUser?.uid;
                        const partnerEmail = isPartnerUser1 ? room.user1Email : room.user2Email;
                        const partnerName = isPartnerUser1 ? room.user1Name : room.user2Name;
                        const partnerId = isPartnerUser1 ? room.user1 : room.user2;

                        const isCurrentlySelected = selectedPeer?.id === partnerId;

                        return (
                          <button
                            key={room.id}
                            onClick={() => handleStartChatWithUser({
                              id: partnerId,
                              email: partnerEmail,
                              displayName: partnerName
                            })}
                            className={`w-full text-left flex items-center space-x-3 p-3.5 rounded-2xl transition-all ${
                              isCurrentlySelected
                                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-350'
                            }`}
                          >
                            <div className="w-9 h-9 bg-violet-600/10 dark:bg-violet-400/10 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-800">
                              <span className="text-xs font-black text-violet-500">
                                {getInitials(partnerName, partnerEmail)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold truncate pr-1">
                                  {partnerName || partnerEmail.split('@')[0]}
                                </span>
                              </div>
                              <p className={`text-[10px] truncate ${isCurrentlySelected ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400'}`}>
                                {room.lastMessage || 'Sent a message'}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Available accounts in the system */}
                <div className="px-2 pt-2 border-t border-slate-200 dark:border-slate-800/60 mt-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    {uiLanguage === 'id' ? 'Pengguna Lainnya' : 'Other Members'}
                  </p>
                  
                  {loading.users ? (
                    <div className="flex items-center justify-center py-4 text-xs text-slate-400 gap-2">
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      <span>{uiLanguage === 'id' ? 'Memuat pengguna...' : 'Loading accounts...'}</span>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic px-2 py-1">
                      {uiLanguage === 'id' ? 'Tidak ada pengguna ditemukan.' : 'No other users found.'}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {filteredUsers.map((u) => {
                        const active = isOnline(u);
                        return (
                          <button
                            key={u.id}
                            onClick={() => handleStartChatWithUser(u)}
                            className="w-full text-left flex items-center space-x-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-all"
                          >
                            <div className="relative shrink-0">
                              <div className="w-8 h-8 bg-slate-250/20 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-800">
                                <span className="text-[11px] font-black">{getInitials(u.displayName, u.email)}</span>
                              </div>
                              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-950 ${
                                active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                              }`} />
                            </div>
                            <div className="shrink-1 min-w-0">
                              <p className="text-xs font-bold truncate text-slate-900 dark:text-white">
                                {u.displayName || u.email.split('@')[0]}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              // GLOBAL TAB Side panel: simply lists active online accounts
              <div className="px-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                  {uiLanguage === 'id' ? 'Pengguna Online' : 'Online Members'}
                </p>
                {users.filter(isOnline).length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic px-2">
                    {uiLanguage === 'id' ? 'Hanya Anda yang online saat ini.' : 'Only you are online.'}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {users.filter(isOnline).map((u) => (
                      <div key={u.id} className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-900/40">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                          {u.displayName || u.email.split('@')[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE MESSAGING CHAT FEED */}
        <div className={`flex-1 flex flex-col overflow-hidden bg-slate-50/20 dark:bg-slate-900/10 ${
          isMobileListOpen && isDirectMode && !selectedPeer ? 'hidden md:flex' : 'flex'
        }`}>
          
          {/* Header Bar */}
          <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm z-10">
            <div className="flex items-center space-x-3 min-w-0">
              {/* Back Button for mobile peer-chat */}
              {isDirectMode && selectedPeer && (
                <button
                  onClick={() => { setIsMobileListOpen(true); setSelectedPeer(null); onPeerChange?.(null); }}
                  className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white md:hidden mr-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                >
                  <ArrowLeft size={16} />
                </button>
              )}

              {isDirectMode && selectedPeer ? (
                <>
                  <div className="w-8 h-8 bg-violet-600/10 dark:bg-violet-400/10 border border-violet-500/10 rounded-lg flex items-center justify-center shrink-0">
                    <User size={14} className="text-violet-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {selectedPeer.displayName || selectedPeer.email.split('@')[0]}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{selectedPeer.email}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 bg-gradient-to-br from-[#7c3aed] to-[#224abe] rounded-lg flex items-center justify-center shrink-0 shadow-md">
                    <Globe size={14} className="text-white animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">{uiLanguage === 'id' ? 'Chat Global' : 'Global Discussion Channel'}</h3>
                    <p className="text-[9px] text-emerald-400 font-extrabold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      {uiLanguage === 'id' ? 'Mendukung Komunikasi Real-Time' : 'Live Multi-Account Room'}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-md flex items-center gap-1">
                <Sparkles size={10} className="text-amber-500" />
                {activeTab === 'global' ? 'Broadcasting' : 'Secure P2P'}
              </span>
            </div>
          </div>

          {/* Messages Feed View */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {isDirectMode && !selectedPeer ? (
              // DM Select account placeholder
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <MessageCircle size={48} className="text-slate-300 dark:text-slate-800 mb-3 animate-bounce" />
                <h4 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-widest">{uiLanguage === 'id' ? 'Pilih Anggota Mitra' : 'Select Discussion Partner'}</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                  {uiLanguage === 'id' ? 'Pilih salah satu akun di sebelah kiri untuk mulai mengobrol secara langsung dan pribadi.' : 'Select an active member from the left panel to begin private messaging.'}
                </p>
                <button
                  onClick={() => setIsMobileListOpen(true)}
                  className="mt-4 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black md:hidden"
                >
                  {uiLanguage === 'id' ? 'Lihat Anggota' : 'Browse Members'}
                </button>
              </div>
            ) : (
              <>
                {/* Information Alert bar */}
                <div className="p-3 bg-violet-500/[0.04] border border-violet-500/10 rounded-2xl flex items-start gap-2.5">
                  <AlertCircle size={14} className="text-violet-500 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                    {uiLanguage === 'id' 
                      ? 'Gunakan saluran komunikasi ini untuk berdiskusi standar antar-akun. Seluruh pesan terunduh dan sinkron secara real-time di seluruh sesi aktif.' 
                      : 'Standard community protocol. Messages propagate immediately across all accounts.'}
                  </p>
                </div>

                {/* Empty State messages list */}
                {activeMessages.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center opacity-60">
                    <MessageCircle size={24} className="text-slate-300 dark:text-slate-700 mb-1" />
                    <p className="text-slate-400 text-xs italic">
                      {uiLanguage === 'id' ? 'Belum ada pesan. Kirim pesan pertama!' : 'No messages yet. Say hello!'}
                    </p>
                  </div>
                ) : (
                  activeMessages.map((m) => {
                    const isMe = m.senderUid === currentUser?.uid;
                    const displayTime = m.timestamp?.toDate 
                      ? m.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                      : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                      >
                        {/* Member identity name */}
                        {!isMe && (
                          <span className="text-[10px] font-black text-slate-400/80 mb-1 pl-1 truncate max-w-xs">
                            {m.senderName || m.senderEmail.split('@')[0]}
                          </span>
                        )}

                        {/* Message box */}
                        <div className={`p-3.5 rounded-2xl text-[12px] font-medium leading-relaxed break-words relative overflow-hidden transition-all shadow-sm ${
                          isMe 
                            ? 'bg-slate-900 border border-slate-800 text-white rounded-br-none dark:bg-slate-100 dark:border-slate-200 dark:text-slate-900' 
                            : 'bg-white border border-slate-200/60 text-slate-800 rounded-bl-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100'
                        }`}>
                          <p>{m.text}</p>
                          <span className={`text-[8.5px] block text-right mt-1.5 opacity-60 font-mono`}>
                            {displayTime}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                {/* Scroll Anchor */}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Messages Send Box */}
          {(!isDirectMode || selectedPeer) && (
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0 flex items-center gap-2">
              <input
                type="text"
                placeholder={uiLanguage === 'id' ? 'Ketik pesan Anda...' : 'Type your message...'}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                maxLength={600}
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold px-4 py-3 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:bg-white dark:focus:bg-slate-950 transition-all font-sans"
              />
              <button
                type="submit"
                disabled={!messageText.trim()}
                className={`p-3 rounded-2xl shrink-0 flex items-center justify-center transition-all ${
                  messageText.trim()
                    ? 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 scale-100 active:scale-95 shadow-md shadow-black/10'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-700 cursor-not-allowed'
                }`}
              >
                <Send size={15} />
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
