import type { UserProfile, TherapyPlan, SafetyCheckResult } from '@/types/session';

/**
 * Therapy Planner
 *
 * Performs clinical reasoning before any AI narration is generated.
 * Analyzes the user profile, merges multiple conditions with weighted scoring,
 * and produces a structured TherapyPlan that drives the AI prompt.
 *
 * Architecture: Input → Safety → Clinical Analysis → Weighted Merge → Plan
 */

interface ConditionWeights {
  relaxation: number;
  motorImagery: number;
  intensity: 'gentle' | 'moderate' | 'standard';
}

function getConditionWeights(condition: string, painLevel: number, mobilityLevel: string): ConditionWeights {
  const p = condition.toLowerCase();
  if (p.includes('stroke')) return { relaxation: 35, motorImagery: 55, intensity: 'gentle' };
  if (p.includes('parkinson')) return { relaxation: 35, motorImagery: 52, intensity: 'gentle' };
  if (p.includes('knee') || p.includes('replacement')) return { relaxation: 30, motorImagery: 55, intensity: 'moderate' };
  if (p.includes('hip')) return { relaxation: 30, motorImagery: 50, intensity: 'moderate' };
  if (p.includes('back') || p.includes('lumbar')) return { relaxation: 35, motorImagery: 45, intensity: 'moderate' };
  if (p.includes('copd') || p.includes('respiratory')) return { relaxation: 55, motorImagery: 30, intensity: 'gentle' };
  if (p.includes('fibromyalgia') || p.includes('fatigue')) return { relaxation: 50, motorImagery: 30, intensity: 'gentle' };
  if (p.includes('anxiety')) return { relaxation: 60, motorImagery: 25, intensity: 'gentle' };
  if (p.includes('insomnia')) return { relaxation: 65, motorImagery: 20, intensity: 'gentle' };
  return { relaxation: 30, motorImagery: 50, intensity: 'standard' };
}

