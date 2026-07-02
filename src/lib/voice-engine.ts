import type { VoiceOptions, VoiceGender } from '@/types/session';

/**
 * Voice Engine — modular, SSR-safe browser TTS abstraction.
 *
 * Instantiated lazily on first use, avoiding SSR / server-side crashes.
 * Supports rate, pitch, volume, language, and gender-aware voice selection,
 * with a "meditative" pitch/rate profile and diagnostics for troubleshooting
 * missing platform voices (most common cause of "no audio in this language" reports).
 */

// Known regional-language voice names across platforms (Windows/Edge, macOS/Safari,
// Android/Chrome) that don't always carry the right BCP-47 lang tag.
const LANG_VOICE_NAME_HINTS: Record<string, string[]> = {
  hi: ['hindi', 'हिन्दी', 'हिंदी', 'lekha', 'kalpana', 'hemant', 'swara', 'madhur', 'rishi'],
  te: ['telugu', 'తెలుగు', 'shruti'],
  ta: ['tamil', 'தமிழ்', 'valluvar'],
  kn: ['kannada', 'ಕನ್ನಡ'],
  ml: ['malayalam', 'മലയാളം'],
  bn: ['bengali', 'bangla', 'বাংলা', 'bashkar'],
  mr: ['marathi', 'मराठी', 'manohar'],
  gu: ['gujarati', 'ગુજરાતી', 'dhwani'],
  pa: ['punjabi', 'ਪੰਜਾਬੀ', 'gurmukhi'],
  or: ['odia', 'oriya', 'ଓଡ଼ିଆ'],
  ur: ['urdu', 'اردو', 'gul'],
  as: ['assamese', 'অসমীয়া'],
};

// Best-effort gender hints — the Web Speech API has no standard gender field,
// so we infer from well-known voice names across platforms.
const FEMALE_NAME_HINTS = [
  'female', 'woman',
  'samantha', 'karen', 'moira', 'zira', 'victoria', 'susan', 'fiona', 'tessa',
  'ava', 'allison', 'salli', 'joanna', 'kendra', 'kimberly',
  'swara', 'kalpana', 'lekha', 'shruti', 'dhwani', // regional female voices
];
const MALE_NAME_HINTS = [
  'male', 'man',
  'daniel', 'alex', 'fred', 'david', 'mark', 'george', 'james', 'justin', 'matthew', 'thomas',
  'madhur', 'hemant', 'rishi', 'valluvar', 'manohar', 'bashkar', // regional male voices
];

function guessGender(voiceName: string): VoiceGender | null {
  const n = voiceName.toLowerCase();
  if (FEMALE_NAME_HINTS.some((h) => n.includes(h))) return 'Female';
  if (MALE_NAME_HINTS.some((h) => n.includes(h))) return 'Male';
  return null;
}

class BrowserVoiceEngine {
  private synth: SpeechSynthesis | null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private _isSpeaking = false;
  private _rate = 0.88;
  private _lastNoVoiceWarning = '';
  private _lastVoicesSnapshot: SpeechSynthesisVoice[] = [];
  private _lastPickedVoiceLabel = '';

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

  /** Human-readable list of every voice this browser/device reported (for diagnostics). */
  get lastDetectedVoiceLabels(): string[] {
    return this._lastVoicesSnapshot.map((v) => `${v.name} (${v.lang})`);
  }

