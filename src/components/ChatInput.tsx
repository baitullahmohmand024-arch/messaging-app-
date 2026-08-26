import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Camera, 
  Send, 
  Mic, 
  Trash2, 
  X, 
  Image as ImageIcon, 
  Film,
  Paperclip,
  Check
} from 'lucide-react';
import { ReplyContext, MessageType } from '../types';
import { AudioRecorder, compressImage, processVideoFile } from '../lib/media';
import { playSendSound, playRecordStartSound, playRecordStopSound } from '../lib/audio';

interface ChatInputProps {
  onSendMessage: (data: {
    type: MessageType;
    text?: string;
    mediaUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
    fileName?: string;
    fileSize?: number;
  }) => Promise<void>;
  replyTo: ReplyContext | null;
  onCancelReply: () => void;
  onTyping: (isTyping: boolean) => void;
  onOpenCamera: () => void;
  soundEnabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  replyTo,
  onCancelReply,
  onTyping,
  onOpenCamera,
  soundEnabled = true
}) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [waveformLevel, setWaveformLevel] = useState<number[]>(new Array(16).fill(0.1));
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleSendText = async () => {
    const trimmed = text.trim();
    if (!trimmed || isUploading) return;

    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    onTyping(false);

    try {
      playSendSound(soundEnabled);
      await onSendMessage({
        type: 'text',
        text: trimmed
      });
      if (replyTo) onCancelReply();
    } catch (err) {
      console.error('Error sending text:', err);
    }
  };

  // Photo upload
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowAttachMenu(false);
    setIsUploading(true);
    setUploadProgressText('Optimizing image...');
    try {
      const res = await compressImage(file, 1600, 1600, 0.82);
      playSendSound(soundEnabled);
      await onSendMessage({
        type: 'image',
        text: text.trim() || undefined,
        mediaUrl: res.dataUrl,
        thumbnailUrl: res.thumbnailUrl,
        fileName: file.name,
        fileSize: res.sizeBytes
      });
      setText('');
      if (replyTo) onCancelReply();
    } catch (err) {
      console.error('Photo error:', err);
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  // Video upload
  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowAttachMenu(false);
    setIsUploading(true);
    setUploadProgressText('Processing video...');
    try {
      const res = await processVideoFile(file);
      playSendSound(soundEnabled);
      await onSendMessage({
        type: 'video',
        text: text.trim() || undefined,
        mediaUrl: res.dataUrl,
        thumbnailUrl: res.thumbnailUrl,
        duration: res.duration,
        fileName: file.name,
        fileSize: file.size
      });
      setText('');
      if (replyTo) onCancelReply();
    } catch (err) {
      console.error('Video error:', err);
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  // Voice recording
  const startVoiceRecording = async () => {
    try {
      const recorder = new AudioRecorder();
      recorderRef.current = recorder;
      
      setRecordingSeconds(0);
      setIsRecording(true);
      playRecordStartSound(soundEnabled);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);

      await recorder.start((sampleLevel) => {
        setWaveformLevel((prev) => {
          const next = [...prev.slice(1), Math.max(0.1, sampleLevel)];
          return next;
        });
      });
    } catch (err) {
      console.error('Audio recording failed to start:', err);
      setIsRecording(false);
    }
  };

  const stopAndSendVoice = async () => {
    if (!recorderRef.current || !isRecording) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    playRecordStopSound(soundEnabled);
    setIsRecording(false);
    setIsUploading(true);
    setUploadProgressText('Sending voice note...');

    try {
      const result = await recorderRef.current.stop();
      if (result.duration >= 1) {
        playSendSound(soundEnabled);
        await onSendMessage({
          type: 'audio',
          mediaUrl: result.dataUrl,
          duration: result.duration,
          fileSize: result.blob.size
        });
        if (replyTo) onCancelReply();
      }
    } catch (err) {
      console.error('Error stopping voice recorder:', err);
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      recorderRef.current = null;
    }
  };

  const cancelVoiceRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (recorderRef.current) {
      recorderRef.current.cancel();
      recorderRef.current = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      id="chat-input-wrapper"
      className="p-3 md:p-4 bg-[#090A0C]/90 backdrop-blur-md border-t border-white/5 shrink-0 relative"
    >
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={photoInputRef}
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelect}
      />
      <input
        type="file"
        ref={videoInputRef}
        accept="video/*"
        className="hidden"
        onChange={handleVideoSelect}
      />

      {/* Reply Banner */}
      {replyTo && (
        <div
          id="reply-preview-banner"
          className="mb-2 p-2.5 rounded-xl bg-[#1A1D24] border border-white/10 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-150"
        >
          <div className="flex flex-col text-xs min-w-0 pr-2">
            <span className="text-[#D4AF37] font-medium">Replying to {replyTo.senderName}</span>
            <p className="text-white/60 truncate font-light text-[11px]">
              {replyTo.type === 'image'
                ? '📷 Photo'
                : replyTo.type === 'video'
                ? '📹 Video'
                : replyTo.type === 'audio'
                ? '🎤 Voice note'
                : replyTo.text}
            </p>
          </div>
          <button
            type="button"
            id="btn-cancel-reply"
            onClick={onCancelReply}
            className="p-1 text-white/40 hover:text-white rounded-full transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Uploading Progress Indicator */}
      {isUploading && (
        <div className="mb-2 py-1 px-3 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center gap-2 text-xs text-[#D4AF37]">
          <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping" />
          <span className="font-light">{uploadProgressText || 'Uploading media...'}</span>
        </div>
      )}

      {/* Attach Popup Menu */}
      {showAttachMenu && (
        <div
          id="attach-popup-menu"
          className="absolute bottom-full mb-3 left-4 p-2 rounded-2xl bg-[#161920] border border-white/10 shadow-2xl z-40 flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150"
        >
          <button
            type="button"
            id="btn-attach-photo"
            onClick={() => photoInputRef.current?.click()}
            className="flex flex-col items-center gap-1 p-2.5 rounded-xl hover:bg-white/5 text-white/80 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
              <ImageIcon className="w-4 h-4" />
            </div>
            <span className="text-[10px]">Photo</span>
          </button>

          <button
            type="button"
            id="btn-attach-video"
            onClick={() => videoInputRef.current?.click()}
            className="flex flex-col items-center gap-1 p-2.5 rounded-xl hover:bg-white/5 text-white/80 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Film className="w-4 h-4" />
            </div>
            <span className="text-[10px]">Video</span>
          </button>

          <button
            type="button"
            id="btn-attach-camera-menu"
            onClick={() => {
              setShowAttachMenu(false);
              onOpenCamera();
            }}
            className="flex flex-col items-center gap-1 p-2.5 rounded-xl hover:bg-white/5 text-white/80 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <span className="text-[10px]">Camera</span>
          </button>
        </div>
      )}

      {/* Main Input Control Bar */}
      {isRecording ? (
        /* Voice Recording Active UI */
        <div className="flex items-center justify-between gap-3 p-2 rounded-2xl bg-[#161920] border border-[#D4AF37]/40 shadow-xl">
          {/* Cancel Record Button */}
          <button
            type="button"
            id="btn-cancel-recording"
            onClick={cancelVoiceRecording}
            className="p-2.5 rounded-full bg-white/5 hover:bg-red-950/40 text-white/50 hover:text-red-400 transition-colors"
            title="Cancel"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Dynamic Waveform Visualizer */}
          <div className="flex-1 flex items-center justify-center gap-1 px-2 h-8">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping mr-2 shrink-0" />
            <span className="text-xs font-mono text-white/80 mr-3 shrink-0">
              {formatTimer(recordingSeconds)}
            </span>
            <div className="flex items-center gap-0.5 h-6 flex-1 max-w-[180px]">
              {waveformLevel.map((lvl, idx) => (
                <div
                  key={idx}
                  style={{ height: `${Math.max(15, lvl * 100)}%` }}
                  className="w-1 bg-[#D4AF37] rounded-full transition-all duration-100"
                />
              ))}
            </div>
          </div>

          {/* Finish & Send Voice */}
          <button
            type="button"
            id="btn-send-recorded-voice"
            onClick={stopAndSendVoice}
            className="p-2.5 rounded-full bg-[#D4AF37] hover:bg-[#E5C07B] text-black shadow-lg shadow-[#D4AF37]/30 transition-transform active:scale-95"
            title="Send Voice Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Standard Message Input UI */
        <div className="flex items-end gap-2">
          {/* Plus / Attach Button */}
          <button
            type="button"
            id="btn-toggle-attach"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className={`p-2.5 rounded-full transition-colors shrink-0 ${
              showAttachMenu
                ? 'bg-[#D4AF37] text-black'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
            title="Attach media"
          >
            <Plus className={`w-5 h-5 transition-transform ${showAttachMenu ? 'rotate-45' : ''}`} />
          </button>

          {/* Direct Camera Button */}
          <button
            type="button"
            id="btn-direct-camera"
            onClick={onOpenCamera}
            className="p-2.5 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors shrink-0"
            title="Capture photo"
          >
            <Camera className="w-5 h-5" />
          </button>

          {/* Textarea */}
          <div className="flex-1 bg-[#14161C] border border-white/10 focus-within:border-[#D4AF37]/50 rounded-2xl px-3.5 py-2 transition-all flex items-center">
            <textarea
              ref={textareaRef}
              id="input-chat-message"
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Message privately..."
              rows={1}
              className="w-full bg-transparent text-sm text-white placeholder-white/30 focus:outline-none resize-none no-scrollbar font-light leading-relaxed max-h-28"
            />
          </div>

          {/* Send or Voice Record Button */}
          {text.trim() ? (
            <button
              type="button"
              id="btn-send-message"
              onClick={handleSendText}
              disabled={isUploading}
              className="p-2.5 rounded-full bg-[#D4AF37] hover:bg-[#E5C07B] text-black shadow-lg shadow-[#D4AF37]/20 transition-all shrink-0 active:scale-95 disabled:opacity-50"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              id="btn-record-voice"
              onClick={startVoiceRecording}
              className="p-2.5 rounded-full text-white/60 hover:text-[#D4AF37] hover:bg-white/5 transition-colors shrink-0"
              title="Record voice note"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
