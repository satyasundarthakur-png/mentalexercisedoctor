export interface TimelinePhase {
  phase: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  screen_text: string;
  animation_cue: string;
  body_focus: string[];
}

export interface ScreenTextItem {
  start_time: string;
  end_time: string;
  text: string;
}

export interface SessionJSON {
  session_title: string;
  estimated_duration: string;
  medical_category: string;
  breathing_pattern: string;
  background_music_recommendation: string;
  voice_recommendation: string;
  difficulty_level: string;
  estimated_emotional_impact: string;
  user_profile_summary?: string;
  language?: LanguageOption;
  voiceGender?: VoiceGender;
  timeline: TimelinePhase[];
  narration_script: string;
  screen_text: ScreenTextItem[];
  animation_cues: string;
  body_focus_areas: string[];
  motivation_summary: string;
  safety_notes: string;
}

// Base spoken languages supported. "Bilingual" sessions are composed as
// `Bilingual (<Language> + English)` at runtime rather than being separate
// union members, so adding a language only requires one line here.
export const INDIAN_LANGUAGES = [
  'English',
  'Hindi',
  'Telugu',
  'Tamil',
  'Kannada',
  'Malayalam',
  'Bengali',
  'Marathi',
  'Gujarati',
  'Punjabi',
  'Odia',
  'Urdu',
  'Assamese',
] as const;
export type BaseLanguage = typeof INDIAN_LANGUAGES[number];

// Free-form so `Bilingual (Telugu + English)` etc. are valid without an
// unwieldy union of every combination.
export type LanguageOption = string;

// BCP-47 speech codes used for both AI prompt language selection and
// browser TTS voice matching.
export const LANGUAGE_SPEECH_CODES: Record<BaseLanguage, string> = {
  English: 'en-IN',
  Hindi: 'hi-IN',
  Telugu: 'te-IN',
  Tamil: 'ta-IN',
  Kannada: 'kn-IN',
  Malayalam: 'ml-IN',
  Bengali: 'bn-IN',
  Marathi: 'mr-IN',
  Gujarati: 'gu-IN',
  Punjabi: 'pa-IN',
  Odia: 'or-IN',
  Urdu: 'ur-IN',
  Assamese: 'as-IN',
};

export type VoiceGender = 'Female' | 'Male';

export interface UserProfile {
  age: number;
  gender: string;
  primaryCondition: string;
  customConditionDetails?: string;
  secondaryConditions: string[];
  painLevel: number;
  mobilityLevel: 'Low' | 'Moderate' | 'High';
  energyLevel: 'Low' | 'Moderate' | 'High';
  sleepQuality: 'Poor' | 'Fair' | 'Good';
  stressLevel: 'Low' | 'Moderate' | 'High';
  fitnessGoal: string;
  language: LanguageOption;
  voiceGender: VoiceGender;
}

export interface TherapyPlan {
  primaryGoals: string[];
  secondaryGoals: string[];
  recommendedBreathing: string;
  recommendedTone: string;
  imageryThemes: string[];
  bodyFocus: string[];
  sessionIntensity: 'gentle' | 'moderate' | 'standard';
  relaxationEmphasis: number;
  motorImageryEmphasis: number;
  specialConsiderations: string[];
  mergedConditions: string[];
}

export interface SafetyCheckResult {
  isSafe: boolean;
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendedAction: string;
  flags: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  repaired: boolean;
}

export type VoiceProvider = 'browser' | 'elevenlabs' | 'openai' | 'google' | 'azure';

export interface VoiceOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceName?: string;
  lang?: string;
  voiceGender?: VoiceGender;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
}

export const CONDITIONS = [
  'Stroke',
  "Parkinson's disease",
  'Low back pain',
  'Knee arthritis',
  'Hip arthritis',
  'Post knee replacement',
  'COPD',
  'Anxiety',
  'Insomnia',
  'Fibromyalgia',
  'Healthy ageing',
  'Sedentary lifestyle',
  'Other (type your own / search with AI)',
] as const;

export function composeLanguage(base: BaseLanguage, bilingual: boolean): LanguageOption {
  return base !== 'English' && bilingual ? `Bilingual (${base} + English)` : base;
}

export function parseLanguage(language: LanguageOption): { base: BaseLanguage; bilingual: boolean } {
  const match = /^Bilingual \((.+) \+ English\)$/.exec(language);
  if (match && INDIAN_LANGUAGES.includes(match[1] as BaseLanguage)) {
    return { base: match[1] as BaseLanguage, bilingual: true };
  }
  return { base: (INDIAN_LANGUAGES.includes(language as BaseLanguage) ? language : 'English') as BaseLanguage, bilingual: false };
}

export function languageSpeechCode(language: LanguageOption): string {
  const { base } = parseLanguage(language);
  return LANGUAGE_SPEECH_CODES[base];
}
