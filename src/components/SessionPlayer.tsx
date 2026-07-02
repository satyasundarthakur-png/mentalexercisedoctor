'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SessionJSON } from '@/types/session';
import BodyVisualizer from './BodyVisualizer';
import ConversationInterface from './ConversationInterface';
import { getVoiceEngine } from '@/lib/voice-engine';

interface SessionPlayerProps {
  session: SessionJSON;
  onReset: () => void;
}

const TOTAL_DURATION = 330; // 5m 30s

function timeToSeconds(time: string): number {
  const parts = (time || '0:00').split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SessionPlayer({ session, onReset }: SessionPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const [currentScreenText, setCurrentScreenText] = useState('');
  const [currentBodyFocus, setCurrentBodyFocus] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceRate, setVoiceRate] = useState(0.88);
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);
  const [voiceWarning, setVoiceWarning] = useState('');
  const [showTranscript, setShowTranscript] = useState(true);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentPhase = session.timeline?.[currentPhaseIdx] ?? null;
  const isBreathing = currentPhase?.phase?.toLowerCase().includes('breath') ?? false;
  const progressPct = Math.min((currentTime / TOTAL_DURATION) * 100, 100);

  // Sync UI state to current time
  useEffect(() => {
    if (!session.timeline) return;

    const pIdx = session.timeline.findIndex((p) => {
      const s = timeToSeconds(p.start_time);
      const e = timeToSeconds(p.end_time);
      return currentTime >= s && currentTime < e;
    });

    if (pIdx !== -1 && pIdx !== currentPhaseIdx) setCurrentPhaseIdx(pIdx);

    const ph = pIdx !== -1 ? session.timeline[pIdx] : currentPhase;

    const activeTxt = session.screen_text?.find((t) => {
      const s = timeToSeconds(t.start_time);
      const e = timeToSeconds(t.end_time);
      return currentTime >= s && currentTime < e;
    });

    setCurrentScreenText(activeTxt?.text ?? ph?.screen_text ?? '');
    setCurrentBodyFocus(ph?.body_focus ?? session.body_focus_areas ?? []);
  }, [currentTime, session]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    intervalRef.current = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= TOTAL_DURATION) {
          stopTimer();
          setIsPlaying(false);
          return TOTAL_DURATION;
        }
        return prev + 1;
      });
    }, 1000);
  }, [stopTimer]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      stopTimer();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      startTimer();
    }
  }, [isPlaying, startTimer, stopTimer]);

  const restart = useCallback(() => {
    stopTimer();
    getVoiceEngine().stop();
    setIsSpeaking(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentPhaseIdx(0);
    const ph = session.timeline?.[0];
    setCurrentScreenText(ph?.screen_text ?? '');
    setCurrentBodyFocus(ph?.body_focus ?? session.body_focus_areas ?? []);
  }, [stopTimer, session]);

  const seekToPhase = useCallback(
    (index: number) => {
      const ph = session.timeline?.[index];
      if (!ph) return;
      const s = timeToSeconds(ph.start_time);
      setCurrentTime(s);
      setCurrentPhaseIdx(index);
      setCurrentScreenText(ph.screen_text ?? '');
      setCurrentBodyFocus(ph.body_focus ?? []);
    },
    [session]
  );

  const handleNarration = useCallback(async () => {
    const ve = getVoiceEngine();
    if (!ve.isSupported) {
      alert('Text-to-speech is not supported in this browser. Try Chrome or Safari.');
      return;
    }
    if (ve.isSpeaking()) {
      ve.stop();
      setIsSpeaking(false);
      return;
    }
    ve.setRate(voiceRate);
    setIsSpeaking(true);
    setVoiceWarning('');
    const speechLang =
      session.language === 'Hindi' || session.language === 'Bilingual (Hindi + English)'
        ? 'hi-IN'
        : undefined;
    try {
      await ve.speak(session.narration_script, {
        rate: voiceRate,
        lang: speechLang,
        voiceGender: session.voiceGender,
      });
      if (ve.lastNoVoiceWarning) {
        const voicesList = ve.lastDetectedVoiceLabels;
        const listPreview = voicesList.length
          ? ` Voices detected on this device: ${voicesList.slice(0, 8).join(', ')}${voicesList.length > 8 ? '…' : ''}`
          : ' No voices were detected on this device/browser at all.';
        setVoiceWarning(ve.lastNoVoiceWarning + listPreview);
      }
    } catch (err) {
      console.error('TTS error:', err);
    } finally {
      setIsSpeaking(false);
    }
  }, [session.narration_script, session.language, session.voiceGender, voiceRate]);

  const adjustRate = useCallback((delta: number) => {
    setVoiceRate((r) => {
      const next = Math.round((r + delta) * 10) / 10;
      return Math.min(Math.max(next, 0.5), 1.5);
    });
    if (isSpeaking) {
      getVoiceEngine().stop();
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

  const copyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(session, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available — silent fail
    }
  }, [session]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopTimer();
      getVoiceEngine().stop();
    };
  }, [stopTimer]);

  const intensity = currentPhase?.phase?.toLowerCase().includes('imagery') ? 'high' : 'medium';

  return (
    <div className="bg-white rounded-4xl shadow-xl overflow-hidden border border-[#e6e3d9]">
      {/* ── HEADER ───────────────────────────────────────────────── */}
      <header className="px-8 pt-7 pb-5 border-b border-[#e6e3d9]">
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0">
            <p className="text-[10px] tracking-[3px] text-[#5c6b5c] uppercase">5-Minute guided session</p>
            <h2 className="text-2xl font-light tracking-tight mt-1 text-[#2c3e2d] leading-snug">
              {session.session_title}
            </h2>
            <p className="text-xs text-[#5c6b5c] mt-1">
              {session.medical_category}
              {session.difficulty_level ? ` · ${session.difficulty_level}` : ''}
              {session.language ? ` · ${session.language}` : ''}
            </p>
          </div>
          <div className="flex-shrink-0 text-right text-xs text-[#5c6b5c]">
            <p>{session.estimated_duration}</p>
            {session.estimated_emotional_impact && (
              <p className="mt-0.5 text-[10px]">{session.estimated_emotional_impact}</p>
            )}
          </div>
        </div>
      </header>

      {/* ── VISUAL STAGE ─────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-[#f8f7f4] to-[#f0ede4] px-8 py-8 pb-20 min-h-72">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 w-full max-w-3xl mx-auto">
          {/* Body Visualizer */}
          <div className="flex-shrink-0">
            <BodyVisualizer
              highlightedParts={currentBodyFocus}
              phase={currentPhase?.phase ?? ''}
              intensity={intensity}
            />
          </div>

          {/* Phase info */}
          <div className="flex-1 text-center max-w-sm">
            <AnimatePresence mode="wait">
              {isBreathing ? (
                <motion.div
                  key="breathing-orb"
                  className="w-52 h-52 mx-auto rounded-full border-[12px] border-[#0f4c3a] flex items-center justify-center mb-4"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="text-center">
                    <p className="text-5xl font-light text-[#0f4c3a] leading-none">4 — 7</p>
                    <p className="text-[10px] tracking-[2px] text-[#5c6b5c] mt-2">INHALE · EXHALE</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={currentPhase?.phase ?? 'idle'}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                >
                  <div className="text-5xl mb-3">🧘</div>
                  <p className="text-3xl font-light text-[#2c3e2d] tracking-tight">
                    {currentPhase?.phase ?? 'Ready'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-[#5c6b5c] text-sm leading-relaxed mt-3 px-2">
              {(currentPhase?.animation_cue ?? '').substring(0, 180)}
            </p>
          </div>
        </div>

        {/* Screen text overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm px-8 py-4 border-t border-[#e6e3d9] min-h-[58px]">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentScreenText}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-lg text-[#2c3e2d] leading-snug"
            >
              {currentScreenText || session.motivation_summary?.substring(0, 120)}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* ── CONTROLS ─────────────────────────────────────────────── */}
      <div className="px-8 py-4 flex items-center gap-3 flex-wrap border-b border-[#e6e3d9]">
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause session' : 'Play session'}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0f4c3a] text-white text-xl hover:bg-[#0a3a2b] active:scale-95 transition-all flex-shrink-0"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <button
          onClick={restart}
          className="px-4 py-2 rounded-full border border-[#c8c3b8] hover:bg-[#f8f7f4] text-sm text-[#2c3e2d] transition-colors"
        >
          ↺ Restart
        </button>

        <button
          onClick={handleNarration}
          className={`px-4 py-2 rounded-full border text-sm transition-colors ${
            isSpeaking
              ? 'border-[#0f4c3a] bg-[#f0fdf4] text-[#0f4c3a]'
              : 'border-[#c8c3b8] hover:bg-[#f8f7f4] text-[#2c3e2d]'
          }`}
        >
          {isSpeaking ? '⏹ Stop narration' : '🔊 Play narration'}
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => adjustRate(-0.1)}
            title="Slower narration"
            className="px-3 py-2 rounded-full border border-[#c8c3b8] hover:bg-[#f8f7f4] text-xs text-[#2c3e2d]"
          >
            🐢
          </button>
          <span className="text-xs text-[#8a9a8a] font-mono w-8 text-center">×{voiceRate.toFixed(1)}</span>
          <button
            onClick={() => adjustRate(0.1)}
            title="Faster narration"
            className="px-3 py-2 rounded-full border border-[#c8c3b8] hover:bg-[#f8f7f4] text-xs text-[#2c3e2d]"
          >
            🐇
          </button>
        </div>

        <button
          onClick={() => setShowTranscript((s) => !s)}
          className={`px-4 py-2 rounded-full border text-sm transition-colors ${
            showTranscript
              ? 'border-[#0f4c3a] bg-[#f0fdf4] text-[#0f4c3a]'
              : 'border-[#c8c3b8] hover:bg-[#f8f7f4] text-[#2c3e2d]'
          }`}
        >
          📝 {showTranscript ? 'Hide transcript' : 'Show transcript'}
        </button>

        <div className="flex-1" />

        <p className="font-mono text-xs text-[#5c6b5c]">
          {formatTime(currentTime)} / 5:30
        </p>
      </div>

      {voiceWarning && (
        <div className="mx-8 mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          ⚠ {voiceWarning}
        </div>
      )}

      {showTranscript && (
        <div className="mx-8 mt-4 rounded-2xl border border-[#e6e3d9] bg-[#faf9f6] p-5">
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#5c6b5c] mb-2">
            Narration transcript {session.language ? `· ${session.language}` : ''}
          </p>
          <p className="text-sm text-[#2c3e2d] leading-relaxed whitespace-pre-wrap">
            {session.narration_script
              .split(/\[pause[^\]]*\]/gi)
              .map((chunk) => chunk.trim())
              .filter(Boolean)
              .join('  ⏸  ')}
          </p>
        </div>
      )}

      {/* ── PROGRESS + TIMELINE PHASES ──────────────────────────── */}
      <div className="px-8 py-5 border-b border-[#e6e3d9]">
        {/* Progress bar */}
        <div className="h-1 bg-[#e6e3d9] rounded-full mb-3 overflow-hidden">
          <motion.div
            className="h-full bg-[#0f4c3a] rounded-full"
            style={{ width: `${progressPct}%` }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </div>

        {/* Phase segments */}
        <div className="flex gap-1.5 mb-2">
          {session.timeline?.map((_, index) => (
            <button
              key={index}
              onClick={() => seekToPhase(index)}
              aria-label={`Jump to phase ${index + 1}: ${session.timeline[index].phase}`}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                index === currentPhaseIdx
                  ? 'bg-[#0f4c3a]'
                  : 'bg-[#d4d0c4] hover:bg-[#b8b3a3]'
              }`}
            />
          ))}
        </div>

        {/* Phase labels */}
        <div className="flex justify-between">
          {session.timeline?.map((p, i) => (
            <button
              key={i}
              onClick={() => seekToPhase(i)}
              className={`text-[9px] text-center flex-1 transition-colors truncate px-px ${
                i === currentPhaseIdx ? 'text-[#0f4c3a] font-medium' : 'text-[#6b7a6b]'
              }`}
            >
              {p.phase?.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* ── BODY FOCUS TAGS ──────────────────────────────────────── */}
      <div className="px-8 py-5 border-b border-[#e6e3d9]">
        <p className="text-[9px] tracking-[3px] text-[#5c6b5c] uppercase mb-2.5">Current body focus</p>
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {(currentBodyFocus.length > 0 ? currentBodyFocus : ['Whole body awareness']).map((area, i) => (
              <motion.span
                key={area}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }}
                className="px-3 py-1 rounded-full bg-[#f8f7f4] text-xs border border-[#d4d0c4] text-[#2c3e2d]"
              >
                {area}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ── CONVERSATION ─────────────────────────────────────────── */}
      <div className="px-8 pb-8">
        <ConversationInterface
          sessionTitle={session.session_title}
          onAdaptSession={() => {}}
        />
      </div>

      {/* ── JSON / ACTIONS ───────────────────────────────────────── */}
      <div className="px-8 pb-5 flex flex-wrap gap-2">
        <button
          onClick={() => setShowJson(!showJson)}
          className="px-4 py-1.5 rounded-full border border-[#c8c3b8] text-xs text-[#2c3e2d] hover:bg-[#f8f7f4] transition-colors"
        >
          {showJson ? 'Hide JSON' : 'View session JSON'}
        </button>
        <button
          onClick={copyJson}
          className="px-4 py-1.5 rounded-full border border-[#c8c3b8] text-xs text-[#2c3e2d] hover:bg-[#f8f7f4] transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy JSON'}
        </button>
        <button
          onClick={onReset}
          className="px-4 py-1.5 rounded-full border border-[#c8c3b8] text-xs text-[#5c6b5c] hover:bg-[#f8f7f4] transition-colors"
        >
          ← New session
        </button>
      </div>

      {showJson && (
        <pre className="mx-8 mb-8 bg-[#f8f7f4] rounded-2xl p-5 text-[10px] overflow-auto max-h-96 border border-[#e6e3d9] leading-relaxed">
          {JSON.stringify(session, null, 2)}
        </pre>
      )}

      {/* ── SAFETY FOOTER ────────────────────────────────────────── */}
      <footer className="bg-[#f8f7f4] px-8 py-4 border-t border-[#e6e3d9]">
        <p className="text-[11px] text-[#5c6b5c] leading-relaxed">
          This is mental rehearsal only — it complements, never replaces, professional medical and rehabilitation care. Always consult your healthcare provider before beginning any therapy programme.
        </p>
      </footer>
    </div>
  );
}
