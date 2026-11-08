/**
 * Audio & Speech Synthesis Engine for HanSlide
 * Supports:
 * - Native Chinese TTS (zh-CN) with speech rate control
 * - Teacher custom audio playback (Data URI / MP3 / WAV)
 * - In-browser Microphone Recorder for teachers to record their own pronunciation
 */

let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve([]);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      cachedVoices = voices;
      resolve(voices);
      return;
    }
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
      resolve(cachedVoices);
    };
  });
}

// Initialise voices
if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices();
}

export function getChineseVoice(): SpeechSynthesisVoice | null {
  if (cachedVoices.length === 0 && typeof window !== 'undefined' && window.speechSynthesis) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
  // Try finding native zh-CN voices
  const zhVoices = cachedVoices.filter(
    (v) => v.lang === 'zh-CN' || v.lang === 'zh' || v.lang.startsWith('zh')
  );
  if (zhVoices.length > 0) {
    // Prefer Google, Microsoft or Natural voices if available
    const preferred = zhVoices.find(
      (v) =>
        v.name.includes('Natural') ||
        v.name.includes('Google') ||
        v.name.includes('Xiaoxiao') ||
        v.name.includes('Tingting') ||
        v.name.includes('Yunxi')
    );
    return preferred || zhVoices[0];
  }
  return null;
}

let activeAudioElement: HTMLAudioElement | null = null;

export function stopAllAudio(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement.currentTime = 0;
    activeAudioElement = null;
  }
}

export interface PlaybackOptions {
  rate?: number; // 0.7 to 1.2
  pitch?: number;
  onEnd?: () => void;
  onError?: (err: any) => void;
  customAudioUri?: string;
}

export function playChineseAudio(text: string, options: PlaybackOptions = {}): void {
  stopAllAudio();

  const { rate = 1.0, pitch = 1.0, onEnd, onError, customAudioUri } = options;

  // 1. If teacher provided a custom recorded or uploaded audio track, prioritize it
  if (customAudioUri && customAudioUri.trim().length > 0) {
    try {
      const audio = new Audio(customAudioUri);
      activeAudioElement = audio;
      audio.playbackRate = rate;
      audio.onended = () => {
        activeAudioElement = null;
        if (onEnd) onEnd();
      };
      audio.onerror = (e) => {
        activeAudioElement = null;
        console.warn('Custom audio playback failed, falling back to TTS', e);
        // Fallback to TTS
        speakTTS(text, rate, pitch, onEnd, onError);
      };
      audio.play().catch((err) => {
        console.warn('Audio play error, falling back to TTS:', err);
        speakTTS(text, rate, pitch, onEnd, onError);
      });
      return;
    } catch (e) {
      console.warn('Could not play audio uri:', e);
    }
  }

  // 2. Default to Web Speech API
  speakTTS(text, rate, pitch, onEnd, onError);
}

function speakTTS(
  text: string,
  rate = 1.0,
  pitch = 1.0,
  onEnd?: () => void,
  onError?: (err: any) => void
): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (onError) onError(new Error('Speech Synthesis not supported'));
    return;
  }

  const cleanText = text
    .replace(/\([^)]*\)/g, '')
    .replace(/（[^）]*）/g, '')
    .replace(/\//g, '，')
    .trim();
  if (!cleanText) return;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'zh-CN';
  utterance.rate = rate;
  utterance.pitch = pitch;

  const voice = getChineseVoice();
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onend = () => {
    if (onEnd) onEnd();
  };

  utterance.onerror = (event) => {
    console.warn('SpeechSynthesis error:', event);
    if (onError) onError(event);
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Audio Recorder for Teachers
 * Allows recording teacher voice samples via browser MediaRecorder and converts to Base64 dataURI
 */
export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    this.audioChunks = [];
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone access is not supported in this browser.');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Choose appropriate mime type
    let mimeType = 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
      mimeType = 'audio/ogg;codecs=opus';
    }

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100);
  }

  stop(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Recorder not initialized'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        try {
          const audioBlob = new Blob(this.audioChunks, {
            type: this.mediaRecorder?.mimeType || 'audio/webm',
          });

          // Stop all audio tracks
          if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
          }

          // Convert to Base64 Data URI
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64Data = reader.result as string;
            resolve(base64Data);
          };
          reader.onerror = (err) => reject(err);
        } catch (e) {
          reject(e);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}

export function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