  /** Which voice was actually used for the last speak() call. */
  get lastPickedVoiceLabel(): string {
    return this._lastPickedVoiceLabel;
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

  /** All voices that plausibly speak the requested language (lang-code or name-hint match). */
  private candidatesForLang(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice[] {
    const langLower = lang.toLowerCase();
    const langPrefix = langLower.split('-')[0]; // e.g. "hi" from "hi-IN"
    const nameHints = LANG_VOICE_NAME_HINTS[langPrefix] || [];

    const exact = voices.filter((v) => v.lang?.toLowerCase() === langLower);
    const prefixMatch = voices.filter((v) => v.lang?.toLowerCase().startsWith(langPrefix));
    const nameMatch = nameHints.length
      ? voices.filter((v) => nameHints.some((hint) => v.name.toLowerCase().includes(hint)))
      : [];

    // Merge, de-duplicated, preserving priority order: exact lang > prefix lang > name hint
    const merged: SpeechSynthesisVoice[] = [];
    for (const list of [exact, prefixMatch, nameMatch]) {
      for (const v of list) {
        if (!merged.includes(v)) merged.push(v);
      }
    }
    return merged;
  }

  private pickVoice(
    candidates: SpeechSynthesisVoice[],
    genderPref?: VoiceGender
  ): SpeechSynthesisVoice | null {
    if (candidates.length === 0) return null;
    if (genderPref) {
      const genderMatch = candidates.find((v) => guessGender(v.name) === genderPref);
      if (genderMatch) return genderMatch;
    }
    return candidates[0];
  }

  async speak(text: string, options: VoiceOptions = {}): Promise<void> {
    if (!this.synth) {
      throw new Error('Speech synthesis is not supported in this browser.');
    }

    this.stop();
    this._lastNoVoiceWarning = '';
    this._lastPickedVoiceLabel = '';

    const voices = await this.waitForVoices();
    this._lastVoicesSnapshot = voices;

    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error('Speech synthesis is not supported in this browser.'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate ?? this._rate;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = options.volume ?? 0.85;

      // Meditative pitch shaping: even when a device only exposes ONE Hindi
      // (or English) voice, we still give a perceptibly different, calmer
      // male/female character by shaping pitch/rate slightly — a common
      // technique since Web Speech API rarely offers two Hindi voices.
      const applyMeditativeShape = (gender: VoiceGender | undefined, hadExactGenderVoice: boolean) => {
        if (!gender || hadExactGenderVoice) return; // real distinct voice already sounds right
        if (gender === 'Male') {
          utterance.pitch = (options.pitch ?? 1.0) * 0.86; // deeper, calmer
          utterance.rate = (options.rate ?? this._rate) * 0.96;
        } else {
          utterance.pitch = (options.pitch ?? 1.0) * 1.08; // softer, warmer
          utterance.rate = (options.rate ?? this._rate) * 0.98;
        }
      };

      if (options.lang) {
        const candidates = this.candidatesForLang(voices, options.lang);
        const picked = this.pickVoice(candidates, options.voiceGender);

        if (picked) {
          utterance.voice = picked;
          utterance.lang = picked.lang;
          this._lastPickedVoiceLabel = `${picked.name} (${picked.lang})`;
          const exactGenderMatch = options.voiceGender
            ? guessGender(picked.name) === options.voiceGender
            : true;
          applyMeditativeShape(options.voiceGender, exactGenderMatch);
        } else {
          // No matching voice installed on this device for the requested
          // language. Setting utterance.lang without a matching voice makes
          // Chrome/Edge fail SILENTLY (no error, no audio) — so instead we
          // fall back to a gender-matched default-language voice (or the
          // browser default) and surface a clear warning + voice list.
          const fallback = this.pickVoice(voices, options.voiceGender);
          if (fallback) {
            utterance.voice = fallback;
            this._lastPickedVoiceLabel = `${fallback.name} (${fallback.lang}) — fallback, not ${options.lang}`;
            applyMeditativeShape(options.voiceGender, false);
          }
          this._lastNoVoiceWarning =
            `No installed voice found for "${options.lang}" on this device/browser. ` +
            `Speaking with an available voice instead. To hear narration in this language, install ` +
            `a matching text-to-speech voice: Android → Settings → System → Languages → Text-to-speech ` +
            `→ add the language; Windows → Settings → Time & Language → Speech → Add a voice; ` +
            `macOS/iOS → Settings → Accessibility → Spoken Content → Voices → add the language.`;
          console.warn(
            `[voice-engine] No voice found for ${options.lang}. Detected voices:`,
            voices.map((v) => `${v.name} (${v.lang})`)
          );
        }
      } else {
        // English (or unspecified language) — pick by gender preference among en-* voices,
        // falling back to well-known calm English voice names.
        const enCandidates = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
        const picked =
          this.pickVoice(enCandidates, options.voiceGender) ||
          voices.find(
            (v) =>
              v.name.includes('Samantha') ||
              v.name.includes('Karen') ||
              v.name.includes('Moira') ||
              v.name.includes('Google UK English Female') ||
              v.name.includes('Microsoft Zira')
          ) ||
          null;
        if (picked) {
          utterance.voice = picked;
          this._lastPickedVoiceLabel = `${picked.name} (${picked.lang})`;
          const exactGenderMatch = options.voiceGender ? guessGender(picked.name) === options.voiceGender : true;
          applyMeditativeShape(options.voiceGender, exactGenderMatch);
        }
      }

      if (options.voiceName) {
        const named = voices.find((v) =>
          v.name.toLowerCase().includes(options.voiceName!.toLowerCase())
        );
        if (named) {
          utterance.voice = named;
          this._lastPickedVoiceLabel = `${named.name} (${named.lang})`;
        }
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
    const voices = await this.waitForVoices();
    this._lastVoicesSnapshot = voices;
    return voices;
  }
}

// Singleton — created lazily
let _engine: BrowserVoiceEngine | null = null;

export function getVoiceEngine(): BrowserVoiceEngine {
  if (!_engine) _engine = new BrowserVoiceEngine();
  return _engine;
}

export { BrowserVoiceEngine };