export function createTherapyPlan(
  profile: UserProfile,
  safety: SafetyCheckResult
): TherapyPlan {
  const plan: TherapyPlan = {
    primaryGoals: [],
    secondaryGoals: [],
    recommendedBreathing: 'diaphragmatic with extended exhale',
    recommendedTone: 'calm and reassuring',
    imageryThemes: [],
    bodyFocus: [],
    sessionIntensity: 'standard',
    relaxationEmphasis: 30,
    motorImageryEmphasis: 50,
    specialConsiderations: [],
    mergedConditions: [],
  };

  const primary = (profile.primaryCondition || '').toLowerCase();
  const secondaries = (profile.secondaryConditions || []).map((s) => s.toLowerCase());

  // ─── PRIMARY CONDITION ANALYSIS ─────────────────────────────
  const primaryWeights = getConditionWeights(primary, profile.painLevel, profile.mobilityLevel);
  plan.relaxationEmphasis = primaryWeights.relaxation;
  plan.motorImageryEmphasis = primaryWeights.motorImagery;
  plan.sessionIntensity = primaryWeights.intensity;

  if (primary.includes('stroke')) {
    plan.primaryGoals.push(
      'Improve motor control and confidence in the affected limb',
      'Reduce fear of movement and re-engage body awareness'
    );
    plan.imageryThemes.push('smooth reaching and grasping', 'confident walking', 'functional independence tasks');
    plan.bodyFocus.push('affected arm/hand', 'core stability', 'affected leg');
    plan.recommendedTone = 'reassuring, warm, and compassionate';
    plan.specialConsiderations.push('Use first-person kinesthetic imagery: "feel yourself lifting your arm"');
  }

  if (primary.includes('parkinson')) {
    plan.primaryGoals.push(
      'Improve gait fluidity and reduce freezing-of-gait imagery',
      'Enhance balance confidence and postural stability'
    );
    plan.imageryThemes.push('steady rhythmic walking', 'clear foot lift', 'fluid arm swing');
    plan.bodyFocus.push('feet', 'legs', 'posture', 'core');
    plan.recommendedTone = 'steady, measured, and rhythmic';
    plan.recommendedBreathing = 'rhythmic 4-count breathing coordinated with imagined steps';
    plan.specialConsiderations.push('Use cue words: "big steps", "tall posture", "loud footsteps"');
  }

  if (primary.includes('knee') || primary.includes('replacement')) {
    plan.primaryGoals.push(
      'Reduce kinesiophobia — fear of weight-bearing and bending',
      'Rehearse safe, pain-free knee function through mental practice'
    );
    plan.imageryThemes.push('smooth knee bending', 'confident weight shifting', 'climbing stairs', 'rising from chair');
    plan.bodyFocus.push('knee', 'quadriceps', 'hips', 'ankles');
    plan.recommendedTone = 'supportive, patient, and encouraging';
  }

  if (primary.includes('hip') && !primary.includes('replacement')) {
    plan.primaryGoals.push('Rehearse hip mobility and confident weight transfer');
    plan.imageryThemes.push('smooth hip rotation', 'confident stepping', 'balanced symmetrical gait');
    plan.bodyFocus.push('hip', 'gluteals', 'pelvis', 'legs');
  }

  if (primary.includes('back') || primary.includes('lumbar')) {
    plan.primaryGoals.push(
      'Reduce pain catastrophizing and fear-avoidance behaviours',
      'Rehearse fluid, confident spinal movement'
    );
    plan.imageryThemes.push('gentle spinal extension', 'core engagement', 'pain-free bending and lifting');
    plan.bodyFocus.push('lumbar spine', 'core', 'hips', 'gluteals');
    plan.specialConsiderations.push('Avoid imagery of forceful movements — keep all imagery gentle and controlled');
  }

  if (primary.includes('copd') || primary.includes('respiratory')) {
    plan.primaryGoals.push(
      'Improve breathing efficiency and reduce dyspnoea anxiety',
      'Build paced activity tolerance through mental rehearsal'
    );
    plan.imageryThemes.push('open and clear airways', 'effortless paced breathing', 'calm controlled exhalation');
    plan.bodyFocus.push('chest', 'diaphragm', 'airways', 'posture');
    plan.recommendedBreathing = 'pursed-lip breathing with extended 6-count exhale';
    plan.specialConsiderations.push('Imagery must remain low effort — no imagery of brisk walking or exertion');
  }

  if (primary.includes('fibromyalgia')) {
    plan.primaryGoals.push('Reduce whole-body tension and pain sensitisation');
    plan.imageryThemes.push('warmth and release through painful areas', 'gentle flowing movement', 'restorative rest');
    plan.bodyFocus.push('whole body', 'neck', 'shoulders', 'back');
    plan.specialConsiderations.push('Extremely gentle — no specific motor imagery, focus on pain relief and nervous system calming');
  }

  if (primary.includes('anxiety')) {
    plan.primaryGoals.push('Activate parasympathetic nervous system', 'Reduce anxiety through grounding imagery');
    plan.imageryThemes.push('safe place visualization', 'grounding in nature', 'calm breathing awareness');
    plan.bodyFocus.push('chest', 'diaphragm', 'whole body');
    plan.recommendedBreathing = '4-7-8 breathing or box breathing';
  }

  if (primary.includes('insomnia')) {
    plan.primaryGoals.push('Prepare the nervous system for restorative sleep');
    plan.imageryThemes.push('progressive body relaxation', 'drifting peacefully', 'heavy warm limbs');
    plan.bodyFocus.push('whole body', 'legs', 'shoulders');
  }

  // ─── SECONDARY CONDITION MERGE (weighted) ───────────────────
  // Secondary conditions contribute at 30% weight to adjust primary emphasis
  let secondaryRelaxAdjust = 0;
  let secondaryMotorAdjust = 0;

  if (secondaries.some((s) => s.includes('anxiety') || s.includes('stress'))) {
    plan.secondaryGoals.push('Reduce anxiety and promote parasympathetic activation');
    plan.recommendedBreathing = 'box breathing or 4-7-8 breathing';
    secondaryRelaxAdjust += 15;
    secondaryMotorAdjust -= 10;
    plan.specialConsiderations.push('High anxiety: always begin with grounding and safety imagery before motor tasks');
  }

  if (secondaries.some((s) => s.includes('sleep') || s.includes('insomnia'))) {
    plan.secondaryGoals.push('Prepare nervous system for restorative sleep');
    secondaryRelaxAdjust += 10;
    plan.specialConsiderations.push('Include a winding-down / sleep-preparation closing segment');
  }

  if (secondaries.some((s) => s.includes('fibromyalgia') || s.includes('fatigue'))) {
    plan.sessionIntensity = 'gentle';
    secondaryMotorAdjust -= 15;
    secondaryRelaxAdjust += 15;
    plan.specialConsiderations.push('Widespread pain/fatigue: very gentle imagery only, emphasise rest and release');
  }

  if (secondaries.some((s) => s.includes('depression'))) {
    plan.secondaryGoals.push('Activate positive emotional states and sense of accomplishment');
    plan.imageryThemes.push('small victories', 'warmth and connection', 'sense of capability');
    plan.specialConsiderations.push('Depression: include positive future projection, achievement imagery, and warmth');
  }

  if (secondaries.some((s) => s.includes('copd') || s.includes('respiratory'))) {
    plan.recommendedBreathing = 'pursed-lip breathing — do not hold breath during imagery';
    secondaryRelaxAdjust += 10;
  }

  // Apply secondary weights at 30% blend
  plan.relaxationEmphasis = Math.round(plan.relaxationEmphasis + secondaryRelaxAdjust * 0.3);
  plan.motorImageryEmphasis = Math.round(plan.motorImageryEmphasis + secondaryMotorAdjust * 0.3);

  // ─── SEVERITY OVERRIDES ─────────────────────────────────────
  if (profile.painLevel >= 7 || profile.mobilityLevel === 'Low') {
    plan.sessionIntensity = 'gentle';
    plan.motorImageryEmphasis = Math.min(plan.motorImageryEmphasis, 35);
    plan.relaxationEmphasis = Math.max(plan.relaxationEmphasis, 50);
    plan.specialConsiderations.push('High pain / low mobility: keep all imagery very gentle and controllable');
  }

  if (profile.energyLevel === 'Low') {
    plan.sessionIntensity = 'gentle';
    plan.relaxationEmphasis = Math.max(plan.relaxationEmphasis, 45);
    plan.specialConsiderations.push('Low energy: session should feel restful, not effortful');
  }

  if (safety.riskLevel === 'high') {
    plan.sessionIntensity = 'gentle';
    plan.motorImageryEmphasis = Math.min(plan.motorImageryEmphasis, 25);
    plan.relaxationEmphasis = Math.max(plan.relaxationEmphasis, 60);
    plan.specialConsiderations.push('High risk flag: default to general relaxation only, minimal motor imagery');
  }

  // ─── CLAMP & NORMALIZE ──────────────────────────────────────
  plan.relaxationEmphasis = Math.min(Math.max(plan.relaxationEmphasis, 20), 75);
  plan.motorImageryEmphasis = Math.min(Math.max(plan.motorImageryEmphasis, 10), 65);
  const total = plan.relaxationEmphasis + plan.motorImageryEmphasis;
  if (total > 100) {
    plan.motorImageryEmphasis = 100 - plan.relaxationEmphasis;
  }

  // ─── FALLBACK GOALS ────────────────────────────────────────
  if (plan.primaryGoals.length === 0) {
    plan.primaryGoals.push(
      'Improve body awareness and reduce physical tension',
      'Build confidence in gentle movement through mental rehearsal'
    );
    plan.imageryThemes.push('calm safe body awareness', 'gentle flowing movement', 'ease and comfort');
    plan.bodyFocus.push('whole body');
  }

  // ─── FINALISE ───────────────────────────────────────────────
  plan.mergedConditions = [
    profile.primaryCondition,
    ...(profile.secondaryConditions || []),
  ].filter(Boolean);

  return plan;
}
