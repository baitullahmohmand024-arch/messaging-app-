import React from 'react';
import { Shield, Sparkles, Link2, KeyRound, Mail, ArrowRight, Lock, LogOut, CheckCircle2, Phone } from 'lucide-react';
import { UserProfile } from '../types';

interface WelcomeScreenProps {
  currentUser: UserProfile | null;
  onOpenAuth: (mode: 'signin' | 'signup' | 'guest') => void;
  onGoogleSignIn: () => void;
  onCreateLink: () => void;
  onJoinLink: () => void;
  onSignOut?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  currentUser,
  onOpenAuth,
  onGoogleSignIn,
  onCreateLink,
  onJoinLink,
  onSignOut
}) => {
  return (
    <div
      id="welcome-screen-container"
      className="min-h-screen w-full flex flex-col justify-between items-center p-6 md:p-12 relative overflow-hidden bg-[#090A0C] text-white selection:bg-[#D4AF37]/30"
    >
      {/* Ambient background subtle luxury lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-[#D42B4E]/5 rounded-full blur-[110px] pointer-events-none" />

      {/* Top Bar / Official Brand Wordmark */}
      <header className="w-full max-w-md flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full border border-[#D4AF37]/40 bg-white/5 flex items-center justify-center shadow-sm">
            <span className="text-[#D4AF37] font-serif text-sm">✦</span>
          </div>
          <span className="text-xs uppercase tracking-[0.24em] text-white/80 font-medium font-serif">
            MY LOVE IS HERE
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/50">
          <Lock className="w-3 h-3 text-[#D4AF37]" />
          <span>Sanctuary for Two</span>
        </div>
      </header>

      {/* Center Hero */}
      <main className="w-full max-w-md my-auto py-8 text-center flex flex-col items-center z-10">
        {/* Luxury Brand Emblem */}
        <div className="relative mb-6 group">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#1A1D24] to-[#121418] border border-white/10 flex items-center justify-center shadow-2xl shadow-black/80 relative">
            <div className="w-12 h-12 rounded-2xl border border-[#D4AF37]/40 flex items-center justify-center">
              <span className="font-serif text-2xl text-[#D4AF37] tracking-wider">✦</span>
            </div>
          </div>
          <div className="absolute -inset-1 rounded-3xl bg-[#D4AF37]/10 blur-md -z-10 group-hover:bg-[#D4AF37]/20 transition-all duration-700" />
        </div>

        {/* Brand Headline */}
        <h1 className="text-2xl sm:text-3xl font-medium tracking-[0.16em] uppercase text-white mb-2 font-serif">
          MY LOVE IS HERE
        </h1>
        <p className="text-xs sm:text-sm text-white/50 max-w-xs mx-auto leading-relaxed font-light mb-8">
          An intimate, real-time sanctuary reserved exclusively for you and your partner.
        </p>

        {/* Primary Action Stack */}
        <div className="w-full space-y-3">
          {currentUser ? (
            <div className="space-y-3">
              {/* Account Details Card */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left flex items-center gap-3 relative">
                <div className="w-12 h-12 rounded-full bg-[#1A1D24] border border-[#D4AF37]/40 overflow-hidden flex items-center justify-center shrink-0">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-[#D4AF37] font-semibold text-base">
                      {currentUser.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-white truncate">{currentUser.displayName}</p>
                    {currentUser.email && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                  </div>

                  {currentUser.email ? (
                    <div className="flex items-center gap-1.5 text-xs text-[#D4AF37]/90 mt-0.5 truncate font-mono">
                      <Mail className="w-3 h-3 shrink-0 text-[#D4AF37]" />
                      <span className="truncate">{currentUser.email}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-white/40 font-light mt-0.5">Guest Pass Session</p>
                  )}
                </div>

                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    title="Switch or Sign Out Account"
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors shrink-0"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                id="btn-welcome-create-link"
                onClick={onCreateLink}
                className="w-full py-3.5 px-4 rounded-xl bg-[#D4AF37] hover:bg-[#E5C07B] text-black text-sm font-medium tracking-wide shadow-lg shadow-[#D4AF37]/20 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                <Link2 className="w-4 h-4" />
                <span>Create Private Link</span>
              </button>

              <button
                type="button"
                id="btn-welcome-join-link"
                onClick={onJoinLink}
                className="w-full py-3.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-sm font-medium text-white transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                <KeyRound className="w-4 h-4 text-[#D4AF37]" />
                <span>Join with Link</span>
              </button>

              {!currentUser.email && (
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-white/60 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.8 5 12 5z"/>
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                    <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.6 7.2C.6 9.2 0 11.5 0 14s.6 4.8 1.6 6.8l3.7-2.9z"/>
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.2 0-5.8-2.4-6.7-5.3L1.6 15.9C3.5 19.7 7.4 23 12 23z"/>
                  </svg>
                  <span>Connect Google Account</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Google Button */}
              <button
                type="button"
                id="btn-welcome-google"
                onClick={onGoogleSignIn}
                className="w-full py-3.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-sm font-medium text-white transition-all flex items-center justify-center gap-3 active:scale-[0.99]"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.8 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.6 7.2C.6 9.2 0 11.5 0 14s.6 4.8 1.6 6.8l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.2 0-5.8-2.4-6.7-5.3L1.6 15.9C3.5 19.7 7.4 23 12 23z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Email Button */}
              <button
                type="button"
                id="btn-welcome-email"
                onClick={() => onOpenAuth('signin')}
                className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white/90 transition-all flex items-center justify-center gap-2.5"
              >
                <Mail className="w-4 h-4 text-white/60" />
                <span>Continue with Email</span>
              </button>

              {/* Phone / Instant Option */}
              <button
                type="button"
                id="btn-welcome-guest"
                onClick={() => onOpenAuth('guest')}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-white/70 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Continue with Phone / Instant Pass</span>
              </button>

              <div className="pt-2.5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] uppercase tracking-widest text-white/30 font-light">Direct Room Connection</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                <button
                  type="button"
                  id="btn-welcome-create-direct"
                  onClick={onCreateLink}
                  className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-[#D4AF37]/30 text-xs font-medium text-[#D4AF37] transition-all flex items-center justify-center gap-1.5"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Create Private Link</span>
                </button>
                <button
                  type="button"
                  id="btn-welcome-join-direct"
                  onClick={onJoinLink}
                  className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/70 transition-all flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Join with Link</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer Promise */}
      <footer className="w-full max-w-md text-center z-10 text-[11px] text-white/30 font-light flex items-center justify-center gap-4">
        <span className="flex items-center gap-1">
          <Shield className="w-3 h-3 text-[#D4AF37]/70" />
          End-to-end Private
        </span>
        <span>•</span>
        <span>Reserved for Two</span>
        <span>•</span>
        <span>No Feeds</span>
      </footer>
    </div>
  );
};
