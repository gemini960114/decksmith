
import React, { useState } from 'react';
import { validateApiKey } from '../services/gemini';
import { APP_CONFIG } from '../constants';

interface AuthProps {
  onLogin: (apiKey: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isKeepLoggedIn, setIsKeepLoggedIn] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 1. Check Invite Code
      if (inviteCode !== APP_CONFIG.INVITATION_CODE) {
        throw new Error("Invalid Invitation Code");
      }

      const trimmedKey = apiKey.trim();

      // 2. Preliminary Format Check
      if (!trimmedKey) {
        throw new Error("Please enter an API Key");
      }

      // Google API keys typically start with "AIza"
      if (!trimmedKey.startsWith("AIza")) {
        throw new Error("Invalid API Key format. Key must start with 'AIza'.");
      }

      // 3. API Key Validation (Network)
      const isValid = await validateApiKey(trimmedKey);
      if (!isValid) {
        throw new Error("API Key validation failed. Please check your key or network connection.");
      }

      // 4. Persistence (Keep me logged in)
      if (isKeepLoggedIn) {
        // Simple base64 encoding for obscurity (not encryption) as per requirements
        const encodedKey = btoa(trimmedKey);
        localStorage.setItem(APP_CONFIG.AUTH_STORAGE_KEY, encodedKey);
      }

      // 5. Success
      onLogin(trimmedKey);
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-200">
      <div className="w-full max-w-[420px] bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-500">
        
        {/* Header Section - Teal Background */}
        <div className="bg-[#0c6b5e] pt-12 pb-10 px-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-black/20">
            <span className="text-3xl font-black italic text-[#0c6b5e] select-none tracking-tighter">DS</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">DeckSmith</h1>
          <p className="text-teal-100 font-medium text-sm">Build editable slides from PDFs.</p>
        </div>

        {/* Form Section - White Background */}
        <div className="p-8 pb-10 flex-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Invitation Code */}
            <div className="space-y-2 relative">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                Invitation Code
              </label>

              <input
                type="password"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all font-medium text-sm"
                placeholder="Enter access code"
                required
              />

              <span className="absolute top-1 left-auto right-3 -translate-y-1/2 bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm border border-slate-200">
                Code: {APP_CONFIG.INVITATION_CODE}
              </span>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Google API Key</label>
              <input 
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all font-medium text-sm font-mono"
                placeholder="AIza..."
                required
              />
            </div>

            {/* Options */}
            <div className="flex items-center gap-3 pl-1">
              <input 
                type="checkbox" 
                id="keep-logged-in"
                checked={isKeepLoggedIn}
                onChange={(e) => setIsKeepLoggedIn(e.target.checked)}
                className="w-5 h-5 accent-teal-600 rounded border-slate-300 cursor-pointer"
              />
              <label htmlFor="keep-logged-in" className="text-xs font-bold text-slate-500 cursor-pointer select-none">
                Keep me logged in
              </label>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-bold flex items-center gap-2 animate-pulse border border-red-100">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className={`
                w-full py-4 rounded-xl font-bold text-sm text-white uppercase tracking-wider shadow-xl transition-all transform active:scale-[0.98] flex justify-center items-center gap-2
                ${isLoading ? 'bg-slate-800 cursor-wait opacity-80' : 'bg-[#0f172a] hover:bg-black shadow-slate-900/20'}
              `}
            >
              {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
              {isLoading ? 'Verifying...' : 'Continue'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-slate-400 hover:text-teal-600 transition-colors uppercase tracking-wider">
              Get a Google API Key
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
