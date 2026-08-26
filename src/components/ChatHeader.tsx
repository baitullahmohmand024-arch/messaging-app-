import React from 'react';
import { Lock, Settings, Sparkles } from 'lucide-react';
import { ConnectionMemberInfo } from '../types';

interface ChatHeaderProps {
  partner: ConnectionMemberInfo | null;
  isPartnerTyping: boolean;
  onOpenPartnerProfile: () => void;
  onOpenSettings: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  partner,
  isPartnerTyping,
  onOpenPartnerProfile,
  onOpenSettings
}) => {
  const formatLastSeen = (timestamp: number) => {
    if (!timestamp) return 'Offline';
    const diffMin = Math.floor((Date.now() - timestamp) / 60000);
    if (diffMin < 1) return 'Active just now';
    if (diffMin < 60) return `Active ${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Active ${diffHours}h ago`;
    return `Last seen ${new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  };

  return (
    <header
      id="chat-header"
      className="h-16 px-4 md:px-6 bg-[#090A0C]/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between z-30 shrink-0 select-none"
    >
      {/* Left: Partner Profile Info */}
      <button
        type="button"
        id="btn-partner-header-profile"
        onClick={onOpenPartnerProfile}
        className="flex items-center gap-3 text-left p-1 rounded-xl hover:bg-white/5 transition-colors group"
      >
        <div className="relative">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-[#D4AF37]/40 bg-[#1A1D24] shadow-md flex items-center justify-center">
            {partner?.photoURL ? (
              <img
                src={partner.photoURL}
                alt={partner.displayName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-sm font-serif text-[#D4AF37]">
                {partner?.displayName?.charAt(0).toUpperCase() || 'P'}
              </span>
            )}
          </div>
          {partner?.isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#090A0C]" />
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-white group-hover:text-[#D4AF37] transition-colors">
              {partner?.displayName || 'Private Connection'}
            </span>
            <Lock className="w-3 h-3 text-[#D4AF37]/60" />
          </div>

          <div className="text-[11px] font-light">
            {isPartnerTyping ? (
              <span className="text-[#D4AF37] font-medium flex items-center gap-1 animate-pulse">
                <span>typing</span>
                <span className="inline-flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-[#D4AF37] animate-bounce" />
                  <span className="w-1 h-1 rounded-full bg-[#D4AF37] animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1 h-1 rounded-full bg-[#D4AF37] animate-bounce [animation-delay:0.4s]" />
                </span>
              </span>
            ) : partner?.isOnline ? (
              <span className="text-emerald-400/80">Active now</span>
            ) : (
              <span className="text-white/40">{formatLastSeen(partner?.lastSeen || 0)}</span>
            )}
          </div>
        </div>
      </button>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          id="btn-open-settings"
          onClick={onOpenSettings}
          className="p-2.5 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
          title="Room Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
