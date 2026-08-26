import React, { useState } from 'react';
import { X, Calendar, Shield, Image as ImageIcon, Film, Mic, UserX, AlertTriangle, Sparkles } from 'lucide-react';
import { ConnectionMemberInfo, Message } from '../types';

interface PartnerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner: ConnectionMemberInfo | null;
  connectionCreatedAt: number;
  messages: Message[];
  onOpenMedia: (url: string, type: 'image' | 'video') => void;
  onDisconnect: () => void;
}

export const PartnerProfileModal: React.FC<PartnerProfileModalProps> = ({
  isOpen,
  onClose,
  partner,
  connectionCreatedAt,
  messages,
  onOpenMedia,
  onDisconnect
}) => {
  const [activeTab, setActiveTab] = useState<'media' | 'voice' | 'details'>('media');
  const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false);

  if (!isOpen || !partner) return null;

  // Filter media from messages
  const imageMessages = messages.filter((m) => m.type === 'image' && m.mediaUrl && !m.isDeleted);
  const videoMessages = messages.filter((m) => m.type === 'video' && m.mediaUrl && !m.isDeleted);
  const voiceMessages = messages.filter((m) => m.type === 'audio' && m.mediaUrl && !m.isDeleted);

  // Calculate days connected
  const daysConnected = Math.max(
    1,
    Math.ceil((Date.now() - connectionCreatedAt) / (1000 * 60 * 60 * 24))
  );

  const formattedDate = new Date(connectionCreatedAt).toLocaleDateString([], {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div
      id="partner-profile-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <div
        id="partner-profile-card"
        className="w-full max-w-md bg-[#121418] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Close Button */}
        <button
          type="button"
          id="btn-close-partner-profile"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/40 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Profile Header */}
        <div className="flex flex-col items-center text-center pb-6 border-b border-white/5">
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#D4AF37]/50 bg-[#1A1D24] shadow-xl flex items-center justify-center">
              {partner.photoURL ? (
                <img
                  src={partner.photoURL}
                  alt={partner.displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-3xl font-serif text-[#D4AF37]">
                  {partner.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {partner.isOnline && (
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#121418]" />
            )}
          </div>

          <h2 className="text-xl font-light tracking-wide text-white font-serif">
            {partner.displayName}
          </h2>
          
          <div className="flex items-center gap-1.5 mt-1 text-xs text-white/50 font-light">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
            <span>{partner.isOnline ? 'Online now' : 'Private Connection'}</span>
          </div>

          {/* Connection Milestone Pill */}
          <div className="mt-4 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center gap-2 text-xs text-[#D4AF37]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Connected for {daysConnected} {daysConnected === 1 ? 'day' : 'days'}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-center gap-2 py-3 border-b border-white/5">
          <button
            type="button"
            id="tab-partner-media"
            onClick={() => setActiveTab('media')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'media'
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Photos & Videos ({imageMessages.length + videoMessages.length})</span>
          </button>

          <button
            type="button"
            id="tab-partner-details"
            onClick={() => setActiveTab('details')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'details'
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Privacy</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto py-4 no-scrollbar">
          {activeTab === 'media' ? (
            <div>
              {imageMessages.length === 0 && videoMessages.length === 0 ? (
                <div className="py-12 text-center text-xs text-white/40 font-light">
                  No shared photos or videos yet.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {imageMessages.map((msg) => (
                    <button
                      key={msg.id}
                      type="button"
                      onClick={() => onOpenMedia(msg.mediaUrl!, 'image')}
                      className="aspect-square rounded-xl overflow-hidden border border-white/10 hover:opacity-90 transition-opacity relative group"
                    >
                      <img
                        src={msg.thumbnailUrl || msg.mediaUrl}
                        alt="Shared"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                  {videoMessages.map((msg) => (
                    <button
                      key={msg.id}
                      type="button"
                      onClick={() => onOpenMedia(msg.mediaUrl!, 'video')}
                      className="aspect-square rounded-xl overflow-hidden border border-white/10 hover:opacity-90 transition-opacity relative group bg-black"
                    >
                      <img
                        src={msg.thumbnailUrl}
                        alt="Video"
                        className="w-full h-full object-cover opacity-80"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Film className="w-5 h-5 text-white/90" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 text-xs font-light text-white/70">
              <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
                <div className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Connection Established</div>
                <div className="text-white font-normal">{formattedDate}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
                <div className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Security State</div>
                <div className="text-emerald-400 font-medium flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Private Cryptographic Room</span>
                </div>
                <p className="text-[11px] text-white/40 pt-1 leading-relaxed">
                  Only the two verified participants have database permissions to exchange messages in this space.
                </p>
              </div>

              {/* Disconnect Action */}
              <div className="pt-2">
                {showConfirmDisconnect ? (
                  <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 space-y-3">
                    <div className="flex items-center gap-2 text-red-300 font-medium text-xs">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Disconnect private connection?</span>
                    </div>
                    <p className="text-[11px] text-red-200/70 leading-relaxed">
                      This will close your private space. You will need a new private link to reconnect.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        id="btn-cancel-disconnect"
                        onClick={() => setShowConfirmDisconnect(false)}
                        className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs"
                      >
                        Keep Room
                      </button>
                      <button
                        type="button"
                        id="btn-confirm-disconnect"
                        onClick={onDisconnect}
                        className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-xs"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    id="btn-prompt-disconnect"
                    onClick={() => setShowConfirmDisconnect(true)}
                    className="w-full py-2.5 px-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-950/20 text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Disconnect Partner</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
