import React, { useState, useRef, useEffect } from 'react';
import { 
  Check, 
  CheckCheck, 
  Clock, 
  Play, 
  Pause, 
  Reply, 
  Copy, 
  Trash2, 
  Smile, 
  CornerDownRight, 
  Film,
  Volume2
} from 'lucide-react';
import { Message, MessageType } from '../types';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  onOpenMedia: (url: string, type: 'image' | 'video') => void;
  onReply: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
}

const LUXURY_EMOJIS = ['❤️', '✨', '🔥', '🤍', '😊', '🥂'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isCurrentUser,
  onOpenMedia,
  onReply,
  onReact,
  onDelete
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(message.duration || 0);
  const [currentTimeFormatted, setCurrentTimeFormatted] = useState('0:00');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio setup
  useEffect(() => {
    if (message.type === 'audio' && message.mediaUrl) {
      const audio = new Audio(message.mediaUrl);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        if (!message.duration && audio.duration) {
          setAudioDuration(Math.round(audio.duration));
        }
      };

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setAudioProgress((audio.currentTime / audio.duration) * 100);
          const mins = Math.floor(audio.currentTime / 60);
          const secs = Math.floor(audio.currentTime % 60);
          setCurrentTimeFormatted(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
        }
      };

      audio.onended = () => {
        setIsPlayingAudio(false);
        setAudioProgress(0);
        setCurrentTimeFormatted('0:00');
      };

      return () => {
        audio.pause();
        audio.src = '';
      };
    }
  }, [message.type, message.mediaUrl, message.duration]);

  const toggleAudioPlayback = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlayingAudio(true);
      }).catch((e) => console.error('Audio play error:', e));
    }
  };

  const handleCopyText = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
      setShowActions(false);
    }
  };

  const formatTimestamp = (time: number) => {
    return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatSeconds = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = Math.floor(totalSec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      id={`message-row-${message.id}`}
      className={`group relative flex flex-col my-1.5 ${
        isCurrentUser ? 'items-end' : 'items-start'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
    >
      {/* Floating Action Menu */}
      {showActions && !message.isDeleted && (
        <div
          className={`absolute -top-7 ${
            isCurrentUser ? 'right-2' : 'left-2'
          } z-20 flex items-center gap-1 p-1 rounded-full bg-[#1A1D24] border border-white/10 shadow-lg text-white/60 animate-in fade-in duration-150`}
        >
          {/* Reaction Trigger */}
          <div className="relative">
            <button
              type="button"
              id={`btn-react-${message.id}`}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1 rounded-full hover:bg-white/10 hover:text-[#D4AF37] transition-colors"
              title="React"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1.5 rounded-full bg-[#121418] border border-[#D4AF37]/30 shadow-xl z-30">
                {LUXURY_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onReact(message.id, emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="p-1 hover:scale-125 transition-transform text-sm"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            id={`btn-reply-${message.id}`}
            onClick={() => onReply(message)}
            className="p-1 rounded-full hover:bg-white/10 hover:text-white transition-colors"
            title="Reply"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>

          {message.text && (
            <button
              type="button"
              id={`btn-copy-${message.id}`}
              onClick={handleCopyText}
              className="p-1 rounded-full hover:bg-white/10 hover:text-white transition-colors"
              title="Copy"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}

          {isCurrentUser && (
            <button
              type="button"
              id={`btn-delete-${message.id}`}
              onClick={() => onDelete(message.id)}
              className="p-1 rounded-full hover:bg-white/10 hover:text-red-400 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Main Bubble Container */}
      <div
        className={`relative max-w-[85%] sm:max-w-[75%] md:max-w-[65%] rounded-2xl p-3 sm:p-3.5 shadow-md ${
          message.isDeleted
            ? 'bg-white/5 border border-white/5 text-white/40 italic text-xs'
            : isCurrentUser
            ? 'bg-[#1E222A] text-white/95 rounded-br-sm border border-white/10'
            : 'bg-[#14161C] text-white/90 rounded-bl-sm border border-white/5'
        }`}
      >
        {/* Reply Quote Banner */}
        {message.replyTo && (
          <div className="mb-2 p-2 rounded-lg bg-black/30 border-l-2 border-[#D4AF37] text-[11px] space-y-0.5">
            <span className="text-[#D4AF37] font-medium block">{message.replyTo.senderName}</span>
            <p className="text-white/60 truncate font-light">
              {message.replyTo.type === 'image'
                ? '📷 Photo'
                : message.replyTo.type === 'video'
                ? '📹 Video'
                : message.replyTo.type === 'audio'
                ? '🎤 Voice message'
                : message.replyTo.text}
            </p>
          </div>
        )}

        {/* Message Content according to Type */}
        {message.isDeleted ? (
          <p className="text-xs">This message was deleted.</p>
        ) : (
          <>
            {/* TYPE: Text */}
            {message.type === 'text' && (
              <p className="text-sm font-light leading-relaxed whitespace-pre-wrap break-words selection:bg-[#D4AF37]/30">
                {message.text}
              </p>
            )}

            {/* TYPE: Image */}
            {message.type === 'image' && message.mediaUrl && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => onOpenMedia(message.mediaUrl!, 'image')}
                  className="rounded-xl overflow-hidden block w-full max-h-80 border border-white/10 hover:opacity-95 transition-opacity"
                >
                  <img
                    src={message.thumbnailUrl || message.mediaUrl}
                    alt="Photo message"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </button>
                {message.text && (
                  <p className="text-xs font-light text-white/90 pt-1 leading-relaxed">
                    {message.text}
                  </p>
                )}
              </div>
            )}

            {/* TYPE: Video */}
            {message.type === 'video' && message.mediaUrl && (
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black group/video">
                  <video
                    src={message.mediaUrl}
                    poster={message.thumbnailUrl}
                    controls
                    playsInline
                    className="w-full max-h-80 object-cover"
                  />
                </div>
                {message.text && (
                  <p className="text-xs font-light text-white/90 pt-1 leading-relaxed">
                    {message.text}
                  </p>
                )}
              </div>
            )}

            {/* TYPE: Audio Voice Note */}
            {message.type === 'audio' && (
              <div className="flex items-center gap-3 py-1 min-w-[200px] sm:min-w-[240px]">
                <button
                  type="button"
                  id={`btn-play-voice-${message.id}`}
                  onClick={toggleAudioPlayback}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isPlayingAudio
                      ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/30 scale-105'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {isPlayingAudio ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>

                <div className="flex-1 space-y-1.5">
                  {/* Waveform representation */}
                  <div className="flex items-center gap-0.5 h-6">
                    {[35, 60, 40, 80, 50, 95, 70, 30, 85, 60, 45, 90, 65, 30, 75, 40, 60, 90, 45, 30].map(
                      (val, idx) => {
                        const isPast = (idx / 20) * 100 <= audioProgress;
                        return (
                          <div
                            key={idx}
                            style={{ height: `${val}%` }}
                            className={`w-1 rounded-full transition-colors duration-150 ${
                              isPast
                                ? 'bg-[#D4AF37]'
                                : isPlayingAudio
                                ? 'bg-white/40'
                                : 'bg-white/20'
                            }`}
                          />
                        );
                      }
                    )}
                  </div>

                  {/* Duration & playback time */}
                  <div className="flex items-center justify-between text-[10px] text-white/40 font-mono">
                    <span>{isPlayingAudio ? currentTimeFormatted : '0:00'}</span>
                    <span>{formatSeconds(audioDuration)}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Metadata Footer: Timestamp & Delivery State */}
        <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-white/40 select-none">
          <span>{formatTimestamp(message.createdAt)}</span>

          {isCurrentUser && !message.isDeleted && (
            <span className="flex items-center">
              {message.isSending ? (
                <Clock className="w-3 h-3 text-white/30 animate-pulse" />
              ) : message.readAt ? (
                <CheckCheck className="w-3.5 h-3.5 text-[#D4AF37]" title={`Read at ${formatTimestamp(message.readAt)}`} />
              ) : message.deliveredAt ? (
                <CheckCheck className="w-3.5 h-3.5 text-white/50" title="Delivered" />
              ) : (
                <Check className="w-3 h-3 text-white/40" title="Sent" />
              )}
            </span>
          )}
        </div>
      </div>

      {/* Reactions Bar Below Bubble */}
      {message.reactions && Object.keys(message.reactions).length > 0 && (
        <div
          className={`flex items-center gap-1 mt-1 ${
            isCurrentUser ? 'mr-1' : 'ml-1'
          }`}
        >
          {Object.entries(message.reactions).map(([emoji, uids]) => {
            const userList = (Array.isArray(uids) ? uids : []) as string[];
            if (userList.length === 0) return null;
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(message.id, emoji)}
                className="px-2 py-0.5 rounded-full bg-[#1A1D24] border border-white/10 text-xs flex items-center gap-1 shadow-sm hover:scale-105 transition-transform"
              >
                <span>{emoji}</span>
                {userList.length > 1 && (
                  <span className="text-[10px] text-white/60 font-mono">{userList.length}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
