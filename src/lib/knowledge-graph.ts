/**
 * Medical Knowledge Graph — compact inline version.
 *
 * Used to enrich the AI prompt with condition-specific goals, imagery themes,
 * breathing patterns, contraindications, and functional activities.
 *
 * Full expansion guide: add more conditions following the same schema.
 */

interface ConditionKnowledge {
  goals: string[];
  imagery: string[];
  breathing: string;
  contraindications: string[];
  functionalActivities: string[];
  motivationHooks: string[];
  progressionMarkers: string[];
}

const KNOWLEDGE_GRAPH: Record<string, Record<string, ConditionKnowledge>> = {
  neurological: {
    stroke: {
      goals: ['motor control', 'neuroplasticity via repetitive imagery', 'functional independence', 'body schema restoration'],
      imagery: ['reaching for a glass', 'opening a door', 'walking to the letterbox', 'buttoning a shirt'],
      breathing: 'slow diaphragmatic breathing, 4-count inhale, 6-count exhale',
      contraindications: ['imagery of activities not yet medically cleared', 'rapid or jerky movements'],
      functionalActivities: ['dressing', 'meal preparation', 'walking outdoors', 'handwriting'],
      motivationHooks: ['reconnecting with daily life', 'regaining independence', 'helping family'],
      progressionMarkers: ['imagining faster movements', 'adding dual-task imagery', 'imagining outside environments'],
    },
    parkinsons: {
      goals: ['gait fluidity', 'freezing reduction', 'balance confidence', 'fine motor rehearsal'],
      imagery: ['big deliberate steps', 'clear foot lift', 'rhythmic arm swing', 'walking through a doorway without freezing'],
      breathing: 'rhythmic 4-count breathing coordinated with imagined steps',
      contraindications: ['imagery involving sudden turns or pivots without preparation'],
      functionalActivities: ['grocery shopping', 'morning walk', 'eating with utensils', 'social participation'],
      motivationHooks: ['staying active', 'maintaining social connections', 'enjoying the outdoors'],
      progressionMarkers: ['imagining varied surfaces', 'adding imagery of distracting environments', 'dual-task rehearsal'],
    },
  },
  musculoskeletal: {
    low_back_pain: {
      goals: ['fear avoidance reduction', 'movement confidence', 'core engagement', 'pain neuromatrix retraining'],
      imagery: ['pain-free forward bending', 'gentle spinal rotation', 'lifting a light bag', 'walking freely'],
      breathing: 'diaphragmatic with lateral costal expansion',
      contraindications: ['heavy lifting imagery', 'high-impact activities', 'imagery during pain flare'],
      functionalActivities: ['gardening', 'cooking', 'picking up grandchildren', 'walking the dog'],
      motivationHooks: ['returning to daily activities', 'reducing fear of movement', 'independence'],
      progressionMarkers: ['imagining longer walks', 'adding gentle rotation imagery', 'stair climbing imagery'],
    },
    knee_arthritis: {
      goals: ['kinesiophobia reduction', 'range of motion confidence', 'weight bearing rehearsal'],
      imagery: ['smooth knee bending to 90°', 'walking down stairs', 'rising smoothly from a chair', 'walking on level ground'],
      breathing: 'steady paced breathing, relaxed jaw and shoulders',
      contraindications: ['running or jumping imagery', 'kneeling without clearance'],
      functionalActivities: ['shopping', 'walking in nature', 'social outings', 'light housework'],
      motivationHooks: ['returning to favourite activities', 'spending time with family', 'independence'],
      progressionMarkers: ['imagining longer walking distances', 'uneven terrain', 'gentle squatting'],
    },
    post_knee_replacement: {
      goals: ['post-surgical confidence', 'range of motion 0–90°', 'weight bearing imagery', 'stair confidence'],
      imagery: ['smooth knee bending exercises', 'walking with a frame', 'transferring from bed to chair', 'stair practice'],
      breathing: 'slow relaxed breathing, no breath-holding',
      contraindications: ['twisting', 'high-impact activities', 'deep squatting beyond clearance'],
      functionalActivities: ['physiotherapy exercises', 'walking short distances', 'dressing the lower limb'],
      motivationHooks: ['the new joint working better', 'being active again', 'reduced long-term pain'],
      progressionMarkers: ['imagining walking without aid', 'getting in and out of a car', 'gentle cycling'],
    },
    hip_arthritis: {
      goals: ['hip mobility confidence', 'gait symmetry', 'weight transfer rehearsal'],
      imagery: ['smooth hip flexion', 'symmetrical walking', 'stepping up onto a kerb', 'getting in/out of car'],
      breathing: 'diaphragmatic, relaxed pelvic floor',
      contraindications: ['hip rotation beyond comfort range', 'high impact'],
      functionalActivities: ['walking in the garden', 'shopping', 'attending social events'],
      motivationHooks: ['pain-free walking', 'maintaining independence', 'enjoying outdoor activities'],
      progressionMarkers: ['imagining longer walks', 'stairs', 'gentle dancing'],
    },
  },
  respiratory: {
    copd: {
      goals: ['dyspnoea anxiety reduction', 'activity tolerance', 'breathing efficiency', 'paced movement confidence'],
      imagery: ['walking at a gentle pace with coordinated breathing', 'open clear airways', 'calm pursed-lip exhalation'],
      breathing: 'pursed-lip breathing: inhale 2 counts, exhale 4+ counts through pursed lips',
      contraindications: ['vigorous activity imagery', 'breath-holding', 'cold environment imagery'],
      functionalActivities: ['gentle walking', 'light housework', 'socialising', 'cooking'],
      motivationHooks: ['breathing more easily', 'doing more with less breathlessness', 'enjoying outings'],
      progressionMarkers: ['slightly longer walks in imagery', 'managing inclines', 'pacing through household tasks'],
    },
  },
  mental_health: {
    anxiety: {
      goals: ['parasympathetic activation', 'grounding and safety', 'relaxation response', 'coping confidence'],
      imagery: ['a peaceful safe place', 'breathing in calm and breathing out tension', 'gentle nature scene'],
      breathing: 'box breathing: 4 in, 4 hold, 4 out, 4 hold — or 4-7-8',
      contraindications: ['imagery of feared situations without specific exposure therapy context'],
      functionalActivities: ['returning to avoided situations', 'social participation', 'daily routines'],
      motivationHooks: ['feeling calmer', 'reclaiming daily life', 'managing worries'],
      progressionMarkers: ['longer periods of calm', 'approaching previously avoided imagery', 'reduced physical tension'],
    },
    insomnia: {
      goals: ['sleep onset preparation', 'arousal reduction', 'body heaviness and warmth', 'cognitive quieting'],
      imagery: ['warm heavy limbs', 'drifting gently on calm water', 'progressive body release from feet to head'],
      breathing: '4-7-8 breathing or slow nasal breathing with extended exhale',
      contraindications: ['stimulating or exciting imagery', 'problem-solving imagery'],
      functionalActivities: ['establishing sleep routine', 'waking rested', 'daytime energy'],
      motivationHooks: ['sleeping through the night', 'waking refreshed', 'better energy and mood'],
      progressionMarkers: ['falling asleep faster in imagery', 'staying relaxed through the night'],
    },
  },
  general: {
    healthy_ageing: {
      goals: ['maintain functional mobility', 'balance confidence', 'strength imagery', 'active lifestyle motivation'],
      imagery: ['brisk walking in the park', 'balance on one leg', 'reaching overhead', 'gardening'],
      breathing: 'diaphragmatic, natural and relaxed',
      contraindications: ['none for healthy individuals — adapt to personal limits'],
      functionalActivities: ['walking', 'gardening', 'sport', 'social activities', 'travel'],
      motivationHooks: ['staying active as you age', 'independence', 'enjoying life fully'],
      progressionMarkers: ['more complex movements', 'dual-task imagery', 'new activities'],
    },
    sedentary_lifestyle: {
      goals: ['increase physical activity motivation', 'overcome inertia', 'build exercise confidence'],
      imagery: ['going for a walk', 'enjoying gentle exercise', 'feeling energised after movement'],
      breathing: 'natural relaxed breathing',
      contraindications: ['high-intensity imagery without cardiovascular clearance'],
      functionalActivities: ['daily walks', 'taking the stairs', 'standing breaks', 'gentle stretching'],
      motivationHooks: ['more energy', 'better mood', 'improved health', 'enjoying movement'],
      progressionMarkers: ['longer walks', 'light exercise', 'joining an activity class'],
    },
  },
};

export function lookupConditionKnowledge(condition: string): ConditionKnowledge | null {
  const key = condition
    .toLowerCase()
    .replace(/[''']/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  for (const [, category] of Object.entries(KNOWLEDGE_GRAPH)) {
    // Exact match
    if (category[key]) return category[key];

    // Fuzzy match — first word of condition against first word of key
    for (const [k, v] of Object.entries(category)) {
      const keyRoot = key.split('_')[0];
      const kRoot = k.split('_')[0];
      if (keyRoot && kRoot && (key.includes(kRoot) || k.includes(keyRoot))) {
        return v;
      }
    }
  }
  return null;
}

export { KNOWLEDGE_GRAPH };
export type { ConditionKnowledge };
