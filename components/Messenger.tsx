import React, { useState, useEffect, useRef } from 'react';
import { User, Chat, Message } from '../types';
import { 
  Menu, Search, Settings, Send, Paperclip, Star, 
  Sparkles, Gift, MoreVertical, CheckCheck, 
  Crown, X, Download, UserPlus, Heart,
  Moon, Sun, Image as ImageIcon, Users, Megaphone,
  TrendingUp, Eye, ThumbsUp, Play, Smile, Sticker,
  Edit3, Link, Lock, Globe, Trash2, Camera, Save, ArrowLeft,
  Check, Palette, Layout, Phone, Video, Mic, MicOff, VideoOff, PhoneOff, Coins
} from 'lucide-react';
import { generateAIResponse } from '../services/geminiService';

interface MessengerProps {
  currentUser: User;
  onUpdateUser: (user: User) => void;
  onLogout: () => void;
}

const GLOBAL_MSG_KEY = 'spark_global_messages_v1';
const USERS_DB_KEY = 'spark_users_db';

const EMOJIS = ['😀', '😂', '🥰', '😎', '😭', '😡', '👍', '👎', '🔥', '❤️', '🎉', '💩', '🤡', '👻', '👽', '🤖', '👋', '🙏', '💪', '🧠'];
const WALLPAPER_COLORS = ['#0f172a', '#1e293b', '#312e81', '#4c1d95', '#701a75', '#831843', '#000000'];
// Updated with Meme Stickers
const STICKERS = [
  'https://cdn-icons-png.flaticon.com/512/9376/9376991.png', 
  'https://cdn-icons-png.flaticon.com/512/9376/9376974.png', 
  'https://cdn-icons-png.flaticon.com/512/4193/4193246.png', 
  'https://cdn-icons-png.flaticon.com/512/742/742751.png',
  'https://media.sticker.market/live/stickers/sticker-pack-meme-cats-1/sticker-1.png',
  'https://media.sticker.market/live/stickers/sticker-pack-meme-cats-1/sticker-2.png',
  'https://media.sticker.market/live/stickers/sticker-pack-meme-cats-1/sticker-10.png',
  'https://media.sticker.market/live/stickers/sticker-pack-meme-cats-1/sticker-8.png'
];

const INITIAL_BOTS: Chat[] = [
  {
    id: 'ai-bot',
    name: 'Spark AI',
    avatarUrl: 'https://ui-avatars.com/api/?name=Spark+AI&background=0b99ff&color=fff',
    lastMessage: 'Нажмите START для начала',
    unreadCount: 0,
    type: 'bot',
    messages: [],
    hasStarted: false
  },
  {
    id: 'spark_service',
    name: 'Spark Service',
    avatarUrl: 'https://ui-avatars.com/api/?name=Service&background=22c55e&color=fff',
    lastMessage: 'Нажмите START для начала',
    unreadCount: 1,
    type: 'bot',
    messages: [],
    hasStarted: false
  }
];

