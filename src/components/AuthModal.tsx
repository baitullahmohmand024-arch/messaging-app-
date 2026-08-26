import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsGuest } from '../lib/firebase';
import { AvatarPicker } from './AvatarPicker';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup' | 'guest';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
  onSuccess
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'guest'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      const code = err?.code || '';
      if (code.includes('popup-blocked') || err?.message?.includes('popup')) {
        setError('Popup blocked by browser. Please enable popups or sign in with your email address below.');
      } else if (code.includes('popup-closed-by-user')) {
        setError('Sign in window was closed before finishing.');
      } else if (code.includes('unauthorized-domain')) {
        setError('Domain not authorized in Firebase Auth. You can also sign in with Email & Password or Instant Access.');
      } else {
        setError(err?.message || 'Google sign-in could not be completed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (!displayName.trim()) {
          setError('Please provide a display name.');
          setLoading(false);
          return;
        }
        await signUpWithEmail(email.trim(), password, displayName.trim());
      } else if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err?.message || 'Authentication failed.';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        msg = 'Incorrect email or password.';
      } else if (msg.includes('email-already-in-use')) {
        msg = 'An account with this email already exists.';
      } else if (msg.includes('weak-password')) {
        msg = 'Password should be at least 6 characters.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const name = displayName.trim() || 'Private Member';
      await signInAsGuest(name);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Guest sign in error:', err);
      setError('Could not start quick session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="auth-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity"
    >
      <div
        id="auth-modal-card"
        className="w-full max-w-md bg-[#121418] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Subtle accent glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          id="btn-close-auth-modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/40 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-light tracking-wide text-white">
            {mode === 'signup' && 'Create Your Sanctuary'}
            {mode === 'signin' && 'Welcome Back'}
            {mode === 'guest' && 'Instant Private Access'}
          </h2>
          <p className="text-xs text-white/50 mt-1 font-light">
            {mode === 'signup' && 'Set up your private presence for two.'}
            {mode === 'signin' && 'Enter your private space with your partner.'}
            {mode === 'guest' && 'Quick direct sign-in for seamless testing.'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div
            id="auth-error-banner"
            className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-200 text-xs flex items-center gap-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google One-Click Action */}
        {mode !== 'guest' && (
          <div className="mb-5">
            <button
              type="button"
              id="btn-auth-google"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-sm font-medium text-white transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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

            <div className="flex items-center gap-3 my-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] uppercase tracking-widest text-white/30 font-light">or with email</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
          </div>
        )}

        {/* Email or Guest Form */}
        {mode === 'guest' ? (
          <form onSubmit={handleGuestSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">Your Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  id="input-guest-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/60"
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-submit-guest"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#D4AF37] hover:bg-[#E5C07B] text-black text-sm font-semibold tracking-wide transition-all disabled:opacity-50 mt-2 shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Starting...' : 'Enter Private Room'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <>
                <AvatarPicker
                  currentPhoto={avatarUrl}
                  onSelectPhoto={(url) => setAvatarUrl(url)}
                />
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">Your Display Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                    <input
                      type="text"
                      id="input-auth-name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/60"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  id="input-auth-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                <input
                  type="password"
                  id="input-auth-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/60"
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-submit-auth-form"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#D4AF37] hover:bg-[#E5C07B] text-black text-sm font-semibold tracking-wide transition-all disabled:opacity-50 mt-4 shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Mode Switcher */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-white/50">
          {mode === 'signin' ? (
            <>
              <span>Don't have an account?</span>
              <button
                type="button"
                id="btn-switch-to-signup"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className="text-[#D4AF37] hover:underline font-medium"
              >
                Create one
              </button>
            </>
          ) : mode === 'signup' ? (
            <>
              <span>Already have an account?</span>
              <button
                type="button"
                id="btn-switch-to-signin"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                className="text-[#D4AF37] hover:underline font-medium"
              >
                Sign In
              </button>
            </>
          ) : (
            <div className="w-full text-center">
              <button
                type="button"
                id="btn-switch-guest-to-signin"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                className="text-[#D4AF37] hover:underline font-medium"
              >
                Sign in with existing account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
