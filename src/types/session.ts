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
  timeline: TimelinePhase[];
  narration_script: string;
  screen_text: ScreenTextItem[];
  animation_cues: string;
  body_focus_areas: string[];
  motivation_summary: string;
  safety_notes: string;
}

export interface UserProfile {
  age: number;
  gender: string;
  primaryCondition: string;
  secondaryConditions: string[];
  painLevel: number;
  mobilityLevel: 'Low' | 'Moderate' | 'High';
  energyLevel: 'Low' | 'Moderate' | 'High';
  sleepQuality: 'Poor' | 'Fair' | 'Good';
  stressLevel: 'Low' | 'Moderate' | 'High';
  fitnessGoal: string;
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
] as const;
