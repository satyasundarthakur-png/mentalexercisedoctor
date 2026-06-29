import type { SafetyCheckResult, UserProfile } from '@/types/session';

/**
 * Strict safety layer — must run BEFORE any session generation.
 * Returns a SafetyCheckResult with flags, risk level, and recommended action.
 */
export function performSafetyCheck(profile: UserProfile): SafetyCheckResult {
  const flags: string[] = [];
  const text = JSON.stringify(profile).toLowerCase();

  // ─── CRITICAL FLAGS ─────────────────────────────────────────
  if (text.includes('chest pain') || text.includes('acute chest')) flags.push('chest_pain');
  if (
    text.includes('shortness of breath at rest') ||
    text.includes('severe breathlessness') ||
    text.includes('can\'t breathe')
  )
    flags.push('severe_breathlessness');
  if (
    text.includes('suspected stroke') ||
    text.includes('sudden weakness') ||
    text.includes('facial droop') ||
    text.includes('slurred speech')
  )
    flags.push('possible_acute_stroke');
  if (
    text.includes('suicidal') ||
    text.includes('self harm') ||
    text.includes('self-harm') ||
    text.includes('want to die') ||
    text.includes('end my life')
  )
    flags.push('suicidal_ideation');
  if (text.includes('active cancer treatment') && text.includes('severe fatigue'))
    flags.push('active_cancer_severe');
  if (text.includes('recent major surgery') && text.includes('complication'))
    flags.push('postop_complication');

  // ─── HIGH RISK FLAGS ────────────────────────────────────────
  if (text.includes('unstable') || text.includes('recent fall with injury')) flags.push('fall_risk');
  if (profile.painLevel >= 9 || (text.includes('severe pain') && profile.painLevel >= 8))
    flags.push('severe_pain');
  if (text.includes('dizziness') && text.includes('standing')) flags.push('orthostatic_symptoms');
  if (text.includes('uncontrolled') && (text.includes('diabetes') || text.includes('hypertension')))
    flags.push('uncontrolled_comorbidity');

  // ─── BUILD RESULT ───────────────────────────────────────────
  if (flags.length === 0) {
    return {
      isSafe: true,
      riskLevel: 'none',
      message: 'No high-risk indicators detected.',
      recommendedAction: 'Proceed with personalized session generation.',
      flags: [],
    };
  }

  const criticalFlags = [
    'suicidal_ideation',
    'possible_acute_stroke',
    'severe_breathlessness',
    'chest_pain',
  ];
  if (flags.some((f) => criticalFlags.includes(f))) {
    return {
      isSafe: false,
      riskLevel: 'critical',
      message:
        'A critical safety concern has been detected. Please seek urgent medical or mental health support immediately.',
      recommendedAction:
        'Do not use this tool right now. Contact emergency services (112/999/911) or a crisis helpline. In India: iCall 9152987821 · Vandrevala 1860-2662-345.',
      flags,
    };
  }

  return {
    isSafe: false,
    riskLevel: 'high',
    message:
      'High-risk health indicators present. Please consult your healthcare provider before using this tool.',
    recommendedAction:
      'If your doctor has cleared you for gentle mental imagery, you may proceed with caution. A very gentle relaxation-only session is advisable.',
    flags,
  };
}
