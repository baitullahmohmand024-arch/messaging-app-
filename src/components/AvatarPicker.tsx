import React, { useState, useRef } from 'react';
import { Camera, Upload, Check } from 'lucide-react';
import { compressImage } from '../lib/media';

interface AvatarPickerProps {
  currentPhoto: string | null;
  onSelectPhoto: (photoUrl: string) => void;
  onOpenCamera?: () => void;
}

const LUXURY_PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=faces&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces&q=80',
];

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  currentPhoto,
  onSelectPhoto,
  onOpenCamera
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const res = await compressImage(file, 400, 400, 0.85);
      onSelectPhoto(res.dataUrl);
    } catch (err) {
      console.error('Error uploading avatar:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-2" id="avatar-picker-container">
      {/* Current Preview */}
      <div className="relative group">
        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#D4AF37]/40 bg-[#1A1D24] flex items-center justify-center shadow-lg shadow-black/60">
          {currentPhoto ? (
            <img
              src={currentPhoto}
              alt="Profile"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-2xl font-light text-[#D4AF37]">✦</span>
          )}
        </div>
        {isUploading && (
          <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center text-xs text-[#D4AF37]">
            Loading...
          </div>
        )}
      </div>

      {/* Upload or Camera buttons */}
      <div className="flex items-center gap-3">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          id="btn-upload-photo"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 transition-colors"
        >
          <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Upload photo</span>
        </button>

        {onOpenCamera && (
          <button
            type="button"
            id="btn-camera-photo"
            onClick={onOpenCamera}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 transition-colors"
          >
            <Camera className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Camera</span>
          </button>
        )}
      </div>

      {/* Preset Luxury Avatars */}
      <div className="flex items-center gap-2 mt-1">
        {LUXURY_PRESET_AVATARS.map((url, idx) => {
          const isSelected = currentPhoto === url;
          return (
            <button
              key={idx}
              type="button"
              id={`preset-avatar-${idx}`}
              onClick={() => onSelectPhoto(url)}
              className={`relative w-8 h-8 rounded-full overflow-hidden border transition-transform hover:scale-105 ${
                isSelected
                  ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/30'
                  : 'border-white/10 opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={url}
                alt={`Preset ${idx + 1}`}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {isSelected && (
                <div className="absolute inset-0 bg-[#D4AF37]/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-[#D4AF37]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
