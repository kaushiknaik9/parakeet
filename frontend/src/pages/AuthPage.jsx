import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, LogIn, UserPlus, Briefcase, Building2 } from 'lucide-react';
import { loginUser, signupUser } from '../api/dealapi';

const AuthPage = ({ theme, onAuthSuccess }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email || !password || (!isLoginMode && !name)) return;
    
    setIsLoading(true);
    try {
      let userData;
      if (isLoginMode) {
        userData = await loginUser(email, password);
      } else {
        userData = await signupUser({ email, password, name, company_name: companyName, role });
      }
      onAuthSuccess(userData);
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    // Reset fields on toggle
    setName('');
    setEmail('');
    setPassword('');
    setCompanyName('');
    setRole('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 isolate">
      
      {/* Background Dimmer */}
      <div className="absolute inset-0 bg-[var(--bg-main)]/50 backdrop-blur-md -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95, filter: 'blur(10px)' }}
        transition={{ duration: 0.5, type: 'spring', damping: 25 }}
        className="relative w-full max-w-md"
      >
        {/* Glow behind the card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[var(--glass-base)]/30 via-[var(--text-main)]/10 to-[var(--glass-base)]/30 rounded-[2rem] blur-xl opacity-60 block" />

        <div className="relative glass-panel rounded-[2rem] border border-[var(--glass-border)] bg-[var(--glass-base)]/20 p-8 shadow-2xl backdrop-blur-2xl overflow-hidden">
          
          {/* Header & Logo */}
          <div className="flex flex-col items-center mb-8 mt-2">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 flex items-center justify-center mb-6 overflow-hidden rounded-2xl relative"
            >
              <div className="absolute inset-0 border border-[var(--glass-border)] bg-[var(--glass-base)]/10 rounded-2xl" />
              <div className="w-full h-full flex items-center justify-center mix-blend-screen" style={{ mixBlendMode: theme === 'dark' ? 'screen' : 'multiply' }}>
                <img 
                  src="/logo.png" 
                  alt="Armour" 
                  className={`w-full h-full object-contain scale-[1.3] ${
                    theme === 'dark' 
                      ? 'contrast-[2] grayscale invert opacity-100' 
                      : 'contrast-[1.5] grayscale opacity-90'
                  }`} 
                />
              </div>
            </motion.div>
            
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-main)] text-center mb-2">
              {isLoginMode ? 'Armour' : 'Join Armour'}
            </h1>
            <p className="text-[var(--text-muted)] text-sm text-center max-w-[280px]">
              {isLoginMode 
                ? 'Sign in to turn your deal conversations into agreements.'
                : 'Create an account to start extracting deals from your calls.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-xl text-center">
                {errorMsg}
              </div>
            )}
            <div className="space-y-4">
              
              <AnimatePresence mode="popLayout">
                {!isLoginMode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="relative flex flex-col gap-4"
                  >
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User size={18} className="text-[var(--text-main)] opacity-40" />
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full Name"
                        className="w-full pl-11 pr-4 py-3.5 bg-[var(--glass-base)]/5 border border-[var(--glass-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--text-main)]/30 focus:bg-[var(--glass-base)]/10 transition-colors text-[var(--text-main)] placeholder-[var(--text-main)]/20 shadow-inner"
                        required={!isLoginMode}
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Building2 size={18} className="text-[var(--text-main)] opacity-40" />
                      </div>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Company (optional)"
                        className="w-full pl-11 pr-4 py-3.5 bg-[var(--glass-base)]/5 border border-[var(--glass-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--text-main)]/30 focus:bg-[var(--glass-base)]/10 transition-colors text-[var(--text-main)] placeholder-[var(--text-main)]/20 shadow-inner"
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Briefcase size={18} className="text-[var(--text-main)] opacity-40" />
                      </div>
                      <input
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="Role (optional)"
                        className="w-full pl-11 pr-4 py-3.5 bg-[var(--glass-base)]/5 border border-[var(--glass-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--text-main)]/30 focus:bg-[var(--glass-base)]/10 transition-colors text-[var(--text-main)] placeholder-[var(--text-main)]/20 shadow-inner"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={18} className="text-[var(--text-main)] opacity-40" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full pl-11 pr-4 py-3.5 bg-[var(--glass-base)]/5 border border-[var(--glass-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--text-main)]/30 focus:bg-[var(--glass-base)]/10 transition-colors text-[var(--text-main)] placeholder-[var(--text-main)]/20 shadow-inner"
                  required
                />
              </div>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-[var(--text-main)] opacity-40" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-11 pr-4 py-3.5 bg-[var(--glass-base)]/5 border border-[var(--glass-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--text-main)]/30 focus:bg-[var(--glass-base)]/10 transition-colors text-[var(--text-main)] placeholder-[var(--text-main)]/20 shadow-inner"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className={`relative w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all overflow-hidden mt-6 ${
                isLoading
                  ? 'bg-[var(--glass-base)]/10 text-[var(--text-main)]/50 border border-[var(--glass-border)] cursor-not-allowed'
                  : 'bg-[var(--text-main)] text-[var(--bg-main)] shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]'
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-[var(--text-main)]/30 border-t-[var(--text-main)] rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLoginMode ? 'Sign In' : 'Create Account'}</span>
                  {isLoginMode ? <LogIn size={18} /> : <UserPlus size={18} />}
                </>
              )}
            </motion.button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              {isLoginMode ? "Don't have an account?" : "Already have an account?"}{' '}
              <button 
                onClick={toggleMode}
                className="text-[var(--text-main)] font-semibold hover:underline transition-all focus:outline-none"
              >
                {isLoginMode ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>
          
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
