import type { VoiceOptions } from '@/types/session';

/**
 * Voice Engine — modular, SSR-safe browser TTS abstraction.
 *
 * Instantiated lazily on first use, avoiding SSR / server-side crashes.
 * Supports rate, pitch, volume, and preferred voice selection.
 * Gracefully degrades when Web Speech API is unavailable.
 */

// Known Hindi voice names across platforms (Windows/Edge, macOS/Safari, Android/Chrome)
const HINDI_VOICE_NAME_HINTS = [
  'hindi', 'हिन्दी', 'हिंदी',
  'lekha',            // macOS/iOS
  'kalpana', 'hemant', // Windows legacy
  'swara', 'madhur',   // Windows/Edge neural voices
  'rishi',
];

class BrowserVoiceEngine {
  private synth: SpeechSynthesis | null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private _isSpeaking = false;
  private _rate = 0.88;
  private _lastNoVoiceWarning = '';

  constructor() {
    this.synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
  }

  get isSupported(): boolean {
    return this.synth !== null;
  }

  /** Last warning raised when a requested language had no matching installed voice. */
  get lastNoVoiceWarning(): string {
    return this._lastNoVoiceWarning;
  }

  // Chrome/Edge/Firefox often return an empty voices array on the very first
  // call because the voice list loads asynchronously. Wait for it properly
  // instead of silently proceeding with zero voices (a common cause of
  // "TTS just doesn't say anything" bugs, especially for non-English langs).
  private waitForVoices(timeoutMs = 3000): Promise<SpeechSynthesisVoice[]> {
    if (!this.synth) return Promise.resolve([]);
    const existing = this.synth.getVoices();
    if (existing.length > 0) return Promise.resolve(existing);

    return new Promise((resolve) => {
      let settled = false;
      const finish = (voices: SpeechSynthesisVoice[]) => {
        if (settled) return;
        settled = true;
        resolve(voices);
      };
      this.synth!.onvoiceschanged = () => finish(this.synth!.getVoices());
      // Poll as a fallback in case onvoiceschanged never fires (some WebViews)
      const start = Date.now();
      const poll = () => {
        const v = this.synth!.getVoices();
        if (v.length > 0) {
          finish(v);
        } else if (Date.now() - start < timeoutMs) {
          setTimeout(poll, 100);
        } else {
          finish([]);
        }
      };
      setTimeout(poll, 100);
    });
  }

  private findVoiceForLang(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
    const langLower = lang.toLowerCase();
    const langPrefix = langLower.split('-')[0]; // e.g. "hi" from "hi-IN"

    return (
      voices.find((v) => v.lang?.toLowerCase() === langLower) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith(langPrefix)) ||
      voices.find((v) =>
        HINDI_VOICE_NAME_HINTS.some((hint) => v.name.toLowerCase().includes(hint))
      ) ||
      null
    );
  }

  async speak(text: string, options: VoiceOptions = {}): Promise<void> {
    if (!this.synth) {
      throw new Error('Speech synthesis is not supported in this browser.');
    }

    this.stop();
    this._lastNoVoiceWarning = '';

    const voices = await this.waitForVoices();

    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error('Speech synthesis is not supported in this browser.'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate ?? this._rate;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = options.volume ?? 0.85;

      if (options.lang) {
        const langVoice = this.findVoiceForLang(voices, options.lang);
        if (langVoice) {
          utterance.voice = langVoice;
          utterance.lang = langVoice.lang;
        } else {
          // No matching voice installed on this device for the requested
          // language. Setting utterance.lang without a matching voice makes
          // Chrome/Edge fail SILENTLY (no error, no audio) — so instead we
          // fall back to the default voice/lang and surface a clear warning
          // rather than leaving the user with dead air.
          this._lastNoVoiceWarning =
            `No installed voice found for "${options.lang}" on this device/browser. ` +
            `Falling back to the default voice. To hear Hindi narration, install a Hindi ` +
            `text-to-speech voice in your device settings (e.g. Android: Settings → ` +
            `System → Languages → Text-to-speech → install Hindi; Windows: Settings → ` +
            `Time & Language → Speech → add Hindi).`;
          console.warn('[voice-engine]', this._lastNoVoiceWarning, 'Available voices:', voices.map((v) => `${v.name} (${v.lang})`));
        }
      } else {
        // Try to select a calm, natural-sounding English voice
        const preferred = voices.find(
          (v) =>
            v.name.includes('Samantha') ||
            v.name.includes('Karen') ||
            v.name.includes('Moira') ||
            v.name.includes('Google UK English Female') ||
            v.name.includes('Microsoft Zira')
        );
        if (preferred) utterance.voice = preferred;
      }

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
    return this.waitForVoices();
  }
}

// Singleton — created lazily
let _engine: BrowserVoiceEngine | null = null;

export function getVoiceEngine(): BrowserVoiceEngine {
  if (!_engine) _engine = new BrowserVoiceEngine();
  return _engine;
}

export { BrowserVoiceEngine };
