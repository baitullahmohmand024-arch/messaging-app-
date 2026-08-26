import React, { useRef, useEffect, useState } from 'react';
import { Sparkles, ArrowDown, Lock } from 'lucide-react';
import { Message, UserProfile } from '../types';
import { MessageBubble } from './MessageBubble';
import { markMessagesAsRead } from '../lib/firebase';

interface MessageListProps {
  messages: Message[];
  currentUser: UserProfile;
  connectionId: string;
  partnerName?: string;
  onOpenMedia: (url: string, type: 'image' | 'video') => void;
  onReply: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUser,
  connectionId,
  partnerName,
  onOpenMedia,
  onReply,
  onReact,
  onDelete
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Auto scroll to bottom
  const scrollToBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, []);

  useEffect(() => {
    scrollToBottom(true);
    // Mark incoming messages as read
    if (messages.length > 0) {
      markMessagesAsRead(connectionId, messages, currentUser.uid);
    }
  }, [messages.length, connectionId, currentUser.uid]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 180;
    setShowScrollBottom(isUp);
  };

  // Group messages by date
  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { dateLabel: string; items: Message[] }[] = [];
    msgs.forEach((msg) => {
      const msgDate = new Date(msg.createdAt);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      let dateLabel = msgDate.toLocaleDateString([], {
        month: 'long',
        day: 'numeric',
        year: msgDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });

      if (msgDate.toDateString() === today.toDateString()) {
        dateLabel = 'Today';
      } else if (msgDate.toDateString() === yesterday.toDateString()) {
        dateLabel = 'Yesterday';
      }

      const existingGroup = groups.find((g) => g.dateLabel === dateLabel);
      if (existingGroup) {
        existingGroup.items.push(msg);
      } else {
        groups.push({ dateLabel, items: [msg] });
      }
    });
    return groups;
  };

  const grouped = groupMessagesByDate(messages);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      id="messages-scroll-container"
      className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6 relative"
    >
      {/* Privacy Guarantee Header */}
      <div className="flex flex-col items-center justify-center text-center py-4 mb-4 select-none">
        <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] mb-2">
          <Lock className="w-4 h-4" />
        </div>
        <p className="text-xs font-light text-white/40 max-w-xs leading-relaxed">
          This conversation is exclusively between you and {partnerName || 'your partner'}. 
          Protected with private cloud authentication.
        </p>
      </div>

      {/* Empty State */}
      {messages.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-3 select-none">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-[#1A1D24] to-[#121418] border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shadow-xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-serif font-light text-white">Your private space is ready</h3>
          <p className="text-xs text-white/40 font-light max-w-xs">
            Send your first private message, photo, video, or voice note to begin.
          </p>
        </div>
      ) : (
        grouped.map((group) => (
          <div key={group.dateLabel} className="space-y-2">
            {/* Date Separator */}
            <div className="flex items-center justify-center my-4 select-none">
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] uppercase tracking-widest text-white/40 font-medium">
                {group.dateLabel}
              </span>
            </div>

            {/* Message items */}
            {group.items.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isCurrentUser={msg.senderId === currentUser.uid}
                onOpenMedia={onOpenMedia}
                onReply={onReply}
                onReact={onReact}
                onDelete={onDelete}
              />
            ))}
          </div>
        ))
      )}

      <div ref={bottomRef} className="h-2" />

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          type="button"
          id="btn-scroll-to-bottom"
          onClick={() => scrollToBottom(true)}
          className="sticky bottom-4 left-1/2 -translate-x-1/2 p-2.5 rounded-full bg-[#1A1D24] border border-[#D4AF37]/40 text-[#D4AF37] shadow-xl hover:scale-105 transition-transform z-20 flex items-center gap-1.5 text-xs"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span className="text-white/80 pr-1">Latest messages</span>
        </button>
      )}
    </div>
  );
};
