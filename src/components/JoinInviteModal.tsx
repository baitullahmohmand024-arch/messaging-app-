import React, { useState, useEffect } from 'react';
import { X, KeyRound, ArrowRight, UserCheck, AlertCircle, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, Invitation, Connection } from '../types';
import { getInvitationByToken, acceptPrivateInvitation } from '../lib/firebase';
import { playConnectChime } from '../lib/audio';

interface JoinInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  initialToken?: string;
  onConnected: (connection: Connection) => void;
  soundEnabled?: boolean;
}

export const JoinInviteModal: React.FC<JoinInviteModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialToken = '',
  onConnected,
  soundEnabled = true
}) => {
  const [tokenInput, setTokenInput] = useState(initialToken);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialToken) {
      setTokenInput(initialToken);
      verifyToken(initialToken);
    }
  }, [initialToken]);

  const verifyToken = async (rawToken: string) => {
    let clean = rawToken.trim();
    // Extract token if user pasted full URL
    if (clean.includes('connect=')) {
      clean = clean.split('connect=')[1].split('&')[0];
    }
    if (!clean) {
      setError('Please provide a valid token or link.');
      return;
    }

    setError(null);
    setIsVerifying(true);
    try {
      const inv = await getInvitationByToken(clean);
      if (!inv) {
        setError('Invitation not found. Please verify the link or request a new one.');
        setInvitation(null);
      } else if (inv.createdBy === currentUser.uid) {
        setError('This is your own invitation link. Send it to your partner.');
        setInvitation(null);
      } else if (inv.status !== 'pending') {
        setError('This invitation has already been claimed or expired.');
        setInvitation(null);
      } else if (Date.now() > inv.expiresAt) {
        setError('This invitation link has expired.');
        setInvitation(null);
      } else {
        setInvitation(inv);
      }
    } catch (err: any) {
      console.error('Error verifying token:', err);
      setError('Could not verify invitation. Please check your connection.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAccept = async () => {
    if (!invitation) return;
    setError(null);
    setIsAccepting(true);
    try {
      const connection = await acceptPrivateInvitation(invitation, currentUser);
      
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#F3E5AB', '#FFFFFF', '#E5C07B']
      });
      playConnectChime(soundEnabled);

      onConnected(connection);
      onClose();
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      setError(err?.message || 'Could not establish connection.');
    } finally {
      setIsAccepting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="join-invite-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <div
        id="join-invite-modal-card"
        className="w-full max-w-md bg-[#121418] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden"
      >
        <button
          type="button"
          id="btn-close-join-invite"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/40 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] mb-3">
            <KeyRound className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-light tracking-wide text-white font-serif">
            Join Private Space
          </h2>
          <p className="text-xs text-white/50 mt-1 font-light max-w-xs mx-auto">
            Enter the private token or invitation link sent by your partner.
          </p>
        </div>

        {error && (
          <div
            id="join-error-banner"
            className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-200 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!invitation ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              verifyToken(tokenInput);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-white/60 mb-2">
                Invitation Token or URL
              </label>
              <input
                type="text"
                id="input-join-token"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste link or token here..."
                required
                className="w-full px-3.5 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/60 font-mono text-xs"
              />
            </div>

            <button
              type="submit"
              id="btn-verify-token"
              disabled={isVerifying || !tokenInput.trim()}
              className="w-full py-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C07B] text-black text-xs font-semibold tracking-wide transition-all disabled:opacity-50 shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Token...</span>
                </>
              ) : (
                <>
                  <span>Verify Invitation</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Invitation Preview Card */}
            <div className="p-5 rounded-2xl bg-black/40 border border-[#D4AF37]/30 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-[#1A1D24] border-2 border-[#D4AF37]/40 overflow-hidden flex items-center justify-center mb-3 shadow-lg">
                {invitation.creatorPhoto ? (
                  <img
                    src={invitation.creatorPhoto}
                    alt={invitation.creatorName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-[#D4AF37] font-semibold text-lg">
                    {invitation.creatorName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <h3 className="text-base font-medium text-white">
                Connect with {invitation.creatorName}?
              </h3>
              <p className="text-xs text-white/40 mt-1 font-light">
                This will establish your exclusive private chat.
              </p>
            </div>

            {/* Confirmation buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="btn-cancel-connection"
                onClick={() => setInvitation(null)}
                className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/70 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-connection"
                onClick={handleAccept}
                disabled={isAccepting}
                className="py-3 px-4 rounded-xl bg-[#D4AF37] hover:bg-[#E5C07B] text-black text-xs font-semibold tracking-wide transition-all shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-1.5"
              >
                {isAccepting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <UserCheck className="w-4 h-4" />
                )}
                <span>{isAccepting ? 'Connecting...' : 'Connect'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
