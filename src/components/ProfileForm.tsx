'use client';

import React, { useState, useCallback } from 'react';
import type { UserProfile, SafetyCheckResult, LanguageOption } from '@/types/session';
import { CONDITIONS, LANGUAGES } from '@/types/session';
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
  language: 'English',
  customConditionDetails: '',
};

const OTHER_CONDITION = 'Other (type your own / search with AI)';

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

    if (profile.primaryCondition === OTHER_CONDITION && !profile.customConditionDetails?.trim()) {
      setError('Please describe your condition so the AI can research and tailor a session for it.');
      return;
    }

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

  const inputCls =
    "w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm text-[#0f2a23] focus:outline-none focus:border-[#0f4c3a] focus:ring-2 focus:ring-[#0f4c3a]/15 bg-white/90 backdrop-blur-sm transition-all shadow-[0_1px_2px_rgba(15,42,35,0.04)]";
  const labelCls = "text-[10px] font-semibold tracking-[0.14em] uppercase text-[#5c6b5c] block mb-2";

  return (
    <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-100 p-8 md:p-12 shadow-[0_20px_60px_-20px_rgba(15,42,35,0.18),0_4px_12px_-4px_rgba(15,42,35,0.06)]">
      <h3 className="text-2xl font-semibold tracking-tight text-[#0f2a23] mb-1">Tell us about you</h3>
      <p className="text-sm text-[#5c6b5c] mb-8">A few details to tailor your session.</p>

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
          <label className={labelCls} htmlFor="age">Age</label>
          <input
            id="age"
            type="number"
            value={profile.age}
            onChange={(e) => updateField('age', parseInt(e.target.value) || 18)}
            min={16}
            max={100}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="gender">Gender</label>
          <select
            id="gender"
            value={profile.gender}
            onChange={(e) => updateField('gender', e.target.value)}
            className={inputCls}
          >
            {GENDER_OPTIONS.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {/* ── LANGUAGE ───────────────────────────────────────────────── */}
      <div className="mb-5">
        <label className={labelCls} htmlFor="language">
          Session language
        </label>
        <select
          id="language"
          value={profile.language}
          onChange={(e) => updateField('language', e.target.value as LanguageOption)}
          className={inputCls}
        >
          {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
        </select>
        <p className="text-[10px] text-[#8a9a8a] mt-1">
          Choose Hindi or Bilingual to have narration and on-screen text in Hindi alongside English.
        </p>
      </div>

      {/* ── PRIMARY CONDITION ─────────────────────────────────────── */}
      <div className="mb-5">
        <label className={labelCls} htmlFor="primary">
          Primary condition
        </label>
        <select
          id="primary"
          value={profile.primaryCondition}
          onChange={(e) => {
            // Clear secondary if it equals new primary
            setProfile((prev) => ({
              ...prev,
              primaryCondition: e.target.value,
              secondaryConditions: prev.secondaryConditions.filter((c) => c !== e.target.value),
            }));
          }}
          className={inputCls}
        >
          {(CONDITIONS as readonly string[]).map((c) => <option key={c}>{c}</option>)}
        </select>

        {profile.primaryCondition === OTHER_CONDITION && (
          <div className="mt-3">
            <label className={labelCls} htmlFor="customCondition">
              Describe your condition
            </label>
            <textarea
              id="customCondition"
              value={profile.customConditionDetails}
              onChange={(e) => updateField('customConditionDetails', e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="e.g. Frozen shoulder after a fall, chronic migraine, post-surgical recovery…"
              className={`${inputCls} resize-none placeholder-[#b8b3a8]`}
            />
            <p className="text-[10px] text-[#8a9a8a] mt-1">
              Type any condition not in the list — the AI will research it and design a safe, tailored mental exercise session for you.
            </p>
          </div>
        )}
      </div>

      {/* ── SECONDARY CONDITIONS ──────────────────────────────────── */}
      <div className="mb-5">
        <p className={labelCls}>Secondary concerns (optional)</p>
        <div className="flex flex-wrap gap-2">
          {secondaryOptions.map((cond) => {
            const active = profile.secondaryConditions.includes(cond);
            return (
              <button
                key={cond}
                type="button"
                onClick={() => toggleSecondary(cond)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-br from-[#0f4c3a] to-[#1a7a5a] text-white border-[#0f4c3a] shadow-[0_4px_12px_-2px_rgba(15,76,58,0.45)] scale-[1.02]'
                    : 'bg-white/70 border-slate-200 text-[#2c3e2d] hover:bg-[#eef5f1] hover:border-[#0f4c3a]/40 hover:-translate-y-px shadow-[0_1px_2px_rgba(15,42,35,0.04)]'
                }`}
              >
                {cond}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── PAIN + MOBILITY ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <div>
          <label className={labelCls} htmlFor="pain">
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
          <label className={labelCls} htmlFor="mobility">Mobility level</label>
          <select
            id="mobility"
            value={profile.mobilityLevel}
            onChange={(e) => updateField('mobilityLevel', e.target.value as UserProfile['mobilityLevel'])}
            className={inputCls}
          >
            {MOBILITY_OPTIONS.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="energy">Energy level</label>
          <select
            id="energy"
            value={profile.energyLevel}
            onChange={(e) => updateField('energyLevel', e.target.value as UserProfile['energyLevel'])}
            className={inputCls}
          >
            {ENERGY_OPTIONS.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="stress">Stress level</label>
          <select
            id="stress"
            value={profile.stressLevel}
            onChange={(e) => updateField('stressLevel', e.target.value as UserProfile['stressLevel'])}
            className={inputCls}
          >
            {STRESS_OPTIONS.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="sleep">Sleep quality</label>
          <select
            id="sleep"
            value={profile.sleepQuality}
            onChange={(e) => updateField('sleepQuality', e.target.value as UserProfile['sleepQuality'])}
            className={inputCls}
          >
            {SLEEP_OPTIONS.map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* ── GOAL ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <label className={labelCls} htmlFor="goal">
          Recovery / fitness goal
        </label>
        <textarea
          id="goal"
          value={profile.fitnessGoal}
          onChange={(e) => updateField('fitnessGoal', e.target.value)}
          rows={3}
          maxLength={400}
          placeholder="What would you like to achieve or improve?"
          className={`${inputCls} resize-none placeholder-[#b8b3a8]`}
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
        className="w-full py-4 bg-gradient-to-br from-[#0f4c3a] via-[#136147] to-[#1a7a5a] hover:from-[#0a3a2b] hover:to-[#0f4c3a] text-white rounded-2xl text-base font-semibold tracking-wide transition-all shadow-[0_10px_30px_-8px_rgba(15,76,58,0.55)] hover:shadow-[0_14px_36px_-8px_rgba(15,76,58,0.65)] hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 flex items-center justify-center gap-3"
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
