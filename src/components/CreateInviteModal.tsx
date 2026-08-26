import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Share2, Sparkles, QrCode, Shield, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, Invitation } from '../types';
import { createPrivateInvitation, db } from '../lib/firebase';
import { playConnectChime } from '../lib/audio';
import { doc, onSnapshot } from 'firebase/firestore';

interface CreateInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onConnected: (connectionId: string) => void;
  soundEnabled?: boolean;
}

export const CreateInviteModal: React.FC<CreateInviteModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onConnected,
  soundEnabled = true
}) => {
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Generate invitation when modal opens
  useEffect(() => {
    if (isOpen && currentUser && !invitation) {
      generateNewInvite();
    }
  }, [isOpen, currentUser]);

  // Real-time listener for invitation acceptance
  useEffect(() => {
    if (!invitation?.id) return;

    const unsub = onSnapshot(doc(db, 'invitations', invitation.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Invitation;
        if (data.status === 'accepted') {
          // Trigger celebration
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#D4AF37', '#F3E5AB', '#FFFFFF', '#E5C07B']
          });
          playConnectChime(soundEnabled);
          
          // Look for active connection on user
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      }
    });

    return () => unsub();
  }, [invitation?.id, soundEnabled, onClose]);

  const generateNewInvite = async () => {
    setLoading(true);
    try {
      const inv = await createPrivateInvitation(currentUser);
      setInvitation(inv);
    } catch (err) {
      console.error('Failed to create invite:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const inviteUrl = invitation ? `${currentUrl}/?connect=${invitation.token}` : '';

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      // fallback
    }
  };

  const handleShare = async () => {
    if (!inviteUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MY LOVE IS HERE — Private Sanctuary Invitation',
          text: `Join my private space on MY LOVE IS HERE:`,
          url: inviteUrl
        });
      } catch (err) {
        // user cancelled share
      }
    } else {
      handleCopy();
    }
  };

  // QR Code URL via clean Google Chart API
  const qrUrl = inviteUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(inviteUrl)}&bgcolor=121418&color=D4AF37&margin=10`
    : '';

  return (
    <div
      id="create-invite-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <div
        id="create-invite-modal-card"
        className="w-full max-w-md bg-[#121418] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden"
      >
        <button
          type="button"
          id="btn-close-create-invite"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/40 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] mb-3">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-light tracking-wide text-white font-serif">
            Invite Your Partner
          </h2>
          <p className="text-xs text-white/50 mt-1 font-light max-w-xs mx-auto">
            Share this private link. Once they accept, your exclusive two-person room will be unlocked.
          </p>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 text-[#D4AF37] animate-spin" />
            <span className="text-xs text-white/50">Generating private key...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {showQR ? (
              <div className="flex flex-col items-center py-3">
                <div className="p-3 bg-[#090A0C] border border-[#D4AF37]/30 rounded-2xl shadow-xl mb-3">
                  <img
                    src={qrUrl}
                    alt="Invite QR Code"
                    className="w-44 h-44 rounded-xl"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <p className="text-[11px] text-white/40">Point phone camera to join instantly</p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-white/60 mb-2">
                  Private Link (One-Time Token)
                </label>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/50 border border-white/10 focus-within:border-[#D4AF37]/50">
                  <input
                    type="text"
                    id="input-invite-url"
                    readOnly
                    value={inviteUrl}
                    className="w-full bg-transparent text-xs text-white/80 select-all focus:outline-none font-mono truncate"
                  />
                  <button
                    type="button"
                    id="btn-copy-invite-link"
                    onClick={handleCopy}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 transition-colors shrink-0 flex items-center gap-1.5 text-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                id="btn-share-invite"
                onClick={handleShare}
                className="py-3 px-4 rounded-xl bg-[#D4AF37] hover:bg-[#E5C07B] text-black text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/20"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Link</span>
              </button>

              <button
                type="button"
                id="btn-toggle-qr"
                onClick={() => setShowQR(!showQR)}
                className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-medium text-white transition-all flex items-center justify-center gap-2"
              >
                <QrCode className="w-4 h-4 text-[#D4AF37]" />
                <span>{showQR ? 'Show Link' : 'Show QR'}</span>
              </button>
            </div>

            {/* Live listening pulse */}
            <div className="pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-white/40">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4AF37]" />
              </span>
              <span>Waiting for partner to connect...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