export const Messenger: React.FC<MessengerProps> = ({ currentUser, onUpdateUser, onLogout }) => {
  // State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [chats, setChats] = useState<Chat[]>([]); 
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & UI Toggles
  const [showSettings, setShowSettings] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showStarsModal, setShowStarsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [floatingMode, setFloatingMode] = useState(false); 
  const [chatInfoOpen, setChatInfoOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  
  // Call State
  const [isCalling, setIsCalling] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  
  // Settings Editing State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [settingsTab, setSettingsTab] = useState<'main' | 'wallpaper' | 'profile'>('main');

  // Create Channel/Group Wizard State
  const [channelStep, setChannelStep] = useState(1);
  const [newChannelData, setNewChannelData] = useState<{
    name: string;
    description: string;
    avatarUrl: string;
    link: string;
    privacy: 'public' | 'private';
    type: 'channel' | 'group';
  }>({ name: '', description: '', avatarUrl: '', link: '', privacy: 'public', type: 'channel' });

  // Real Database Users State
  const [dbUsers, setDbUsers] = useState<User[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const customStatusInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const chatsRef = useRef<Chat[]>([]); 

  const activeChat = chats.find(c => c.id === activeChatId);
  const viewingProfileUser = dbUsers.find(u => u.phoneNumber === viewingProfileId);
  const viewingProfileChat = chats.find(c => c.id === viewingProfileId);

  // --- 1. Load Global Users ---
  useEffect(() => {
    const loadDb = () => {
      try {
        const storedUsers = localStorage.getItem(USERS_DB_KEY);
        if (storedUsers) {
           setDbUsers(JSON.parse(storedUsers));
        }
      } catch (e) { console.error(e); }
    };
    loadDb();
  }, [showSettings, viewingProfileId, currentUser.stars]); // Refresh when stars change

  // --- 2. Sync Logic ---
  const syncChats = () => {
    try {
      const storedMsgs = localStorage.getItem(GLOBAL_MSG_KEY);
      const allMessages: Message[] = storedMsgs ? JSON.parse(storedMsgs) : [];

      const myMessages = allMessages.filter(m => 
        m.senderId === currentUser.phoneNumber || m.receiverId === currentUser.phoneNumber
      );

      const chatsMap: Record<string, Message[]> = {};
      
      myMessages.forEach(msg => {
        const partnerId = msg.senderId === currentUser.phoneNumber ? msg.receiverId : msg.senderId;
        if (!partnerId) return; 

        if (!chatsMap[partnerId]) chatsMap[partnerId] = [];
        chatsMap[partnerId].push(msg);
      });

      const updatedChats: Chat[] = [];

      INITIAL_BOTS.forEach(bot => {
        const botMsgs = chatsMap[bot.id] || [];
        updatedChats.push({
          ...bot,
          messages: botMsgs,
          lastMessage: botMsgs.length > 0 ? (botMsgs[botMsgs.length-1].text || 'Media') : bot.lastMessage,
          hasStarted: botMsgs.length > 0
        });
      });

      Object.keys(chatsMap).forEach(partnerId => {
        if (partnerId === 'ai-bot' || partnerId === 'spark_service') return;

        const msgs = chatsMap[partnerId];
        const usersDbStr = localStorage.getItem(USERS_DB_KEY);
        const usersDb: User[] = usersDbStr ? JSON.parse(usersDbStr) : [];
        const partnerUser = usersDb.find(u => u.phoneNumber === partnerId);
        // Groups/Channels start with "new_"
        const isGroupOrChannel = partnerId.startsWith('new_');

        let chatName = partnerUser ? `${partnerUser.firstName} ${partnerUser.lastName || ''}` : partnerId;
        let chatAvatar = partnerUser ? partnerUser.avatarUrl : `https://ui-avatars.com/api/?name=${partnerId}`;
        let chatType: 'private' | 'group' | 'channel' | 'bot' = isGroupOrChannel ? 'channel' : 'private';

        const existingStateChat = chatsRef.current.find(c => c.id === partnerId);
        if (existingStateChat) {
             chatName = existingStateChat.name;
             chatAvatar = existingStateChat.avatarUrl || chatAvatar;
             chatType = existingStateChat.type;
        }

        updatedChats.push({
          id: partnerId,
          name: chatName,
          avatarUrl: chatAvatar,
          lastMessage: msgs.length > 0 ? (msgs[msgs.length - 1].text || (msgs[msgs.length - 1].type === 'sticker' ? 'Sticker' : 'Media')) : '',
          unreadCount: 0,
          type: chatType,
          messages: msgs,
          subscribers: existingStateChat?.subscribers,
          isAdmin: existingStateChat?.isAdmin,
          description: existingStateChat?.description,
          link: existingStateChat?.link,
          privacy: existingStateChat?.privacy
        });
      });

      chatsRef.current.forEach(c => {
         if (!updatedChats.find(uc => uc.id === c.id)) {
            updatedChats.push(c);
         }
      });

      updatedChats.sort((a, b) => {
         const timeA = a.messages.length > 0 ? a.messages[a.messages.length - 1].timestamp : 0;
         const timeB = b.messages.length > 0 ? b.messages[b.messages.length - 1].timestamp : 0;
         return timeB - timeA;
      });

      setChats(updatedChats);
      chatsRef.current = updatedChats;

    } catch (e) {
      console.error("Sync error", e);
    }
  };

  useEffect(() => {
    syncChats();
    const interval = setInterval(syncChats, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages.length, activeChatId]);

  // --- Handlers ---
  const saveMessageToGlobal = (msg: Message) => {
    const storedMsgs = localStorage.getItem(GLOBAL_MSG_KEY);
    const allMessages: Message[] = storedMsgs ? JSON.parse(storedMsgs) : [];
    allMessages.push(msg);
    localStorage.setItem(GLOBAL_MSG_KEY, JSON.stringify(allMessages));
  };

  const handleDeleteMessage = (messageId: string) => {
    const storedMsgs = localStorage.getItem(GLOBAL_MSG_KEY);
    let allMessages: Message[] = storedMsgs ? JSON.parse(storedMsgs) : [];
    allMessages = allMessages.filter(m => m.id !== messageId);
    localStorage.setItem(GLOBAL_MSG_KEY, JSON.stringify(allMessages));
    syncChats();
  };

  const handleSendMessage = async (type: 'text' | 'sticker' = 'text', content?: string) => {
    if ((!content && !inputText.trim()) || !activeChatId) return;

    // Check for Paid Messages
    const receiver = dbUsers.find(u => u.phoneNumber === activeChatId);
    let updatedSender = { ...currentUser };

    if (receiver && receiver.messagePrice && receiver.messagePrice > 0 && receiver.phoneNumber !== currentUser.phoneNumber && !receiver.isDev) {
        if (currentUser.stars < receiver.messagePrice) {
            alert(`У этого пользователя платные сообщения. Стоимость: ${receiver.messagePrice} звезд. У вас недостаточно средств.`);
            return;
        }
        
        // Confirm transaction
        const confirmPay = window.confirm(`Отправка сообщения стоит ${receiver.messagePrice} звезд. Отправить?`);
        if (!confirmPay) return;

        // Deduct from sender
        updatedSender.stars -= receiver.messagePrice;
        updateAndSaveUser(updatedSender);
        
        // Add to receiver
        const newReceiver = { ...receiver, stars: receiver.stars + receiver.messagePrice };
        // We need to update receiver in DB properly
        const usersDbStr = localStorage.getItem(USERS_DB_KEY);
        const usersDb: User[] = usersDbStr ? JSON.parse(usersDbStr) : [];
        const rIndex = usersDb.findIndex(u => u.phoneNumber === receiver.phoneNumber);
        if (rIndex >= 0) {
            usersDb[rIndex] = newReceiver;
            localStorage.setItem(USERS_DB_KEY, JSON.stringify(usersDb));
            setDbUsers(usersDb); // Update local state so we don't query old data
        }
    }

    const msgContent = content || inputText;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUser.phoneNumber,
      receiverId: activeChatId,
      text: type === 'text' ? msgContent : undefined,
      imageUrl: type === 'sticker' ? msgContent : undefined,
      timestamp: Date.now(),
      isRead: false,
      type: type,
      views: 1
    };

    saveMessageToGlobal(newMessage);
    setInputText('');
    setShowEmojiPicker(false);
    syncChats();

    // AI Logic
    if (activeChat?.type === 'bot' && activeChat.id === 'ai-bot' && type === 'text') {
       setTimeout(async () => {
         const history = activeChat.messages.map(m => ({
           role: m.senderId === currentUser.phoneNumber ? 'user' as const : 'model' as const,
           text: m.text || ''
         }));
         history.push({ role: 'user', text: msgContent });
         
         const aiText = await generateAIResponse(history, msgContent);
         
         const botMessage: Message = {
           id: (Date.now() + 1).toString(),
           senderId: activeChatId,
           receiverId: currentUser.phoneNumber,
           text: aiText,
           timestamp: Date.now(),
           isRead: true,
           type: 'text'
         };
         saveMessageToGlobal(botMessage);
         syncChats();
       }, 800);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isSticker: boolean = false) => {
    if (e.target.files && e.target.files[0] && activeChatId) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        if (isSticker) {
           handleSendMessage('sticker', base64);
        } else {
           const msg: Message = {
             id: Date.now().toString(),
             senderId: currentUser.phoneNumber,
             receiverId: activeChatId,
             imageUrl: base64,
             timestamp: Date.now(),
             isRead: false,
             type: 'image',
             views: 1
           };
           saveMessageToGlobal(msg);
           syncChats();
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleWallpaperChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
       const reader = new FileReader();
       reader.onload = (ev) => {
          if (ev.target?.result) {
             const updatedUser = { ...currentUser, wallpaper: ev.target.result as string };
             updateAndSaveUser(updatedUser);
          }
       };
       reader.readAsDataURL(e.target.files[0]);
    }
  };

  const updateAndSaveUser = (updatedUser: User) => {
    onUpdateUser(updatedUser);
    const usersDbStr = localStorage.getItem(USERS_DB_KEY);
    const usersDb: User[] = usersDbStr ? JSON.parse(usersDbStr) : [];
    const index = usersDb.findIndex(u => u.phoneNumber === currentUser.phoneNumber);
    if (index >= 0) {
      usersDb[index] = updatedUser;
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(usersDb));
    }
  };

  // --- CHANNEL WIZARD ---
  const finalizeChannelCreation = () => {
    const newChat: Chat = {
      id: `new_${Date.now()}`,
      name: newChannelData.name,
      avatarUrl: newChannelData.avatarUrl || `https://ui-avatars.com/api/?name=${newChannelData.name}&background=random`,
      lastMessage: newChannelData.type === 'channel' ? 'Канал создан' : 'Группа создана',
      unreadCount: 0,
      type: newChannelData.type,
      isAdmin: true,
      subscribers: 1,
      messages: [],
      description: newChannelData.description,
      link: newChannelData.link ? `t.me/${newChannelData.link}` : undefined,
      privacy: newChannelData.privacy
    };
    setChats([newChat, ...chats]);
    chatsRef.current = [newChat, ...chatsRef.current];
    setShowCreateModal(false);
    setActiveChatId(newChat.id);
    setChannelStep(1);
    setNewChannelData({ name: '', description: '', avatarUrl: '', link: '', privacy: 'public', type: 'channel' });
  };

  // --- CALL LOGIC ---
  useEffect(() => {
    if (isCalling && myVideoRef.current) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                if (myVideoRef.current) myVideoRef.current.srcObject = stream;
            })
            .catch(err => console.error("Error accessing media devices.", err));
    }
    return () => {
        // Cleanup streams if needed
    }
  }, [isCalling]);

  // --- STYLES ---
  const glassPanel = "bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]";
  const glassInput = "bg-black/20 border border-white/5 focus:border-blue-500/50 transition-colors backdrop-blur-sm shadow-inner";
  const glassButton = "border border-white/10 shadow-lg hover:shadow-blue-500/20 active:translate-y-0.5 transition-all";
  
  const wallpaperStyle = currentUser.wallpaper ? {
     backgroundImage: currentUser.wallpaper.startsWith('#') ? 'none' : `url(${currentUser.wallpaper})`,
     backgroundColor: currentUser.wallpaper.startsWith('#') ? currentUser.wallpaper : undefined,
     backgroundSize: 'cover',
     backgroundPosition: 'center',
  } : {};

  const renderStatus = (userObj?: User) => {
     if (!userObj?.statusEmoji) return null;
     if (userObj.statusEmoji.startsWith('data:') || userObj.statusEmoji.startsWith('http')) {
        return <img src={userObj.statusEmoji} className="w-5 h-5 object-contain inline-block ml-1" alt="status" />;
     }
     return <span className="text-sm ml-1">{userObj.statusEmoji}</span>;
  };

  const handleDownloadApp = () => {
    alert("Ссылка на скачивание отправлена!");
  };

  return (
    <div className={`flex h-screen overflow-hidden relative text-white transition-colors duration-300 bg-slate-950 font-sans`}>
      
      {/* --- Sidebar (Glass) --- */}
      <div className={`${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-20 w-80 h-full ${glassPanel} border-r border-white/10 transition-transform duration-300 flex flex-col`}>
        {/* Header */}
        <div className={`p-4 border-b border-white/5 flex justify-between items-center bg-white/5`}>
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => { setShowSettings(true); setIsMobileMenuOpen(false); }}
          >
             <div className="relative">
                <Menu className="text-slate-400" />
                {currentUser.isPremium && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>}
             </div>
             <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 drop-shadow-sm">Spark Chat</span>
          </div>
          <button onClick={() => { setShowCreateModal(true); setChannelStep(1); }} className={`p-2 rounded-full hover:bg-white/10 transition-colors ${glassButton}`} title="Create Channel">
             <Edit3 size={18} className="text-slate-300" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
            <div className={`relative rounded-xl overflow-hidden group ${glassInput}`}>
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 group-focus-within:text-blue-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Поиск..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent pl-10 pr-4 py-2.5 text-sm focus:outline-none text-slate-200 placeholder-slate-600"
               />
            </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {searchQuery && (
             <div className="px-4 py-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest opacity-80">Глобальный поиск</div>
          )}
          {searchQuery && dbUsers.filter(u => 
             (u.username?.includes(searchQuery) || u.firstName.includes(searchQuery)) && u.phoneNumber !== currentUser.phoneNumber
          ).map(u => (
             <div key={u.phoneNumber} onClick={() => { 
                 // Find if chat exists, if not create a temp one logic or just open by ID
                 const existingChat = chats.find(c => c.id === u.phoneNumber);
                 setActiveChatId(u.phoneNumber);
                 setIsMobileMenuOpen(false);
             }} className={`p-3 mx-2 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-all mb-1 border border-transparent hover:border-white/5`}>
                <img src={u.avatarUrl} className="w-12 h-12 rounded-full shadow-lg" />
                <div className="min-w-0">
                   <div className="flex items-center gap-1">
                      <h3 className="font-semibold truncate text-slate-200">{u.firstName} {u.lastName}</h3>
                      {u.isPremium && <Star size={10} className="text-purple-400 fill-purple-400 drop-shadow-[0_0_5px_rgba(192,132,252,0.8)]" />}
                      {renderStatus(u)}
                   </div>
                   <span className="text-xs text-slate-500">@{u.username}</span>
                </div>
             </div>
          ))}

          {chats.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(chat => (
            <div 
              key={chat.id}
              onClick={() => { setActiveChatId(chat.id); setIsMobileMenuOpen(false); }}
              className={`p-3 mx-2 mb-1.5 rounded-xl flex items-center gap-3 cursor-pointer transition-all duration-300 border
                ${activeChatId === chat.id 
                  ? 'bg-blue-600/90 border-blue-400/30 shadow-[0_0_20px_rgba(37,99,235,0.3)]' 
                  : 'border-transparent hover:bg-white/5 hover:border-white/5'
                }`}
            >
              <div className="relative">
                <img src={chat.avatarUrl} alt={chat.name} className="w-12 h-12 rounded-full object-cover shadow-md" />
                {chat.id === 'ai-bot' && <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-blue-500"><Sparkles size={10} className="text-blue-400"/></div>}
                {chat.type === 'channel' && <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-red-500"><Megaphone size={10} className="text-red-400"/></div>}
                {chat.type === 'group' && <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-green-500"><Users size={10} className="text-green-400"/></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                   <h3 className={`font-semibold truncate ${activeChatId === chat.id ? 'text-white' : 'text-slate-200'}`}>{chat.name}</h3>
                   <span className={`text-[10px] ${activeChatId === chat.id ? 'text-blue-200' : 'text-slate-500'}`}>
                     {chat.messages.length > 0 
                        ? new Date(chat.messages[chat.messages.length-1].timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
                        : ''}
                   </span>
                </div>
                <p className={`text-sm truncate ${activeChatId === chat.id ? 'text-blue-100/80' : 'text-slate-400'}`}>
                  {chat.lastMessage || <span className="italic opacity-50">Черновик</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- Main Chat Window --- */}
      <div 
         className={`flex-1 flex flex-col min-w-0 relative transition-all duration-500`}
         style={activeChat ? wallpaperStyle : {}}
      >
        {/* Dark overlay for wallpaper legibility */}
        {currentUser.wallpaper && <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>}

        {activeChat ? (
          <>
            {/* Chat Header (Glass) */}
            <div 
               className={`h-16 ${glassPanel} border-b border-white/10 flex items-center px-4 justify-between shadow-lg z-10 relative`} 
            >
               <div className="flex items-center gap-3 cursor-pointer" onClick={() => {
                  if(activeChat.type === 'channel' || activeChat.type === 'group') setViewingProfileId(activeChat.id);
                  else setViewingProfileId(activeChat.id);
               }}>
                  <button className="md:hidden p-1 hover:bg-white/10 rounded-lg transition-colors" onClick={(e) => { e.stopPropagation(); setIsMobileMenuOpen(true); }}>
                     <Menu className="text-slate-300" />
                  </button>
                  <img src={activeChat.avatarUrl} className="w-10 h-10 rounded-full shadow-md border border-white/10" alt="avatar" />
                  <div>
                    <h3 className="font-bold flex items-center gap-1 text-sm md:text-base text-white drop-shadow-md">
                        {activeChat.name}
                        {activeChat.type === 'bot' && <span className="bg-blue-500/80 backdrop-blur text-[9px] px-1.5 py-0.5 rounded border border-blue-400/30">BOT</span>}
                        {activeChat.type === 'channel' && <span className="bg-red-500/80 backdrop-blur text-[9px] px-1.5 py-0.5 rounded border border-red-400/30">CHANNEL</span>}
                        {activeChat.type === 'group' && <span className="bg-green-500/80 backdrop-blur text-[9px] px-1.5 py-0.5 rounded border border-green-400/30">GROUP</span>}
                    </h3>
                    <span className="text-xs text-slate-300/80 font-medium">
                       {activeChat.type === 'channel' 
                          ? `${activeChat.subscribers} subscribers` 
                          : 'online'}
                    </span>
                  </div>
               </div>
               <div className="flex gap-4">
                  {activeChat.type !== 'bot' && activeChat.type !== 'channel' && (
                     <Phone 
                         className="text-slate-300 hover:text-green-400 transition-colors drop-shadow-sm cursor-pointer" 
                         onClick={() => setIsCalling(true)}
                     />
                  )}
                  <Search className="text-slate-300 hover:text-white transition-colors drop-shadow-sm cursor-pointer" />
                  <MoreVertical className="text-slate-300 hover:text-white transition-colors drop-shadow-sm cursor-pointer" 
                    onClick={(e) => { e.stopPropagation(); setChatInfoOpen(!chatInfoOpen); }} 
                  />
               </div>
            </div>

            {/* Messages Area */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${floatingMode ? 'px-8' : ''} relative z-0 custom-scrollbar`}>
               {activeChat.messages.length === 0 && !activeChat.hasStarted && activeChat.type === 'bot' ? (
                 <div className="flex-1 h-full flex flex-col items-center justify-center mt-20">
                    <div className="w-24 h-24 bg-blue-500/20 backdrop-blur-md border border-blue-500/50 rounded-full flex items-center justify-center mb-4 animate-bounce shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                        <Play fill="white" className="ml-1 w-10 h-10 text-white drop-shadow-lg" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-white drop-shadow-lg">Добро пожаловать</h2>
                    <p className="text-slate-200 text-center max-w-sm mb-6 drop-shadow-md">
                       Нажмите кнопку старт внизу, чтобы активировать сервис Spark.
                    </p>
                 </div>
               ) : (
                   activeChat.messages.map((msg) => (
                     <div key={msg.id} className={`flex ${msg.senderId === currentUser.phoneNumber ? 'justify-end' : 'justify-start'} ${floatingMode ? 'animate-fade-in-up' : ''}`}>
                        {msg.type === 'sticker' ? (
                           <div className="group relative">
                              <img src={msg.imageUrl} alt="sticker" className="w-32 h-32 object-contain hover:scale-105 transition-transform duration-300 filter drop-shadow-xl" />
                              <div className="text-[10px] text-right mt-1 opacity-70 text-white font-medium drop-shadow-md">
                                 {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </div>
                              {msg.senderId === currentUser.phoneNumber && (
                                 <button onClick={() => handleDeleteMessage(msg.id)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                              )}
                           </div>
                        ) : (
                           <div className="relative group max-w-[75%] md:max-w-[60%]">
                              <div 
                                 className={`rounded-2xl px-4 py-2 border
                                 ${msg.senderId === currentUser.phoneNumber 
                                    ? 'bg-blue-600/90 backdrop-blur-md text-white rounded-br-sm border-blue-400/30 shadow-[0_5px_15px_rgba(37,99,235,0.3)]' 
                                    : 'bg-slate-800/80 backdrop-blur-md text-slate-100 rounded-bl-sm border-white/10 shadow-[0_5px_15px_rgba(0,0,0,0.3)]'
                                 }
                                 ${floatingMode ? 'hover:-translate-y-1 hover:shadow-2xl' : ''}
                                 `}
                              >
                                 {msg.imageUrl && (
                                 <img src={msg.imageUrl} alt="attached" className="rounded-lg mb-2 max-h-60 object-cover border border-white/10" />
                                 )}
                                 {msg.text && <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                                 
                                 <div className="flex justify-between items-center mt-1 gap-2">
                                    {msg.reactions && msg.reactions['❤️'] > 0 && (
                                       <div className="bg-red-500/20 border border-red-500/30 text-red-200 text-[10px] px-1.5 rounded-full flex items-center shadow-sm">
                                          <Heart size={8} fill="currentColor" className="mr-1"/> {msg.reactions['❤️']}
                                       </div>
                                    )}

                                    <div className={`text-[10px] flex items-center gap-1 opacity-70 ml-auto`}>
                                       {msg.views && activeChat.type === 'channel' && <span className="flex items-center mr-1"><Eye size={10} className="mr-0.5"/> {msg.views}</span>}
                                       {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                       {msg.senderId === currentUser.phoneNumber && <CheckCheck size={12} />}
                                    </div>
                                 </div>
                              </div>
                              {msg.senderId === currentUser.phoneNumber && (
                                 <button onClick={() => handleDeleteMessage(msg.id)} className="absolute top-1 -left-8 bg-red-500/80 backdrop-blur text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                    <Trash2 size={14}/>
                                 </button>
                              )}
                           </div>
                        )}
                     </div>
                   ))
               )}
               <div ref={messagesEndRef} />
            </div>

            {/* Input Area (Glass) */}
            {!activeChat.hasStarted && activeChat.type === 'bot' ? (
               <div className={`p-4 ${glassPanel} border-t border-white/10 flex justify-center relative z-10`}>
                  <button 
                    onClick={() => handleSendMessage('text', 'START')}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-10 rounded-xl text-lg w-full max-w-sm transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] border border-white/20"
                  >
                    START
                  </button>
               </div>
            ) : activeChat.type === 'channel' && !activeChat.isAdmin ? (
               <div className={`p-4 ${glassPanel} border-t border-white/10 text-center text-slate-400 text-sm relative z-10`}>
                  Только администраторы могут писать в этот канал.
               </div>
            ) : (
               <div className={`relative p-3 ${glassPanel} border-t border-white/10 flex items-end gap-3 transition-colors z-10`}>
                  {showEmojiPicker && (
                     <div className={`absolute bottom-20 left-4 w-72 h-80 ${glassPanel} rounded-xl flex flex-col z-20 overflow-hidden`}>
                        <div className="p-2 border-b border-white/10 flex gap-2 overflow-x-auto bg-black/20">
                           <span className="text-xs font-bold text-slate-300 p-1">Emoji</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 grid grid-cols-5 gap-2 content-start custom-scrollbar">
                           {EMOJIS.map(e => (
                              <button key={e} onClick={() => setInputText(prev => prev + e)} className="text-2xl hover:bg-white/10 rounded transition-colors">{e}</button>
                           ))}
                        </div>
                        <div className="p-2 border-t border-white/10 bg-black/30">
                           <h4 className="text-xs font-bold mb-2 text-slate-300">Stickers</h4>
                           <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                              {STICKERS.map(s => (
                                 <button key={s} onClick={() => handleSendMessage('sticker', s)} className="hover:scale-110 transition-transform">
                                    <img src={s} className="w-10 h-10 drop-shadow-md" />
                                 </button>
                              ))}
                              {currentUser.isPremium && (
                                 <button onClick={() => stickerInputRef.current?.click()} className="w-10 h-10 bg-white/10 border border-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
                                    <span className="text-xl text-slate-300">+</span>
                                 </button>
                              )}
                              <input type="file" ref={stickerInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, true)} />
                           </div>
                        </div>
                     </div>
                  )}

                  <button className="p-2 text-slate-400 hover:text-blue-400 transition-colors" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                     <Smile size={24} />
                  </button>
                  
                  <div className={`flex-1 ${glassInput} rounded-2xl flex items-center px-4 py-2 min-h-[44px]`}>
                     <input 
                       className="flex-1 bg-transparent focus:outline-none text-white placeholder-slate-500 max-h-32 overflow-y-auto"
                       placeholder="Сообщение..."
                       value={inputText}
                       onChange={(e) => setInputText(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                     />
                  </div>

                  <div className="relative">
                     <button className="p-2 text-slate-400 hover:text-blue-400 transition-colors" onClick={() => fileInputRef.current?.click()}>
                        <Paperclip size={22} />
                     </button>
                     <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, false)} />
                  </div>

                  {inputText ? (
                    <button 
                       onClick={() => handleSendMessage('text')}
                       className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:shadow-[0_0_25px_rgba(59,130,246,0.7)] transform hover:scale-105 active:scale-95 transition-all"
                    >
                       <Send size={20} className="ml-0.5" />
                    </button>
                  ) : (
                    <button 
                     onClick={() => setShowStarsModal(true)}
                     className="p-3 text-yellow-400 hover:text-yellow-300 transition-colors drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                    >
                       <Gift size={24} />
                    </button>
                  )}
               </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-4">
             <div className="bg-slate-800/50 p-8 rounded-full mb-6 border border-white/5 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                <span className="text-6xl drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">✨</span>
             </div>
             <p className="bg-slate-900/60 backdrop-blur px-6 py-2 rounded-full text-sm border border-white/10 shadow-lg">
                Выберите чат для начала общения
             </p>
          </div>
        )}
      </div>

      {/* --- Call Modal --- */}
      {isCalling && (
          <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center">
              {/* Remote Video (Placeholder for P2P) */}
              <div className="flex-1 w-full relative flex items-center justify-center bg-slate-900">
                  <div className="flex flex-col items-center">
                    <img src={activeChat?.avatarUrl} className="w-32 h-32 rounded-full border-4 border-slate-700 shadow-2xl animate-pulse" />
                    <h2 className="text-2xl font-bold mt-4 text-white">Calling {activeChat?.name}...</h2>
                    <p className="text-slate-400">Waiting for response</p>
                  </div>
              </div>
              
              {/* My Video */}
              <div className="absolute top-4 right-4 w-32 h-48 bg-black rounded-xl overflow-hidden border border-white/20 shadow-2xl">
                  <video ref={myVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              </div>

              {/* Controls */}
              <div className="absolute bottom-10 flex gap-6 p-4 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10">
                  <button onClick={() => setIsVideoEnabled(!isVideoEnabled)} className={`p-4 rounded-full ${isVideoEnabled ? 'bg-white/10 hover:bg-white/20' : 'bg-red-500/20 text-red-500'}`}>
                      {isVideoEnabled ? <Video /> : <VideoOff />}
                  </button>
                  <button onClick={() => setIsMicEnabled(!isMicEnabled)} className={`p-4 rounded-full ${isMicEnabled ? 'bg-white/10 hover:bg-white/20' : 'bg-red-500/20 text-red-500'}`}>
                      {isMicEnabled ? <Mic /> : <MicOff />}
                  </button>
                  <button onClick={() => setIsCalling(false)} className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)] transform hover:scale-110 transition-all">
                      <PhoneOff />
                  </button>
              </div>
          </div>
      )}

      {/* --- Settings Modal (Glass) --- */}
      {showSettings && (
         <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <div className={`${glassPanel} w-full max-w-md rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto`}>
               {/* Header Background */}
               <div className="relative h-32 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900">
                  <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-30"></div>
                  <button onClick={() => { setShowSettings(false); setIsEditingProfile(false); setSettingsTab('main'); }} className="absolute top-4 right-4 text-white bg-black/30 backdrop-blur rounded-full p-1.5 hover:bg-white/20 transition-all border border-white/10"><X size={20}/></button>
                  {settingsTab !== 'main' && (
                     <button onClick={() => setSettingsTab('main')} className="absolute top-4 left-4 text-white bg-black/30 backdrop-blur rounded-full p-1.5 hover:bg-white/20 transition-all border border-white/10"><ArrowLeft size={20}/></button>
                  )}
               </div>
               
               <div className="px-6 relative -top-16 mb-[-30px]">
                  <div className="flex justify-between items-end">
                      <div className="relative group">
                          <img src={currentUser.avatarUrl} alt="profile" className="w-28 h-28 rounded-full border-4 border-slate-900 shadow-[0_0_20px_rgba(0,0,0,0.5)] object-cover bg-slate-800" />
                          {isEditingProfile && (
                             <div 
                                className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center cursor-pointer backdrop-blur-sm border-2 border-white/20"
                                onClick={() => avatarInputRef.current?.click()}
                             >
                                <Camera className="text-white" />
                                <input ref={avatarInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => {
                                   if(e.target.files?.[0]) {
                                      const reader = new FileReader();
                                      reader.onload = (ev) => {
                                         if(ev.target?.result) {
                                            const newUser = { ...currentUser, avatarUrl: ev.target.result as string };
                                            updateAndSaveUser(newUser); 
                                            setEditForm(prev => ({ ...prev, avatarUrl: ev.target?.result as string }));
                                         }
                                      };
                                      reader.readAsDataURL(e.target.files[0]);
                                   }
                                }} />
                             </div>
                          )}
                          {currentUser.isPremium && (
                             <div className="absolute bottom-1 right-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white p-1.5 rounded-full border-2 border-slate-900 shadow-lg">
                                <Star size={14} fill="white" />
                             </div>
                          )}
                      </div>
                      <button 
                        onClick={() => { setShowSettings(false); setShowPremiumModal(true); }}
                        className="mb-3 bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 rounded-full text-xs font-bold text-white shadow-[0_0_15px_rgba(147,51,234,0.4)] border border-white/10 hover:brightness-110 transition-all"
                      >
                        Spark Premium {currentUser.isPremium ? 'ON' : 'OFF'}
                      </button>
                  </div>

                  {settingsTab === 'main' && (
                     <div className="mt-4">
                        <h2 className="text-2xl font-bold flex items-center gap-2 text-white drop-shadow-md">
                           {currentUser.firstName} {currentUser.lastName}
                           {renderStatus(currentUser)}
                        </h2>
                        <p className="text-sm text-slate-400">@{currentUser.username}</p>
                        <p className="text-sm text-slate-300 mt-2 italic border-l-2 border-blue-500 pl-3">{currentUser.bio}</p>
                     </div>
                  )}
               </div>

               <div className="mt-6 px-4 pb-6 space-y-3">
                  {settingsTab === 'main' ? (
                     <>
                        <button 
                           onClick={() => {
                              setIsEditingProfile(true);
                              setEditForm({
                                 firstName: currentUser.firstName,
                                 lastName: currentUser.lastName || '',
                                 username: currentUser.username || '',
                                 bio: currentUser.bio || '',
                                 statusEmoji: currentUser.statusEmoji || '',
                                 messagePrice: currentUser.messagePrice || 0
                              });
                              setSettingsTab('profile');
                           }} 
                           className={`w-full flex items-center gap-3 p-4 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5 group`}
                        >
                           <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors"><Edit3 size={20}/></div>
                           <span className="text-slate-200 font-medium">Редактировать профиль</span>
                        </button>

                        <button 
                           onClick={() => setSettingsTab('wallpaper')}
                           className={`w-full flex items-center gap-3 p-4 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5 group`}
                        >
                           <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors"><Palette size={20}/></div>
                           <span className="text-slate-200 font-medium">Оформление чата</span>
                        </button>

                        <div className="h-px bg-white/10 my-2"></div>

                        <button onClick={handleDownloadApp} className={`w-full flex items-center gap-3 p-4 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5 group`}>
                           <div className="p-2 rounded-lg bg-green-500/20 text-green-400 group-hover:bg-green-500 group-hover:text-white transition-colors"><Download size={20}/></div>
                           <span className="text-slate-200 font-medium">Скачать приложение</span>
                        </button>
                        <button onClick={onLogout} className={`w-full flex items-center gap-3 p-4 rounded-xl hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20 group text-left`}>
                           <div className="p-2 rounded-lg bg-red-500/20 text-red-400 group-hover:bg-red-500 group-hover:text-white transition-colors"><X size={20}/></div>
                           <span className="text-red-400 font-medium group-hover:text-red-300">Выйти</span>
                        </button>
                     </>
                  ) : settingsTab === 'profile' ? (
                     <div className="space-y-4 animate-fade-in-up">
                        <div className="space-y-2">
                           <label className="text-xs text-slate-400 uppercase font-bold ml-1">Основное</label>
                           <input 
                              className={`w-full p-3 rounded-xl text-white outline-none ${glassInput}`} 
                              placeholder="Имя" 
                              value={editForm.firstName} 
                              onChange={e => setEditForm({...editForm, firstName: e.target.value})}
                           />
                           <input 
                              className={`w-full p-3 rounded-xl text-white outline-none ${glassInput}`} 
                              placeholder="Фамилия" 
                              value={editForm.lastName} 
                              onChange={e => setEditForm({...editForm, lastName: e.target.value})}
                           />
                           <input 
                              className={`w-full p-3 rounded-xl text-white outline-none ${glassInput}`} 
                              placeholder="Username" 
                              value={editForm.username} 
                              onChange={e => setEditForm({...editForm, username: e.target.value})}
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-xs text-slate-400 uppercase font-bold ml-1">О себе</label>
                           <textarea 
                              className={`w-full p-3 rounded-xl text-white text-sm outline-none ${glassInput} min-h-[80px]`} 
                              placeholder="Bio" 
                              value={editForm.bio} 
                              onChange={e => setEditForm({...editForm, bio: e.target.value})}
                           />
                        </div>
                        
                        {currentUser.isPremium && (
                           <div className="space-y-4 p-4 rounded-xl border border-purple-500/30 bg-purple-500/10">
                              <label className="text-xs text-purple-300 uppercase font-bold flex items-center gap-2"><Crown size={12}/> Премиум Настройки</label>
                              
                              <div className="flex flex-col gap-2">
                                 <label className="text-xs text-purple-200">Цена сообщения для других (в звездах)</label>
                                 <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-purple-500/20 ${glassInput}`}>
                                    <Coins size={16} className="text-yellow-400" />
                                    <input 
                                       type="number"
                                       className="bg-transparent outline-none text-white w-full"
                                       placeholder="0"
                                       min="0"
                                       value={editForm.messagePrice || ''}
                                       onChange={e => setEditForm({...editForm, messagePrice: parseInt(e.target.value) || 0})}
                                    />
                                 </div>
                                 <p className="text-[10px] text-purple-300/60">Если > 0, люди должны платить вам звезды за каждое сообщение.</p>
                              </div>

                              <div className="h-px bg-purple-500/20"></div>

                              <div className="flex items-center gap-3">
                                 <div className="w-12 h-12 bg-black/40 rounded-lg flex items-center justify-center border border-white/10">
                                    {renderStatus({ ...currentUser, statusEmoji: editForm.statusEmoji || currentUser.statusEmoji })}
                                 </div>
                                 <div className="flex-1">
                                    <button onClick={() => customStatusInputRef.current?.click()} className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg shadow-lg w-full mb-1">
                                       Изменить статус
                                    </button>
                                    <input type="file" ref={customStatusInputRef} className="hidden" accept="image/*" onChange={(e) => {
                                       if(e.target.files?.[0]) {
                                          const reader = new FileReader();
                                          reader.onload = (ev) => {
                                             if (ev.target?.result) {
                                                const res = ev.target.result as string;
                                                setEditForm(prev => ({ ...prev, statusEmoji: res }));
                                             }
                                          };
                                          reader.readAsDataURL(e.target.files[0]);
                                       }
                                    }} />
                                 </div>
                              </div>
                           </div>
                        )}

                        <button onClick={() => {
                           const updatedUser = { ...currentUser, ...editForm };
                           updateAndSaveUser(updatedUser);
                           setIsEditingProfile(false);
                           setSettingsTab('main');
                        }} className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl flex items-center justify-center gap-2 shadow-lg font-bold mt-4">
                           <Save size={18}/> Сохранить изменения
                        </button>
                     </div>
                  ) : (
                     <div className="space-y-6 animate-fade-in-up">
                        <div>
                           <label className="text-xs text-slate-400 uppercase font-bold mb-3 block">Цвет фона</label>
                           <div className="flex flex-wrap gap-3">
                              {WALLPAPER_COLORS.map(color => (
                                 <button 
                                    key={color} 
                                    onClick={() => updateAndSaveUser({ ...currentUser, wallpaper: color })}
                                    className={`w-10 h-10 rounded-full border-2 shadow-lg transition-transform hover:scale-110 ${currentUser.wallpaper === color ? 'border-white scale-110' : 'border-white/10'}`}
                                    style={{ backgroundColor: color }}
                                 />
                              ))}
                           </div>
                        </div>
                        
                        <div>
                           <label className="text-xs text-slate-400 uppercase font-bold mb-3 block">Свои обои</label>
                           <button 
                              onClick={() => wallpaperInputRef.current?.click()}
                              className={`w-full h-32 rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-slate-400 hover:bg-white/5 hover:border-white/40 transition-all ${glassInput}`}
                           >
                              <ImageIcon size={32} className="mb-2 opacity-50"/>
                              <span className="text-sm">Загрузить изображение</span>
                           </button>
                           <input type="file" ref={wallpaperInputRef} className="hidden" accept="image/*" onChange={handleWallpaperChange} />
                           {currentUser.wallpaper && !currentUser.wallpaper.startsWith('#') && (
                              <button 
                                 onClick={() => updateAndSaveUser({ ...currentUser, wallpaper: undefined })}
                                 className="mt-3 text-red-400 text-xs hover:underline flex items-center gap-1"
                              >
                                 <Trash2 size={12}/> Сбросить обои
                              </button>
                           )}
                        </div>
                     </div>
                  )}
               </div>
            </div>
         </div>
      )}

      {/* --- User/Channel Profile Modal (Glass) --- */}
      {viewingProfileId && (
         <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <div className={`${glassPanel} w-full max-w-md rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] p-6 border border-white/10 relative`}>
               <button onClick={() => setViewingProfileId(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
               
               <div className="flex flex-col items-center mb-6">
                  <div className="relative">
                     <img 
                        src={viewingProfileUser?.avatarUrl || viewingProfileChat?.avatarUrl} 
                        className="w-32 h-32 rounded-full border-4 border-slate-800 shadow-2xl object-cover mb-4" 
                     />
                     {viewingProfileUser?.isPremium && <div className="absolute bottom-4 right-0 bg-purple-600 p-1.5 rounded-full border-2 border-slate-900 shadow-lg"><Star size={16} fill="white" className="text-white"/></div>}
                  </div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow-md">
                     {viewingProfileUser?.firstName || viewingProfileChat?.name} {viewingProfileUser?.lastName}
                     {renderStatus(viewingProfileUser)}
                  </h2>
                  <p className="text-blue-300">@{viewingProfileUser?.username || (viewingProfileChat?.link ? viewingProfileChat.link.replace('t.me/', '') : 'channel')}</p>
               </div>

               <div className="space-y-4 bg-black/20 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
                  {viewingProfileUser?.phoneNumber && (
                     <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Телефон</span>
                        <p className="text-slate-200">{viewingProfileUser.phoneNumber}</p>
                     </div>
                  )}
                  {viewingProfileUser?.messagePrice && viewingProfileUser.messagePrice > 0 && (
                     <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded-lg">
                        <span className="text-[10px] text-yellow-500 uppercase font-bold tracking-wider flex items-center gap-1"><Coins size={10}/> Платные сообщения</span>
                        <p className="text-yellow-100 text-sm">Стоимость сообщения: {viewingProfileUser.messagePrice} звезд</p>
                     </div>
                  )}
                  <div>
                     <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">О себе / Описание</span>
                     <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{viewingProfileUser?.bio || viewingProfileChat?.description || 'Нет информации'}</p>
                  </div>
                  {viewingProfileChat?.link && (
                     <div>
                         <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Ссылка</span>
                         <p className="text-blue-400 cursor-pointer hover:underline">{viewingProfileChat.link}</p>
                     </div>
                  )}
                  {viewingProfileChat?.type === 'channel' && (
                     <div className="flex justify-between items-center pt-2 border-t border-white/10 mt-2">
                        <span className="text-slate-400 text-xs">{viewingProfileChat.subscribers} подписчиков</span>
                        {viewingProfileChat.privacy === 'private' && <div className="flex items-center gap-1 text-red-400 text-xs"><Lock size={12}/> Приватный</div>}
                     </div>
                  )}
               </div>
               
               <button onClick={() => setViewingProfileId(null)} className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all font-medium">Закрыть</button>
            </div>
         </div>
      )}

      {/* --- Create Channel Wizard (Glass) --- */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
           <div className={`${glassPanel} w-full max-w-sm rounded-2xl p-6 border border-white/10 shadow-2xl`}>
              <div className="flex justify-between items-center mb-6">
                 {channelStep === 2 ? <button onClick={() => setChannelStep(1)} className="text-slate-400 hover:text-white"><ArrowLeft/></button> : <div></div>}
                 <h2 className="text-xl font-bold text-white drop-shadow-md">Новый Чат</h2>
                 <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
              </div>

              {channelStep === 1 ? (
                 <div className="space-y-5">
                    <div className="flex justify-center">
                       <div className="relative w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center cursor-pointer overflow-hidden group border-2 border-dashed border-slate-600 hover:border-blue-500 transition-colors">
                          {newChannelData.avatarUrl ? (
                             <img src={newChannelData.avatarUrl} className="w-full h-full object-cover" />
                          ) : <Camera size={32} className="text-slate-500 group-hover:text-blue-400 transition-colors" />}
                          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => {
                                if(e.target.files?.[0]) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => setNewChannelData({...newChannelData, avatarUrl: ev.target?.result as string});
                                    reader.readAsDataURL(e.target.files[0]);
                                }
                          }} />
                       </div>
                    </div>
                    <input 
                       className={`w-full p-3 rounded-xl text-white outline-none ${glassInput}`}
                       placeholder="Название"
                       value={newChannelData.name}
                       onChange={e => setNewChannelData({...newChannelData, name: e.target.value})}
                    />
                    <textarea 
                       className={`w-full p-3 rounded-xl text-white outline-none ${glassInput}`}
                       placeholder="Описание"
                       value={newChannelData.description}
                       onChange={e => setNewChannelData({...newChannelData, description: e.target.value})}
                    />
                    
                    {/* Channel vs Group Toggle */}
                    <div className="flex p-1 bg-black/20 rounded-xl border border-white/10">
                         <button 
                            onClick={() => setNewChannelData({...newChannelData, type: 'channel'})}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newChannelData.type === 'channel' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                         >
                            Канал
                         </button>
                         <button 
                            onClick={() => setNewChannelData({...newChannelData, type: 'group'})}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newChannelData.type === 'group' ? 'bg-green-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                         >
                            Группа
                         </button>
                    </div>

                    <button 
                       disabled={!newChannelData.name}
                       onClick={() => setChannelStep(2)} 
                       className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-white font-bold shadow-lg transition-all"
                    >
                       Далее
                    </button>
                 </div>
              ) : (
                 <div className="space-y-6">
                    <div>
                       <label className="text-xs text-slate-400 mb-2 block uppercase font-bold">Приватность</label>
                       <div className="flex gap-3">
                          <button 
                             onClick={() => setNewChannelData({...newChannelData, privacy: 'public'})}
                             className={`flex-1 p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${newChannelData.privacy === 'public' ? 'border-blue-500 bg-blue-500/20 text-blue-200' : 'border-white/10 bg-black/20 text-slate-400'}`}
                          >
                             <Globe /> Публичный
                          </button>
                          <button 
                             onClick={() => setNewChannelData({...newChannelData, privacy: 'private'})}
                             className={`flex-1 p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${newChannelData.privacy === 'private' ? 'border-red-500 bg-red-500/20 text-red-200' : 'border-white/10 bg-black/20 text-slate-400'}`}
                          >
                             <Lock /> Частный
                          </button>
                       </div>
                    </div>
                    
                    {newChannelData.privacy === 'public' && (
                       <div>
                          <label className="text-xs text-slate-400 mb-2 block uppercase font-bold">Постоянная ссылка</label>
                          <div className={`flex items-center rounded-xl border border-white/10 overflow-hidden px-3 ${glassInput}`}>
                             <span className="text-slate-400">t.me/</span>
                             <input 
                                className="flex-1 bg-transparent p-3 text-white outline-none"
                                placeholder="link"
                                value={newChannelData.link}
                                onChange={e => setNewChannelData({...newChannelData, link: e.target.value})}
                             />
                          </div>
                       </div>
                    )}

                    <div className="bg-blue-900/20 border border-blue-500/20 p-3 rounded-lg text-xs text-blue-200">
                       {newChannelData.privacy === 'public' ? 'Публичные чаты можно найти в поиске, подписаться может любой.' : 'В частный чат можно попасть только по ссылке-приглашению.'}
                    </div>

                    <button 
                       onClick={finalizeChannelCreation} 
                       className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg"
                    >
                       <CheckCheck /> Создать
                    </button>
                 </div>
              )}
           </div>
        </div>
      )}

      {/* --- Premium Modal (Glass) --- */}
       {showPremiumModal && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
           <div className={`${glassPanel} w-full max-w-lg rounded-3xl p-1 shadow-[0_0_100px_rgba(139,92,246,0.3)] border border-purple-500/30`}>
              <div className="bg-slate-900/90 rounded-[22px] p-8 relative overflow-hidden text-white">
                 <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(139,92,246,0.15)_0%,transparent_50%)] pointer-events-none"></div>
                 <button onClick={() => setShowPremiumModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"><X/></button>
                 <div className="text-center mb-8 relative">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.5)] mb-4">
                       <Crown size={40} className="text-white drop-shadow-md" />
                    </div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-300 drop-shadow-sm">Spark Premium</h2>
                 </div>
                 <ul className="space-y-4 mb-8 text-sm relative">
                    <li className="flex gap-3 items-center bg-white/5 p-3 rounded-xl border border-white/5"><div className="bg-green-500/20 p-1 rounded text-green-400"><Check size={16}/></div> <span>Уникальный статус-эмодзи или картинка</span></li>
                    <li className="flex gap-3 items-center bg-white/5 p-3 rounded-xl border border-white/5"><div className="bg-green-500/20 p-1 rounded text-green-400"><Check size={16}/></div> <span>Загрузка своих стикеров</span></li>
                    <li className="flex gap-3 items-center bg-white/5 p-3 rounded-xl border border-white/5"><div className="bg-green-500/20 p-1 rounded text-green-400"><Check size={16}/></div> <span>Платные сообщения (зарабатывайте звезды)</span></li>
                 </ul>
                 <button onClick={() => { updateAndSaveUser({...currentUser, isPremium: true}); setShowPremiumModal(false); }} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 py-4 rounded-xl font-bold text-white shadow-xl hover:shadow-purple-500/40 transition-all border border-white/10 relative overflow-hidden group">
                    <span className="relative z-10">{currentUser.isPremium ? 'Подписка активна' : 'Подключить бесплатно (Бета)'}</span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                 </button>
              </div>
           </div>
        </div>
      )}

      {showStarsModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
           <div className={`${glassPanel} w-full max-w-md rounded-2xl p-6 border border-yellow-500/20 shadow-[0_0_60px_rgba(234,179,8,0.2)] relative text-white`}>
              <button onClick={() => setShowStarsModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X/></button>
              <div className="text-center mb-6">
                 <Star size={56} className="text-yellow-400 mx-auto mb-2 fill-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" />
                 <h2 className="text-2xl font-bold text-yellow-100">Магазин Звезд</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                 {[10, 50, 100].map(amount => (
                    <button key={amount} onClick={() => { updateAndSaveUser({...currentUser, stars: currentUser.stars + amount}); alert(`Added ${amount} stars`); }} className="bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-xl flex flex-col items-center transition-all group">
                       <span className="text-xl font-bold group-hover:scale-110 transition-transform text-yellow-200">{amount} ⭐️</span>
                       <span className="text-xs text-slate-400 mt-1">Купить</span>
                    </button>
                 ))}
              </div>
           </div>
        </div>
      )}

    </div>
  );
};