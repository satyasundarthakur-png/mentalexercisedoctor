import type { VoiceOptions } from '@/types/session';

/**
 * Voice Engine — modular, SSR-safe browser TTS abstraction.
 *
 * Instantiated lazily on first use, avoiding SSR / server-side crashes.
 * Supports rate, pitch, volume, and preferred voice selection.
 * Gracefully degrades when Web Speech API is unavailable.
 */

class BrowserVoiceEngine {
  private synth: SpeechSynthesis | null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private _isSpeaking = false;
  private _rate = 0.88;

  constructor() {
    this.synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
  }

  get isSupported(): boolean {
    return this.synth !== null;
  }

  async speak(text: string, options: VoiceOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error('Speech synthesis is not supported in this browser.'));
        return;
      }

      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate ?? this._rate;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = options.volume ?? 0.85;

      // Try to select a calm, natural-sounding voice
      const voices = this.synth.getVoices();
      const preferred = voices.find(
        (v) =>
          v.name.includes('Samantha') ||
          v.name.includes('Karen') ||
          v.name.includes('Moira') ||
          v.name.includes('Google UK English Female') ||
          v.name.includes('Microsoft Zira')
      );
      if (preferred) utterance.voice = preferred;

      if (options.voiceName) {
        const named = voices.find((v) =>
          v.name.toLowerCase().includes(options.voiceName!.toLowerCase())
        );
        if (named) utterance.voice = named;
      }

      utterance.onend = () => {
        this._isSpeaking = false;
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        this._isSpeaking = false;
        this.currentUtterance = null;
        // 'interrupted' fires when stop() is called intentionally — not an error
        if (event.error === 'interrupted' || event.error === 'canceled') {
          resolve();
        } else {
          reject(new Error(`TTS error: ${event.error}`));
        }
      };

      this.currentUtterance = utterance;
      this._isSpeaking = true;
      this.synth.speak(utterance);
    });
  }

  pause(): void {
    if (this.synth && this._isSpeaking) this.synth.pause();
  }

  resume(): void {
    if (this.synth) this.synth.resume();
  }

  stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this._isSpeaking = false;
      this.currentUtterance = null;
    }
  }

  isSpeaking(): boolean {
    return this._isSpeaking;
  }

  setRate(rate: number): void {
    this._rate = Math.min(Math.max(rate, 0.5), 1.5);
  }

  getRate(): number {
    return this._rate;
  }

  async getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!this.synth) return [];
    return new Promise((resolve) => {
      const voices = this.synth!.getVoices();
      if (voices.length > 0) {
        resolve(voices);
      } else {
        this.synth!.onvoiceschanged = () => resolve(this.synth!.getVoices());
        // Fallback timeout
        setTimeout(() => resolve([]), 2000);
      }
    });
  }
}

// Singleton — created lazily
let _engine: BrowserVoiceEngine | null = null;

export function getVoiceEngine(): BrowserVoiceEngine {
  if (!_engine) _engine = new BrowserVoiceEngine();
  return _engine;
}

export { BrowserVoiceEngine };
