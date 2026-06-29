'use client';

import React, { useState, useCallback } from 'react';
import type { UserProfile, SafetyCheckResult } from '@/types/session';
import { CONDITIONS } from '@/types/session';
import { performSafetyCheck } from '@/lib/safety-layer';
import { createTherapyPlan } from '@/lib/therapy-planner';
import { lookupConditionKnowledge } from '@/lib/knowledge-graph';
import { generateTherapySession } from '@/lib/ai-composer';
import type { SessionJSON } from '@/types/session';

interface ProfileFormProps {
  onSessionGenerated: (session: SessionJSON) => void;
}

const MOBILITY_OPTIONS = ['Low', 'Moderate', 'High'] as const;
const ENERGY_OPTIONS = ['Low', 'Moderate', 'High'] as const;
const SLEEP_OPTIONS = ['Poor', 'Fair', 'Good'] as const;
const STRESS_OPTIONS = ['Low', 'Moderate', 'High'] as const;
const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'] as const;

const DEFAULT_PROFILE: UserProfile = {
  age: 62,
  gender: 'Female',
  primaryCondition: 'Stroke',
  secondaryConditions: [],
  painLevel: 4,
  mobilityLevel: 'Moderate',
  energyLevel: 'Moderate',
  sleepQuality: 'Fair',
  stressLevel: 'Moderate',
  fitnessGoal: 'Improve arm function, walk more confidently, and sleep better',
};

