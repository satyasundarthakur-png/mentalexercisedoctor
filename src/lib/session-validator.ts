import type { SessionJSON, ValidationResult } from '@/types/session';

function timeToSeconds(time: string): number {
  const parts = (time || '0:00').split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

/**
 * Validates and auto-repairs LLM-generated sessions.
 * Returns { isValid, errors, repaired } and mutates data for repairs.
 */
export function validateAndRepairSession(data: unknown): {
  result: ValidationResult;
  session: SessionJSON | null;
} {
  const errors: string[] = [];
  let repaired = false;

  if (!data || typeof data !== 'object') {
    return { result: { isValid: false, errors: ['Session must be a JSON object'], repaired: false }, session: null };
  }

  const d = data as Record<string, unknown>;

  // ─── REQUIRED FIELDS ───────────────────────────────────────
  const required: (keyof SessionJSON)[] = [
    'session_title',
    'narration_script',
    'timeline',
    'body_focus_areas',
    'safety_notes',
  ];
  for (const field of required) {
    if (!d[field]) errors.push(`Missing required field: ${field}`);
  }

  // ─── TIMELINE VALIDATION ───────────────────────────────────
  if (Array.isArray(d.timeline)) {
    if (d.timeline.length < 3) errors.push('Timeline must have at least 3 phases');

    let totalDuration = 0;
    d.timeline.forEach((phase: unknown, index: number) => {
      if (!phase || typeof phase !== 'object') {
        errors.push(`Timeline phase ${index} is not an object`);
        return;
      }
      const p = phase as Record<string, unknown>;
      if (!p.start_time || !p.end_time || !p.phase) {
        errors.push(`Timeline phase ${index} missing start_time, end_time, or phase name`);
      }
      if (typeof p.duration_seconds === 'number') totalDuration += p.duration_seconds;
    });

    // Tolerate a wide range — LLMs sometimes generate 5:00 instead of 5:30
    if (totalDuration > 0 && (totalDuration < 200 || totalDuration > 420)) {
      errors.push(`Total timeline duration ${totalDuration}s seems off (expected 280–350s)`);
    }

    // ─── AUTO-REPAIR: screen_text from timeline ─────────────
    if (
      !d.screen_text ||
      !Array.isArray(d.screen_text) ||
      (d.screen_text as unknown[]).length === 0
    ) {
      d.screen_text = (d.timeline as Record<string, unknown>[]).map((p) => ({
        start_time: p.start_time,
        end_time: p.end_time,
        text: p.screen_text || p.phase,
      }));
      repaired = true;
    }
  } else {
    errors.push('timeline must be an array');
  }

  // ─── AUTO-REPAIR: body_focus_areas as array ────────────────
  if (d.body_focus_areas && !Array.isArray(d.body_focus_areas)) {
    d.body_focus_areas = [String(d.body_focus_areas)];
    repaired = true;
  }

  // ─── AUTO-REPAIR: fill optional string fields ──────────────
  const optionalStrings: (keyof SessionJSON)[] = [
    'estimated_duration',
    'medical_category',
    'breathing_pattern',
    'background_music_recommendation',
    'voice_recommendation',
    'difficulty_level',
    'estimated_emotional_impact',
    'animation_cues',
    'motivation_summary',
  ];
  for (const field of optionalStrings) {
    if (!d[field]) {
      d[field] = field === 'estimated_duration' ? '5 minutes 30 seconds' : 'Not specified';
      repaired = true;
    }
  }

  // ─── NARRATION LENGTH CHECK ────────────────────────────────
  if (typeof d.narration_script === 'string' && d.narration_script.length < 150) {
    errors.push('narration_script is too short (must be at least 150 characters)');
  }

  const isValid = errors.length === 0;
  return {
    result: { isValid, errors, repaired },
    session: isValid || repaired ? (d as unknown as SessionJSON) : null,
  };
}
