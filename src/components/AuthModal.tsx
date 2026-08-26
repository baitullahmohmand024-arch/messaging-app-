import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User as UserIcon, ArrowRight, ShieldCheck, Phone, KeyRound, CheckCircle2, RotateCcw, Copy, Check, AlertCircle } from 'lucide-react';
import { 
  signInWithGoogle, 
  signInWithEmail, 
  signUpWithEmail, 
  signInAsGuest,
  sendPhoneVerificationCode,
  confirmPhoneCode,
  clearRecaptcha,
  ConfirmationResult
} from '../lib/firebase';
import { AvatarPicker } from './AvatarPicker';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup' | 'phone' | 'guest';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
  onSuccess
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'phone' | 'guest'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Phone Auth State
  const [phoneCountryCode, setPhoneCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phoneStep, setPhoneStep] = useState<'number' | 'code'>('number');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'unauthorized-domain' | 'sms-region-disabled' | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setErrorType(null);
    setInfoMessage(null);
    setPhoneStep('number');
    setConfirmationResult(null);
    setVerificationCode('');
    
    return () => {
      clearRecaptcha('recaptcha-container');
    };
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleCopyDomain = () => {
    if (currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setErrorType(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      const code = err?.code || '';
      const message = err?.message || '';
      if (code.includes('unauthorized-domain') || message.includes('unauthorized-domain')) {
        setErrorType('unauthorized-domain');
        setError(`Domain (${currentHostname}) is not yet added in Firebase Console → Authentication → Settings → Authorized domains.`);
      } else if (code.includes('popup-blocked') || message.includes('popup')) {
        setError('Popup blocked by browser. Please enable popups or sign in with your Phone or Email.');
      } else if (code.includes('popup-closed-by-user')) {
        setError('Sign in window was closed before finishing.');
      } else {
        setError(message || 'Google sign-in could not be completed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorType(null);
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

  // Phone Auth: Step 1 - Send Verification SMS
  const handleSendPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorType(null);
    setInfoMessage(null);

    const rawPhone = phoneNumber.replace(/[\s-()]/g, '');
    if (!rawPhone) {
      setError('Please enter a valid mobile number.');
      return;
    }

    // Build full E.164 phone string
    const fullPhone = rawPhone.startsWith('+') ? rawPhone : `${phoneCountryCode}${rawPhone.startsWith('0') ? rawPhone.slice(1) : rawPhone}`;
    
    setLoading(true);
    try {
      const confirmation = await sendPhoneVerificationCode(fullPhone, 'recaptcha-container');
      setConfirmationResult(confirmation);
      setPhoneStep('code');
      setInfoMessage(`Verification code sent via SMS to ${fullPhone}`);
    } catch (err: any) {
      console.error('Phone SMS Send Error:', err);
      let msg = err?.message || 'Failed to send SMS code.';
      const code = err?.code || '';
      const errMsg = err?.message || '';

      if (code === 'auth/operation-not-allowed' || errMsg.includes('SMS unable to be sent') || errMsg.includes('region enabled')) {
        setErrorType('sms-region-disabled');
        setError('Phone Authentication or SMS delivery for this region is not enabled in Firebase Console.');
      } else if (code === 'auth/invalid-phone-number') {
        msg = 'Invalid phone number format. Please ensure international country code is selected.';
        setError(msg);
      } else if (code === 'auth/quota-exceeded') {
        msg = 'SMS quota exceeded. You can sign in using Email or Instant Pass.';
        setError(msg);
      } else if (code === 'auth/captcha-check-failed' || errMsg.includes('reCAPTCHA')) {
        msg = 'reCAPTCHA verification re-initialized. Please tap Send again.';
        clearRecaptcha('recaptcha-container');
        setError(msg);
      } else if (code === 'auth/missing-phone-number') {
        msg = 'Phone number is required.';
        setError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Phone Auth: Step 2 - Verify Code
  const handleVerifyPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) {
      setError('Session expired. Please request a new verification code.');
      setPhoneStep('number');
      return;
    }

    const code = verificationCode.trim();
    if (!code || code.length < 6) {
      setError('Please enter the 6-digit SMS verification code.');
      return;
    }

    setError(null);
    setErrorType(null);
    setLoading(true);
    try {
      await confirmPhoneCode(confirmationResult, code, displayName.trim() || undefined);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Phone Verification Code Confirm Error:', err);
      let msg = err?.message || 'Invalid verification code.';
      if (err?.code === 'auth/invalid-verification-code') {
        msg = 'Incorrect 6-digit code. Please verify the code received in SMS.';
      } else if (err?.code === 'auth/code-expired') {
        msg = 'SMS code has expired. Please request a new code.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorType(null);
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

        {/* reCAPTCHA Invisible Container */}
        <div id="recaptcha-container" className="flex justify-center mb-2" />

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
            {mode === 'phone' ? <Phone className="w-5 h-5" /> : <ShieldCheck className="w-6 h-6" />}
          </div>
          <h2 className="text-xl font-serif font-medium tracking-wide text-white">
            {mode === 'signup' && 'Create Your Sanctuary'}
            {mode === 'signin' && 'Welcome Back'}
            {mode === 'phone' && (phoneStep === 'number' ? 'Phone Number Verification' : 'Enter SMS Code')}
            {mode === 'guest' && 'Instant Private Access'}
          </h2>
          <p className="text-xs text-white/50 mt-1 font-light">
            {mode === 'signup' && 'Set up your private presence for two.'}
            {mode === 'signin' && 'Enter your private space with your partner.'}
            {mode === 'phone' && (phoneStep === 'number' ? 'Secure authentication with direct SMS code.' : 'Enter the 6-digit code received on your phone.')}
            {mode === 'guest' && 'Quick direct sign-in for testing.'}
          </p>
        </div>

        {/* Navigation Mode Pills */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/5 rounded-xl mb-5 border border-white/5 text-xs font-medium text-white/60">
          <button
            type="button"
            onClick={() => {
              setMode('phone');
              setError(null);
            }}
            className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'phone' ? 'bg-[#D4AF37] text-black font-semibold shadow-sm' : 'hover:text-white'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Phone</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'signin' || mode === 'signup' ? 'bg-[#D4AF37] text-black font-semibold shadow-sm' : 'hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('guest');
              setError(null);
            }}
            className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'guest' ? 'bg-[#D4AF37] text-black font-semibold shadow-sm' : 'hover:text-white'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Instant</span>
          </button>
        </div>

        {/* Info or Success Notice */}
        {infoMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Error message & Actionable Guidance */}
        {error && (
          <div
            id="auth-error-banner"
            className="mb-4 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs space-y-2"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>

            {errorType === 'unauthorized-domain' && (
              <div className="mt-2 pt-2 border-t border-red-500/20 space-y-2">
                <div className="text-[11px] text-white/80">
                  Add this domain to Firebase Console → <b>Authentication</b> → <b>Settings</b> → <b>Authorized domains</b>:
                </div>
                <div className="flex items-center gap-2 bg-black/60 p-2 rounded-lg border border-white/10 font-mono text-[11px] text-white">
                  <span className="flex-1 truncate">{currentHostname}</span>
                  <button
                    type="button"
                    onClick={handleCopyDomain}
                    className="px-2.5 py-1 rounded bg-[#D4AF37] hover:bg-[#E5C07B] text-black text-[10px] font-semibold flex items-center gap-1 transition-all shrink-0"
                  >
                    {copiedDomain ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedDomain ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-white/60">Or use instant login:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('guest');
                      setError(null);
                    }}
                    className="text-[#D4AF37] hover:underline font-medium"
                  >
                    Use Instant Guest Pass →
                  </button>
                </div>
              </div>
            )}

            {errorType === 'sms-region-disabled' && (
              <div className="mt-2 pt-2 border-t border-red-500/20 space-y-1.5 text-[11px] text-white/70">
                <p>
                  To enable SMS: Go to Firebase Console → <b>Authentication</b> → <b>Sign-in method</b> → <b>Phone</b> → enable it, or add test phone numbers under <i>Phone numbers for testing</i>.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setError(null);
                    }}
                    className="text-[#D4AF37] hover:underline font-medium"
                  >
                    Sign in with Email instead
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('guest');
                      setError(null);
                    }}
                    className="text-white/80 hover:underline"
                  >
                    Instant Guest Pass
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE: PHONE AUTHENTICATION */}
        {mode === 'phone' && (
          <div>
            {phoneStep === 'number' ? (
              <form onSubmit={handleSendPhoneCode} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">Your Name (Optional)</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                    <input
                      type="text"
                      id="input-phone-display-name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Alex"
                      className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">Mobile Phone Number</label>
                  <div className="flex gap-2">
                    <select
                      value={phoneCountryCode}
                      onChange={(e) => setPhoneCountryCode(e.target.value)}
                      className="bg-black/50 border border-white/10 rounded-xl px-2.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]/60"
                    >
                      <option value="+1">🇺🇸 +1 (US/CA)</option>
                      <option value="+92">🇵🇰 +92 (PK)</option>
                      <option value="+44">🇬🇧 +44 (UK)</option>
                      <option value="+91">🇮🇳 +91 (IN)</option>
                      <option value="+971">🇦🇪 +971 (UAE)</option>
                      <option value="+966">🇸🇦 +966 (SA)</option>
                      <option value="+49">🇩🇪 +49 (DE)</option>
                      <option value="+33">🇫🇷 +33 (FR)</option>
                      <option value="+61">🇦🇺 +61 (AU)</option>
                      <option value="+81">🇯🇵 +81 (JP)</option>
                      <option value="+86">🇨🇳 +86 (CN)</option>
                      <option value="+55">🇧🇷 +55 (BR)</option>
                    </select>

                    <div className="relative flex-1">
                      <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                      <input
                        type="tel"
                        id="input-auth-phone-number"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="300 1234567"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/60 font-mono"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-white/40 mt-1">Firebase will send an SMS with a one-time verification code.</p>
                </div>

                <button
                  type="submit"
                  id="btn-send-sms-code"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#D4AF37] hover:bg-[#E5C07B] text-black text-sm font-semibold tracking-wide transition-all disabled:opacity-50 mt-4 shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  <span>{loading ? 'Sending SMS Code...' : 'Send Verification Code'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyPhoneCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">6-Digit Verification Code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                    <input
                      type="text"
                      id="input-auth-otp-code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      maxLength={6}
                      autoFocus
                      required
                      className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/15 rounded-xl text-lg text-center tracking-[0.4em] font-mono text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-white/50">
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneStep('number');
                      setError(null);
                      setInfoMessage(null);
                    }}
                    className="hover:text-white transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Change phone number</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendPhoneCode}
                    disabled={loading}
                    className="text-[#D4AF37] hover:underline"
                  >
                    Resend Code
                  </button>
                </div>

                <button
                  type="submit"
                  id="btn-verify-otp-submit"
                  disabled={loading || verificationCode.length < 6}
                  className="w-full py-3 rounded-xl bg-[#D4AF37] hover:bg-[#E5C07B] text-black text-sm font-semibold tracking-wide transition-all disabled:opacity-50 mt-2 shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  <span>{loading ? 'Verifying...' : 'Verify & Enter Sanctuary'}</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        )}

        {/* MODE: EMAIL SIGNIN / SIGNUP */}
        {(mode === 'signin' || mode === 'signup') && (
          <div>
            {/* Google One-Click Action */}
            <div className="mb-4">
              <button
                type="button"
                id="btn-auth-google"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-sm font-medium text-white transition-all disabled:opacity-50 active:scale-[0.99]"
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

              <div className="flex items-center gap-3 my-3.5">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] uppercase tracking-widest text-white/30 font-light">or with email</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-3">
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
                className="w-full py-3 rounded-xl bg-[#D4AF37] hover:bg-[#E5C07B] text-black text-sm font-semibold tracking-wide transition-all disabled:opacity-50 mt-3 shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                <span>{loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/50">
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
              ) : (
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
              )}
            </div>
          </div>
        )}

        {/* MODE: GUEST / INSTANT PASS */}
        {mode === 'guest' && (
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
              className="w-full py-3 rounded-xl bg-[#D4AF37] hover:bg-[#E5C07B] text-black text-sm font-semibold tracking-wide transition-all disabled:opacity-50 mt-2 shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <span>{loading ? 'Starting...' : 'Enter Private Room'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
