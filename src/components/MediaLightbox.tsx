import React, { useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface MediaLightboxProps {
  mediaUrl: string | null;
  type?: 'image' | 'video';
  onClose: () => void;
  senderName?: string;
  timestamp?: number;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({
  mediaUrl,
  type = 'image',
  onClose,
  senderName,
  timestamp
}) => {
  const [scale, setScale] = React.useState(1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!mediaUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = mediaUrl;
    a.download = `two-media-${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      id="media-lightbox-backdrop"
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between items-center select-none"
      onClick={onClose}
    >
      {/* Top action bar */}
      <div
        className="w-full px-6 py-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col">
          <span className="text-xs font-medium text-white/90">{senderName || 'Media'}</span>
          {timestamp && (
            <span className="text-[10px] text-white/40 font-light">
              {new Date(timestamp).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {type === 'image' && (
            <>
              <button
                type="button"
                id="btn-lightbox-zoom-in"
                onClick={() => setScale((s) => Math.min(3, s + 0.3))}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                id="btn-lightbox-zoom-out"
                onClick={() => setScale((s) => Math.max(1, s - 0.3))}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              {scale !== 1 && (
                <button
                  type="button"
                  id="btn-lightbox-reset"
                  onClick={() => setScale(1)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </>
          )}

          <button
            type="button"
            id="btn-lightbox-download"
            onClick={handleDownload}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            id="btn-lightbox-close"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Media Display */}
      <div
        className="flex-1 w-full flex items-center justify-center p-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {type === 'image' ? (
          <img
            src={mediaUrl}
            alt="Full view"
            style={{ transform: `scale(${scale})`, transition: 'transform 0.2s ease-out' }}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            referrerPolicy="no-referrer"
          />
        ) : (
          <video
            src={mediaUrl}
            controls
            autoPlay
            playsInline
            className="max-h-[85vh] max-w-[90vw] rounded-lg shadow-2xl"
          />
        )}
      </div>

      <div className="h-6" />
    </div>
  );
};
