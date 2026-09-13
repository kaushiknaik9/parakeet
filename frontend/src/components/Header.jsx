import React, { useState, useRef, useEffect } from 'react';
import { Search, Mic, Bell, BrainCircuit, Sun, Moon, ChevronLeft, Palette, LogOut, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CometCard } from './ui/comet-card';

const Header = ({ theme, toggleTheme, onBack, palette, togglePalette, user, onLogout }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen]);

  return (
    <header className="sticky top-0 z-50 w-full h-16 md:h-20 border-b border-[var(--glass-border)] flex items-center justify-between px-4 md:px-8" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-main) 90%, transparent)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)' }}>
      {/* Local & Back */}
      <div className="flex items-center gap-2 md:gap-4">
        {onBack && (
          <motion.div
             whileHover={{ x: -2 }}
             whileTap={{ scale: 0.9 }}
             onClick={onBack}
             className="cursor-pointer p-2 rounded-full hover:bg-[var(--glass-base)]/10 text-[var(--text-main)] opacity-70 hover:opacity-100 transition-all flex-shrink-0"
          >
             <ChevronLeft size={24} />
          </motion.div>
        )}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center -ml-1 overflow-hidden" style={{ mixBlendMode: theme === 'dark' ? 'screen' : 'multiply' }}>
            <img 
              src="/logo.png" 
              alt="Armour" 
              className={`w-full h-full object-contain scale-[1.15] ${
                theme === 'dark' 
                  ? 'contrast-[2] grayscale invert opacity-100' 
                  : 'contrast-[1.5] grayscale opacity-90'
              }`} 
            />
          </div>
          <span className="font-bold text-xl tracking-tight text-[var(--text-main)] hidden sm:block">
            Armour
          </span>
        </div>
      </div>

      {/* Spacer to push items apart */}
      <div className="flex-1" />

      {/* Quick Actions & Profile */}
      <div className="flex items-center gap-5">
        
        {/* Palette Theme Toggle */}
        <motion.div
          onClick={togglePalette}
          whileHover={{ scale: 1.1, rotate: -10 }}
          whileTap={{ scale: 0.9 }}
          title={palette === 'warm' ? 'Switch to Void theme' : 'Switch to Warm theme'}
          className="relative cursor-pointer p-2 rounded-full hover:bg-[var(--glass-base)]/10 transition hidden sm:block"
        >
          <Palette size={22} className="text-[var(--text-main)] opacity-50 hover:opacity-100 transition-opacity" />
          <span className={`absolute bottom-1 right-1 w-2 h-2 rounded-full border border-[var(--bg-main)] ${ palette === 'void' ? 'bg-indigo-500' : 'bg-amber-600' }`} />
        </motion.div>

        {/* Dark/Light Theme Toggle */}
        <motion.div 
          onClick={toggleTheme}
          whileHover={{ scale: 1.1, rotate: 15 }}
          whileTap={{ scale: 0.9 }}
          className="relative cursor-pointer p-2 rounded-full hover:bg-[var(--glass-base)]/10 transition hidden sm:block"
        >
          {theme === 'dark' ? <Moon size={22} className="text-white/60" /> : <Sun size={22} className="text-black/60" />}
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="relative cursor-pointer p-2 rounded-full hover:bg-[var(--glass-base)]/10 transition"
        >
          <Bell size={22} className="text-[var(--text-main)] opacity-40" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[var(--bg-main)] animate-pulse"></span>
        </motion.div>

        <div className="relative" ref={profileRef}>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`w-10 h-10 rounded-full overflow-hidden border cursor-pointer transition ${isProfileOpen ? 'border-[var(--text-main)] shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'border-[var(--glass-border)] hover:border-[var(--glass-base)]/40'}`}
          >
            <img src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=333&color=fff`} alt="Profile" className="w-full h-full object-cover" />
          </motion.div>

          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ duration: 0.2, type: 'spring', damping: 25 }}
                className="absolute right-0 top-[calc(100%+12px)] w-[280px] z-50 origin-top-right"
              >
                <CometCard className="w-full">
                  <div className="flex flex-col bg-[#1F2121] saturate-[0.85] w-full h-full text-white">
                    
                    {/* Profile Header with Comet Aesthetic */}
                    <div className="relative p-0 border-b border-white/10 overflow-hidden">
                      <div className="relative w-full h-28 overflow-hidden rounded-t-[12px]">
                        <img
                          loading="lazy"
                          className="absolute inset-0 h-full w-full bg-[#000000] object-cover contrast-75 saturate-50"
                          alt="Profile background"
                          src="https://images.unsplash.com/photo-1505506874110-6a7a69069a08?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                          style={{ boxShadow: "rgba(0, 0, 0, 0.05) 0px 5px 6px 0px" }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1F2121] via-transparent to-transparent opacity-90" />
                      </div>
                      <div className="relative px-4 pb-4 -mt-8 flex items-end gap-3 z-10 w-full">
                        <div className="w-16 h-16 rounded-[12px] overflow-hidden border-2 border-[#1F2121] shrink-0 shadow-lg bg-[#000]">
                          <img src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=333&color=fff`} alt="Profile" className="w-full h-full object-cover mix-blend-screen" />
                        </div>
                        <div className="overflow-hidden pb-1 flex-1">
                          <div className="flex justify-between items-center w-full">
                             <p className="font-bold text-sm text-white font-mono truncate">{user?.name || 'Director'}</p>
                             <p className="text-[10px] text-gray-300 opacity-50 font-mono tracking-widest pl-2">{user?.age ? `${user.age} YRS` : '#F7R'}</p>
                          </div>
                          <p className="text-[11px] text-emerald-400 opacity-90 font-mono truncate mt-0.5 uppercase tracking-wide">{user?.occupation || 'Administrator'}</p>
                          <p className="text-[10px] text-gray-400 opacity-80 font-mono truncate mt-0.5">{user?.email || 'guest@armour.ai'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Permissions & Auth Status */}
                    <div className="p-4 space-y-3 border-b border-white/10">
                      <div className="flex items-start gap-2">
                        <ShieldAlert size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[11px] font-bold text-emerald-500 font-mono uppercase tracking-widest">Clearance Active</p>
                          <p className="text-[10px] text-gray-300 opacity-80 mt-1.5 leading-relaxed font-mono">Neural environment initialized. Real-time synthesis access granted.</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="p-2">
                      <button 
                        onClick={onLogout}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 font-mono font-bold rounded-xl hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut size={16} />
                        DISCONNECT SESSION
                      </button>
                    </div>
                  </div>
                </CometCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Header;