export default function ProfileForm({ onSessionGenerated }: ProfileFormProps) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [safetyWarning, setSafetyWarning] = useState<SafetyCheckResult | null>(null);
  const [generationStage, setGenerationStage] = useState('');

  const updateField = useCallback(<K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleSecondary = useCallback((condition: string) => {
    setProfile((prev) => {
      const current = prev.secondaryConditions;
      return {
        ...prev,
        secondaryConditions: current.includes(condition)
          ? current.filter((c) => c !== condition)
          : [...current, condition],
      };
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    setError('');
    setSafetyWarning(null);

    // Safety check first — always
    const safety = performSafetyCheck(profile);

    if (!safety.isSafe) {
      setSafetyWarning(safety);
      if (safety.riskLevel === 'critical') return; // Block generation
    } else {
      setSafetyWarning(null);
    }

    setIsGenerating(true);

    try {
      setGenerationStage('Running clinical analysis…');
      const knowledge = lookupConditionKnowledge(profile.primaryCondition);
      const therapyPlan = createTherapyPlan(profile, safety);

      setGenerationStage('Composing your personalized session with AI…');
      const session = await generateTherapySession(profile, therapyPlan, knowledge);

      setGenerationStage('');
      onSessionGenerated(session);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(
        message.includes('VITE_GROQ_API_KEY')
          ? 'Groq API key not configured. Add VITE_GROQ_API_KEY to your Lovable environment variables.'
          : `Session generation failed: ${message}`
      );
    } finally {
      setIsGenerating(false);
      setGenerationStage('');
    }
  }, [profile, onSessionGenerated]);

  const secondaryOptions = (CONDITIONS as readonly string[]).filter(
    (c) => c !== profile.primaryCondition
  );

  return (
    <div className="bg-white rounded-4xl border border-[#e6e3d9] p-8 md:p-10 shadow-xl">
      <h3 className="text-xl font-light text-[#2c3e2d] mb-7">Tell us about you</h3>

      {/* ── SAFETY WARNING ────────────────────────────────────────── */}
      {safetyWarning && (
        <div
          role="alert"
          className={`rounded-2xl p-4 mb-6 border ${
            safetyWarning.riskLevel === 'critical'
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <p
            className={`font-medium text-sm mb-1 ${
              safetyWarning.riskLevel === 'critical' ? 'text-red-700' : 'text-amber-800'
            }`}
          >
            {safetyWarning.riskLevel === 'critical' ? '⚠ Safety Alert' : '⚠ Health Advisory'}
          </p>
          <p className="text-sm text-gray-700">{safetyWarning.message}</p>
          <p className="text-xs text-gray-500 mt-1">{safetyWarning.recommendedAction}</p>
        </div>
      )}

      {/* ── AGE + GENDER ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <div>
          <label className="text-xs text-[#5c6b5c] block mb-1.5" htmlFor="age">Age</label>
          <input
            id="age"
            type="number"
            value={profile.age}
            onChange={(e) => updateField('age', parseInt(e.target.value) || 18)}
            min={16}
            max={100}
            className="w-full border border-[#d4d0c4] rounded-2xl px-4 py-3 text-sm text-[#2c3e2d] focus:outline-none focus:border-[#0f4c3a] bg-white"
          />
        </div>
        <div>
          <label className="text-xs text-[#5c6b5c] block mb-1.5" htmlFor="gender">Gender</label>
          <select
            id="gender"
            value={profile.gender}
            onChange={(e) => updateField('gender', e.target.value)}
            className="w-full border border-[#d4d0c4] rounded-2xl px-4 py-3 text-sm text-[#2c3e2d] focus:outline-none focus:border-[#0f4c3a] bg-white"
          >
            {GENDER_OPTIONS.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {/* ── PRIMARY CONDITION ─────────────────────────────────────── */}
      <div className="mb-5">
        <label className="text-xs text-[#5c6b5c] block mb-1.5" htmlFor="primary">
          Primary condition
        </label>
        <select
          id="primary"
          value={profile.primaryCondition}
          onChange={(e) => {
            updateField('primaryCondition', e.target.value);
            // Clear secondary if it equals new primary
            setProfile((prev) => ({
              ...prev,
              primaryCondition: e.target.value,
              secondaryConditions: prev.secondaryConditions.filter((c) => c !== e.target.value),
            }));
          }}
          className="w-full border border-[#d4d0c4] rounded-2xl px-4 py-3 text-sm text-[#2c3e2d] focus:outline-none focus:border-[#0f4c3a] bg-white"
        >
          {(CONDITIONS as readonly string[]).map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* ── SECONDARY CONDITIONS ──────────────────────────────────── */}
      <div className="mb-5">
        <p className="text-xs text-[#5c6b5c] mb-2.5">Secondary concerns (optional)</p>
        <div className="flex flex-wrap gap-2">
          {secondaryOptions.map((cond) => (
            <button
              key={cond}
              type="button"
              onClick={() => toggleSecondary(cond)}
              className={`px-3.5 py-1.5 text-xs rounded-full border transition-all ${
                profile.secondaryConditions.includes(cond)
                  ? 'bg-[#0f4c3a] text-white border-[#0f4c3a]'
                  : 'border-[#c8c3b8] text-[#2c3e2d] hover:bg-[#f1ede3] hover:border-[#a8a39a]'
              }`}
            >
              {cond}
            </button>
          ))}
        </div>
      </div>

      {/* ── PAIN + MOBILITY ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <div>
          <label className="text-xs text-[#5c6b5c] block mb-1.5" htmlFor="pain">
            Pain level: {profile.painLevel}/10
          </label>
          <input
            id="pain"
            type="range"
            min={0}
            max={10}
            step={1}
            value={profile.painLevel}
            onChange={(e) => updateField('painLevel', parseInt(e.target.value))}
            className="w-full mt-2"
          />
          <div className="flex justify-between text-[9px] text-[#8a9a8a] mt-1">
            <span>No pain</span>
            <span>Severe</span>
          </div>
        </div>
        <div>
          <label className="text-xs text-[#5c6b5c] block mb-1.5" htmlFor="mobility">Mobility level</label>
          <select
            id="mobility"
            value={profile.mobilityLevel}
            onChange={(e) => updateField('mobilityLevel', e.target.value as UserProfile['mobilityLevel'])}
            className="w-full border border-[#d4d0c4] rounded-2xl px-4 py-3 text-sm text-[#2c3e2d] focus:outline-none focus:border-[#0f4c3a] bg-white"
          >
            {MOBILITY_OPTIONS.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[#5c6b5c] block mb-1.5" htmlFor="energy">Energy level</label>
          <select
            id="energy"
            value={profile.energyLevel}
            onChange={(e) => updateField('energyLevel', e.target.value as UserProfile['energyLevel'])}
            className="w-full border border-[#d4d0c4] rounded-2xl px-4 py-3 text-sm text-[#2c3e2d] focus:outline-none focus:border-[#0f4c3a] bg-white"
          >
            {ENERGY_OPTIONS.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[#5c6b5c] block mb-1.5" htmlFor="stress">Stress level</label>
          <select
            id="stress"
            value={profile.stressLevel}
            onChange={(e) => updateField('stressLevel', e.target.value as UserProfile['stressLevel'])}
            className="w-full border border-[#d4d0c4] rounded-2xl px-4 py-3 text-sm text-[#2c3e2d] focus:outline-none focus:border-[#0f4c3a] bg-white"
          >
            {STRESS_OPTIONS.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-[#5c6b5c] block mb-1.5" htmlFor="sleep">Sleep quality</label>
          <select
            id="sleep"
            value={profile.sleepQuality}
            onChange={(e) => updateField('sleepQuality', e.target.value as UserProfile['sleepQuality'])}
            className="w-full border border-[#d4d0c4] rounded-2xl px-4 py-3 text-sm text-[#2c3e2d] focus:outline-none focus:border-[#0f4c3a] bg-white"
          >
            {SLEEP_OPTIONS.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* ── GOAL ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <label className="text-xs text-[#5c6b5c] block mb-1.5" htmlFor="goal">
          Recovery / fitness goal
        </label>
        <textarea
          id="goal"
          value={profile.fitnessGoal}
          onChange={(e) => updateField('fitnessGoal', e.target.value)}
          rows={3}
          maxLength={400}
          placeholder="What would you like to achieve or improve?"
          className="w-full border border-[#d4d0c4] rounded-2xl px-4 py-3 text-sm text-[#2c3e2d] focus:outline-none focus:border-[#0f4c3a] resize-none bg-white placeholder-[#b8b3a8]"
        />
        <p className="text-[10px] text-[#8a9a8a] text-right mt-1">
          {profile.fitnessGoal.length}/400
        </p>
      </div>

      {/* ── ERROR ────────────────────────────────────────────────── */}
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── GENERATE BUTTON ──────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating || safetyWarning?.riskLevel === 'critical'}
        className="w-full py-4 bg-[#0f4c3a] hover:bg-[#0a3a2b] text-white rounded-2xl text-base font-medium tracking-wide transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        {isGenerating ? (
          <>
            <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            <span>{generationStage || 'Generating…'}</span>
          </>
        ) : (
          'Generate my 5-minute personalized session'
        )}
      </button>

      <p className="text-center text-[10px] text-[#8a9a8a] mt-4 leading-relaxed">
        AI-generated sessions are for mental rehearsal only. They complement — never replace — professional care.
      </p>
    </div>
  );
}
