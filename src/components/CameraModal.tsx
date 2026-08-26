import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, RefreshCw, Check, ArrowLeft, SwitchCamera } from 'lucide-react';
import { compressImage } from '../lib/media';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string, thumbnailUrl: string) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
      setError(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setError('Unable to access camera. Please check device permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip if front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(rawDataUrl);
  };

  const handleConfirm = async () => {
    if (!capturedImage) return;
    setIsProcessing(true);
    try {
      const res = await compressImage(
        await (await fetch(capturedImage)).blob(),
        1400,
        1400,
        0.82
      );
      onCapture(res.dataUrl, res.thumbnailUrl);
      onClose();
    } catch (err) {
      console.error('Error processing captured photo:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  if (!isOpen) return null;

  return (
    <div
      id="camera-modal-backdrop"
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between items-center select-none"
    >
      {/* Top Bar */}
      <div className="w-full px-6 py-4 flex items-center justify-between z-10">
        <button
          type="button"
          id="btn-close-camera"
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <span className="text-xs uppercase tracking-widest text-white/60 font-medium">
          {capturedImage ? 'Preview Photo' : 'Private Lens'}
        </span>

        {!capturedImage && (
          <button
            type="button"
            id="btn-switch-camera-facing"
            onClick={toggleFacingMode}
            className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <SwitchCamera className="w-5 h-5 text-[#D4AF37]" />
          </button>
        )}
        {capturedImage && <div className="w-10" />}
      </div>

      {/* Viewfinder or Captured Preview */}
      <div className="flex-1 w-full max-w-lg flex items-center justify-center p-4 relative overflow-hidden">
        {error ? (
          <div className="text-center p-6 bg-red-950/40 border border-red-500/30 rounded-2xl">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        ) : capturedImage ? (
          <img
            src={capturedImage}
            alt="Captured preview"
            className="w-full max-h-[70vh] object-cover rounded-3xl border border-white/10 shadow-2xl"
          />
        ) : (
          <div className="w-full max-h-[70vh] aspect-[3/4] relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${
                facingMode === 'user' ? 'scale-x-[-1]' : ''
              }`}
            />
            {/* Subtle framing guide */}
            <div className="absolute inset-4 rounded-2xl border border-white/20 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="w-full pb-8 pt-4 px-6 flex items-center justify-center gap-8 bg-gradient-to-t from-black via-black/80 to-transparent">
        {capturedImage ? (
          <div className="flex items-center gap-6">
            <button
              type="button"
              id="btn-retake-camera-photo"
              onClick={() => setCapturedImage(null)}
              className="px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retake</span>
            </button>

            <button
              type="button"
              id="btn-send-camera-photo"
              onClick={handleConfirm}
              disabled={isProcessing}
              className="px-6 py-3 rounded-full bg-[#D4AF37] hover:bg-[#E5C07B] text-black text-xs font-semibold flex items-center gap-2 shadow-lg shadow-[#D4AF37]/30 transition-all active:scale-95"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Send Photo</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            id="btn-shutter"
            onClick={handleCapture}
            className="w-18 h-18 rounded-full border-4 border-[#D4AF37] p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            <div className="w-full h-full rounded-full bg-white transition-colors" />
          </button>
        )}
      </div>
    </div>
  );
};
