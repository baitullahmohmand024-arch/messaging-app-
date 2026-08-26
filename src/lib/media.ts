// Media utilities: Compression, Audio Recording, Waveform Analysis, Video Thumbnails

export interface CompressedImageResult {
  dataUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

// Client-side image compression with high visual fidelity
export const compressImage = async (
  file: File | Blob,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82
): Promise<CompressedImageResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Main compressed image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Thumbnail generator (320px)
        const thumbRatio = Math.min(320 / width, 320 / height);
        const thumbW = Math.max(1, Math.round(width * thumbRatio));
        const thumbH = Math.max(1, Math.round(height * thumbRatio));
        
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = thumbW;
        thumbCanvas.height = thumbH;
        const thumbCtx = thumbCanvas.getContext('2d');
        if (thumbCtx) {
          thumbCtx.drawImage(canvas, 0, 0, thumbW, thumbH);
        }
        const thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.65);

        resolve({
          dataUrl,
          thumbnailUrl,
          width,
          height,
          sizeBytes: Math.round(dataUrl.length * 0.75)
        });
      };
      img.onerror = () => reject(new Error('Failed to load image file'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

// Video Thumbnail & Duration Extractor
export const processVideoFile = async (
  file: File | Blob
): Promise<{ dataUrl: string; thumbnailUrl: string; duration: number }> => {
  return new Promise((resolve, reject) => {
    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;

    // Convert file to base64 or blob data URL
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1.0, video.duration / 2);
      };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(480, video.videoWidth || 480);
        canvas.height = Math.round((canvas.width / (video.videoWidth || 1)) * (video.videoHeight || 1));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.75);
        const duration = Math.round(video.duration);
        URL.revokeObjectURL(videoUrl);
        resolve({ dataUrl, thumbnailUrl, duration });
      };

      video.onerror = () => {
        URL.revokeObjectURL(videoUrl);
        reject(new Error('Could not process video'));
      };
    };
    reader.onerror = () => reject(new Error('Failed to read video file'));
    reader.readAsDataURL(file);
  });
};

// Real-time Voice Recording Engine with Waveform Data
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private startTime = 0;

  async start(onWaveformSample?: (level: number) => void): Promise<void> {
    this.audioChunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Audio context for real-time waveform visualizer
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      this.audioContext = new AudioContextClass();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
      this.sourceNode.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const sample = () => {
        if (this.analyser && onWaveformSample) {
          this.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          const normalized = Math.min(1, average / 128);
          onWaveformSample(normalized);
          this.animationFrameId = requestAnimationFrame(sample);
        }
      };
      sample();
    }

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : 'audio/webm';

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };
    this.startTime = Date.now();
    this.mediaRecorder.start(100);
  }

  stop(): Promise<{ dataUrl: string; duration: number; blob: Blob }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Recorder not initialized'));
        return;
      }

      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        const duration = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));

        const reader = new FileReader();
        reader.onloadend = () => {
          this.cleanup();
          resolve({
            dataUrl: reader.result as string,
            duration,
            blob: audioBlob
          });
        };
        reader.readAsDataURL(audioBlob);
      };

      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
    });
  }

  cancel() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }

  private cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.sourceNode = null;
    this.analyser = null;
    this.audioChunks = [];
  }
}
