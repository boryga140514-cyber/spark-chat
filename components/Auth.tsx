import React, { useState, useEffect } from 'react';
import { User, COUNTRY_CODES, AppScreen } from '../types';
import { Camera, ArrowRight, Check, Lock, AlertTriangle, Play, Shield, MessageCircle, KeyRound } from 'lucide-react';

interface AuthProps {
  onComplete: (user: User) => void;
}

// Configuration for the specific admin account
const ADMIN_PHONE = '+380950058700';
const ADMIN_PASS = '140514wsa';
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 5 * 60 * 1000;

export const Auth: React.FC<AuthProps> = ({ onComplete }) => {
  // Intro State
  const [showIntro, setShowIntro] = useState(true);
  const [isExitingIntro, setIsExitingIntro] = useState(false);

  // Auth Logic State
  const [step, setStep] = useState<AppScreen>(AppScreen.AUTH_PHONE);
  const [countryCode, setCountryCode] = useState('+380');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Login State
  const [password, setPassword] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [blockUntil, setBlockUntil] = useState<number>(0);
  
  // Registration State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState(''); 
  const [avatar, setAvatar] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  
  // UI State
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSlidingOut, setIsSlidingOut] = useState(false);

  useEffect(() => {
    const savedBlock = localStorage.getItem('auth_block_until');
    const savedAttempts = localStorage.getItem('auth_attempts');
    if (savedBlock) setBlockUntil(parseInt(savedBlock));
    if (savedAttempts) setLoginAttempts(parseInt(savedAttempts));
  }, []);

  const handleFinishIntro = () => {
    setIsExitingIntro(true);
    setTimeout(() => {
      setShowIntro(false);
    }, 800);
  };

  const getFullPhone = () => `${countryCode}${phoneNumber}`;

  const saveUserToDb = (user: User) => {
    const existingDbStr = localStorage.getItem('spark_users_db');
    let db: User[] = existingDbStr ? JSON.parse(existingDbStr) : [];
    
    const existingIndex = db.findIndex(u => u.phoneNumber === user.phoneNumber);
    if (existingIndex >= 0) {
      db[existingIndex] = user;
    } else {
      db.push(user);
    }
    
    localStorage.setItem('spark_users_db', JSON.stringify(db));
  };

  const checkUsernameExists = (uname: string): boolean => {
    const existingDbStr = localStorage.getItem('spark_users_db');
    const db: User[] = existingDbStr ? JSON.parse(existingDbStr) : [];
    return db.some(u => u.username?.toLowerCase() === uname.toLowerCase());
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (phoneNumber.length < 5) return;

    const fullPhone = getFullPhone();
    
    if (Date.now() < blockUntil) {
       const minutesLeft = Math.ceil((blockUntil - Date.now()) / 60000);
       setError(`Аккаунт временно заблокирован. Попробуйте через ${minutesLeft} мин.`);
       return;
    }

    const existingDbStr = localStorage.getItem('spark_users_db');
    const db: User[] = existingDbStr ? JSON.parse(existingDbStr) : [];
    const foundUser = db.find(u => u.phoneNumber === fullPhone);

    if (fullPhone === ADMIN_PHONE) {
      // Admin always goes to password login
      setStep(AppScreen.AUTH_LOGIN_PASSWORD);
      return;
    }

    if (foundUser) {
      // Existing users (simulated) could have a password check here if we saved it in DB.
      // For now, if found in DB, we treat as "Login" -> simple pass through or Login Password
      if (foundUser.password) {
         // If user has a password set, go to login
         // For simulation simplicity in this demo, we assume regular user auto-login
         // OR we could route to LOGIN_PASSWORD. Let's Auto-login for UX unless it's critical.
         onComplete(foundUser);
      } else {
         onComplete(foundUser);
      }
    } else {
      // New user registration
      setStep(AppScreen.AUTH_REGISTER_PROFILE);
    }
  };

  const handleLoginPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (Date.now() < blockUntil) {
       const minutesLeft = Math.ceil((blockUntil - Date.now()) / 60000);
       setError(`Аккаунт заблокирован. Ждите ${minutesLeft} мин.`);
       return;
    }

    if (password === ADMIN_PASS) {
        setLoginAttempts(0);
        localStorage.removeItem('auth_attempts');
        localStorage.removeItem('auth_block_until');

        const existingDbStr = localStorage.getItem('spark_users_db');
        const db: User[] = existingDbStr ? JSON.parse(existingDbStr) : [];
        const existingAdmin = db.find(u => u.phoneNumber === ADMIN_PHONE);

        if (existingAdmin) {
            onComplete({ ...existingAdmin, isDev: true });
        } else {
            // First time admin login setup
            setFirstName('Разработчик');
            setUsername('admin');
            // Skip registration profile for admin, set defaults
            const adminUser: User = {
                phoneNumber: ADMIN_PHONE,
                firstName: 'Разработчик',
                username: 'admin',
                avatarUrl: 'https://ui-avatars.com/api/?name=Dev&background=000&color=fff',
                isPremium: true,
                stars: 10000,
                bio: 'Разработчик Spark Chat',
                isDev: true,
                password: ADMIN_PASS
            };
            saveUserToDb(adminUser);
            onComplete(adminUser);
        }
    } else {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        localStorage.setItem('auth_attempts', newAttempts.toString());

        if (newAttempts >= MAX_ATTEMPTS) {
            const blockTime = Date.now() + BLOCK_DURATION;
            setBlockUntil(blockTime);
            localStorage.setItem('auth_block_until', blockTime.toString());
            setError('Слишком много попыток. Аккаунт заблокирован на 5 минут.');
        } else {
            setError(`Неверный пароль. Осталось попыток: ${MAX_ATTEMPTS - newAttempts}`);
        }
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username && checkUsernameExists(username)) {
       setError('Упс кто то уже использует етот юзернейм');
       return;
    }

    if (firstName) {
       setStep(AppScreen.AUTH_CREATE_PASSWORD);
    }
  };

  const handleCreatePasswordSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (newPassword.length < 4) {
          setError('Пароль слишком короткий');
          triggerShake();
          return;
      }

      if (newPassword !== repeatPassword) {
          setError('Пароли не совпадают');
          triggerShake();
          return;
      }

      // Success
      setIsSuccess(true);
      setTimeout(() => {
          setIsSlidingOut(true);
          setTimeout(() => {
              completeRegistration();
          }, 600); // Wait for slide animation
      }, 500); // Wait for green flash
  };

  const triggerShake = () => {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
  };

  const completeRegistration = () => {
      const fullPhone = getFullPhone();
      
      const newUser: User = {
        phoneNumber: fullPhone,
        firstName,
        lastName,
        username,
        // Use the base64 avatar or a default
        avatarUrl: avatar || `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`,
        isPremium: false,
        stars: 0,
        bio: 'Using Spark Chat ✨',
        isDev: false,
        password: newPassword 
      };
      
      saveUserToDb(newUser);
      onComplete(newUser);
  };

  // FIX: Use FileReader to create a persistent Base64 string instead of ObjectURL
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
         if (ev.target?.result) {
            setAvatar(ev.target.result as string);
         }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // --- STYLES & ANIMATIONS ---
  const customStyles = `
    @keyframes gradient-xy {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes hand-enter {
      0% { transform: translateY(100vh) rotate(-20deg); opacity: 0; }
      60% { transform: translateY(-20px) rotate(10deg); opacity: 1; }
      80% { transform: translateY(0) rotate(-10deg); }
      100% { transform: translateY(0) rotate(0deg); }
    }
    @keyframes hand-wave {
      0% { transform: rotate(0deg); }
      20% { transform: rotate(15deg); }
      40% { transform: rotate(-10deg); }
      60% { transform: rotate(15deg); }
      80% { transform: rotate(-5deg); }
      100% { transform: rotate(0deg); }
    }
    @keyframes hand-exit {
      0% { transform: translateY(0); opacity: 1; }
      100% { transform: translateY(-100vh) rotate(20deg); opacity: 0; }
    }
    @keyframes fade-in-up {
      0% { opacity: 0; transform: translateY(20px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes fade-out-down {
      0% { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(50px); }
    }
    @keyframes bear-breathe {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.03) translateY(-2px); }
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-10px); }
      75% { transform: translateX(10px); }
    }
    @keyframes slide-out-left {
      0% { transform: translateX(0); opacity: 1; }
      100% { transform: translateX(-100vw); opacity: 0; }
    }
    
    .animate-gradient-bg {
      background: linear-gradient(-45deg, #020617, #2e1065, #000000, #4c1d95);
      background-size: 400% 400%;
      animation: gradient-xy 10s ease infinite;
    }
    .hand-animate-enter { animation: hand-enter 1s ease-out forwards, hand-wave 2.5s ease-in-out 1s infinite; }
    .hand-animate-exit { animation: hand-exit 0.8s ease-in forwards; }
    .text-enter { animation: fade-in-up 1s ease-out 0.5s forwards; opacity: 0; }
    .content-exit { animation: fade-out-down 0.8s ease-in forwards; }
    .bear-breathing { animation: bear-breathe 3s ease-in-out infinite; }
    .shake { animation: shake 0.4s ease-in-out; border-color: #ef4444 !important; }
    .slide-out-left { animation: slide-out-left 0.6s ease-in forwards; }
    .success-pulse { box-shadow: 0 0 50px #22c55e; border-color: #22c55e !important; }
  `;

  // --- RENDER: INTRO SCREEN ---
  if (showIntro) {
    return (
      <>
        <style>{customStyles}</style>
        <div className={`flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden animate-gradient-bg text-white`}>
          <div className={`text-[120px] mb-8 drop-shadow-[0_0_30px_rgba(168,85,247,0.6)] ${isExitingIntro ? 'hand-animate-exit' : 'hand-animate-enter'} z-10`}>👋</div>
          <div className={`text-center max-w-md z-10 ${isExitingIntro ? 'content-exit' : 'text-enter'}`}>
             <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-300 drop-shadow-sm">Приветствуем в Spark Chat!</h1>
             <p className="text-lg text-slate-300 mb-8 leading-relaxed">Мы создали это пространство для вашего комфорта.<br/><span className="font-semibold text-purple-200">Безопасно. Быстро. Красиво.</span></p>
             <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 mb-8 shadow-2xl">
                <h3 className="text-sm font-bold uppercase tracking-widest text-blue-400 mb-3 flex items-center justify-center gap-2"><Shield size={16} /> О нас</h3>
                <p className="text-sm text-slate-300">Spark Chat надежно хранит ваши переписки и историю сообщений. Мы используем современные технологии защиты.</p>
             </div>
             <button onClick={handleFinishIntro} className="group relative px-8 py-4 bg-white text-black font-bold rounded-full text-lg shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:shadow-[0_0_40px_rgba(255,255,255,0.6)] transition-all transform hover:scale-105 active:scale-95">
                <span className="flex items-center gap-2">Начать Регистрацию <Play size={20} className="fill-black" /></span>
             </button>
          </div>
        </div>
      </>
    );
  }

  // --- RENDER: MAIN AUTH SCREENS ---
  return (
    <>
      <style>{customStyles}</style>
      <div className={`flex flex-col items-center justify-center min-h-screen p-4 animate-gradient-bg overflow-hidden`}>
        <div className={`w-full max-w-md transition-all duration-500 ${isSlidingOut ? 'slide-out-left' : ''}`}>
        
        {step === AppScreen.AUTH_PHONE && (
          <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10 animate-fade-in-up">
            <div className="flex flex-col items-center mb-6 relative">
               <div className="absolute -top-16 -right-2 bg-white text-slate-900 px-4 py-2 rounded-2xl rounded-bl-none shadow-lg animate-bounce text-sm font-bold z-20 max-w-[180px] text-center">Напиши свой номер, мы никому не скажем! 🤫</div>
               <div className="w-32 h-32 relative bear-breathing drop-shadow-2xl">
                  {/* Bear Drawing */}
                  <div className="absolute top-2 left-2 w-8 h-8 bg-[#8B4513] rounded-full"></div>
                  <div className="absolute top-2 right-2 w-8 h-8 bg-[#8B4513] rounded-full"></div>
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-24 bg-[#8B4513] rounded-[30px] shadow-inner"></div>
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-24 h-16 bg-blue-600 rounded-t-full rounded-b-lg z-10">
                     <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-blue-400 rounded-full shadow-sm"></div>
                     <div className="absolute bottom-0 w-full h-4 bg-blue-700 rounded-b-lg"></div>
                  </div>
                  <div className="absolute top-12 left-8 w-3 h-3 bg-black rounded-full z-10 flex items-center justify-center"><div className="w-1 h-1 bg-white rounded-full -mt-1 -mr-1"></div></div>
                  <div className="absolute top-12 right-8 w-3 h-3 bg-black rounded-full z-10 flex items-center justify-center"><div className="w-1 h-1 bg-white rounded-full -mt-1 -mr-1"></div></div>
                  <div className="absolute top-16 left-1/2 -translate-x-1/2 w-12 h-8 bg-[#D2691E] rounded-full z-10"></div>
                  <div className="absolute top-16 left-1/2 -translate-x-1/2 w-4 h-3 bg-black rounded-full z-20 mt-1"></div>
               </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-white mb-2 drop-shadow-md">Регистрация</h2>
            <form onSubmit={handlePhoneSubmit} className="space-y-4 mt-4">
              <div className="flex gap-2">
                <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="bg-black/30 text-white p-3 rounded-xl border border-white/10 focus:outline-none focus:border-blue-500 appearance-none cursor-pointer">
                  {COUNTRY_CODES.map((c) => (<option key={c.code} value={c.code} className="bg-slate-900">{c.flag} {c.code}</option>))}
                </select>
                <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))} placeholder="00 000 0000" className="flex-1 bg-black/30 text-white p-3 rounded-xl border border-white/10 focus:outline-none focus:border-blue-500 placeholder-slate-500" autoFocus />
              </div>
              {error && <div className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded-lg">{error}</div>}
              <button type="submit" disabled={phoneNumber.length < 5} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg mt-4">Продолжить <ArrowRight size={18} /></button>
            </form>
          </div>
        )}

        {step === AppScreen.AUTH_LOGIN_PASSWORD && (
          <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10 animate-fade-in-up">
              <div className="flex justify-center mb-6"><div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]"><Lock className="text-red-400" /></div></div>
              <h2 className="text-xl font-bold text-center text-white mb-2">Проверка безопасности</h2>
              <form onSubmit={handleLoginPasswordSubmit} className="space-y-4">
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Введите пароль" className="w-full bg-black/30 text-white p-3 rounded-xl border border-white/10 focus:outline-none focus:border-red-500 placeholder-slate-500 text-center tracking-widest" autoFocus />
                  {error && <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg text-xs justify-center border border-red-500/20"><AlertTriangle size={14} /> {error}</div>}
                  <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg">Войти</button>
                  <button type="button" onClick={() => { setStep(AppScreen.AUTH_PHONE); setError(''); setPassword(''); }} className="w-full text-slate-500 hover:text-slate-300 text-sm py-2">Назад</button>
              </form>
          </div>
        )}

        {step === AppScreen.AUTH_REGISTER_PROFILE && (
          <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10 animate-fade-in-up">
            <h2 className="text-2xl font-bold text-center text-white mb-6">Создание профиля</h2>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="flex justify-center mb-6">
                <div className="relative group cursor-pointer">
                  <div className="w-24 h-24 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-600 group-hover:border-blue-500 transition-all shadow-lg">
                      {avatar ? <img src={avatar} alt="Avatar" className="w-full h-full object-cover" /> : <Camera className="text-slate-500 w-8 h-8 group-hover:text-blue-400" />}
                  </div>
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-black/30 text-white p-3 rounded-xl border border-white/10 focus:outline-none focus:border-blue-500" placeholder="Имя" required />
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-black/30 text-white p-3 rounded-xl border border-white/10 focus:outline-none focus:border-blue-500" placeholder="Фамилия" />
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-black/30 text-white p-3 rounded-xl border border-white/10 focus:outline-none focus:border-blue-500" placeholder="@username" />
              {error && <div className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded-lg">{error}</div>}
              <button type="submit" disabled={!firstName} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all mt-6 shadow-lg">Далее</button>
            </form>
          </div>
        )}

        {step === AppScreen.AUTH_CREATE_PASSWORD && (
            <div className={`bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border transition-all duration-300 ${isShaking ? 'shake' : 'border-white/10'} ${isSuccess ? 'success-pulse' : ''} animate-fade-in-up`}>
                <div className="flex justify-center mb-6">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 shadow-[0_0_20px_rgba(0,0,0,0.4)] transition-colors duration-300 ${isSuccess ? 'bg-green-500/20 border-green-500' : 'bg-blue-900/20 border-blue-500'}`}>
                        {isSuccess ? <Check className="text-green-500" size={32}/> : <KeyRound className="text-blue-400" size={32} />}
                  </div>
                </div>
                <h2 className="text-xl font-bold text-center text-white mb-2">{isSuccess ? 'Успешно!' : 'Придумайте пароль'}</h2>
                <p className="text-slate-400 text-center mb-6 text-sm">Защитите свой аккаунт паролем</p>

                <form onSubmit={handleCreatePasswordSubmit} className="space-y-4">
                    <input 
                        type="password"
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setIsShaking(false); setError(''); }}
                        placeholder="Новый пароль"
                        className="w-full bg-black/30 text-white p-3 rounded-xl border border-white/10 focus:outline-none focus:border-blue-500 placeholder-slate-500"
                        autoFocus
                        disabled={isSuccess}
                    />
                    <input 
                        type="password"
                        value={repeatPassword}
                        onChange={(e) => { setRepeatPassword(e.target.value); setIsShaking(false); setError(''); }}
                        placeholder="Повторите пароль"
                        className="w-full bg-black/30 text-white p-3 rounded-xl border border-white/10 focus:outline-none focus:border-blue-500 placeholder-slate-500"
                        disabled={isSuccess}
                    />
                    {error && <div className="text-red-400 text-xs text-center">{error}</div>}
                    <button 
                        type="submit" 
                        disabled={!newPassword || !repeatPassword || isSuccess}
                        className={`w-full font-bold py-3.5 rounded-xl transition-all shadow-lg mt-2 ${isSuccess ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                    >
                        {isSuccess ? 'Вход...' : 'Завершить'}
                    </button>
                </form>
            </div>
        )}

        </div>
      </div>
    </>
  );
};