import type { UserProfile, SessionJSON, TherapyPlan } from '@/types/session';
import { validateAndRepairSession } from './session-validator';
import type { ConditionKnowledge } from './knowledge-graph';
import { callGroqProxy } from './groq.functions';

const GROQ_MODEL_SESSION = 'openai/gpt-oss-120b'; // Updated Jul 2026: llama-3.3-70b-versatile deprecated
const GROQ_MODEL_CHAT = 'openai/gpt-oss-20b'; // Updated Jul 2026: llama-3.1-8b-instant deprecated
const MAX_SESSION_TOKENS = 4500;
const MAX_CHAT_TOKENS = 300;
const REQUEST_TIMEOUT_MS = 30_000;

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ─── PROMPT INJECTION GUARD ────────────────────────────────────
function sanitizeInput(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/\{[^}]{0,200}\}/g, '') // strip potential template injections
    .replace(/ignore previous instructions?/gi, '[redacted]')
    .replace(/system prompt/gi, '[redacted]')
    .slice(0, 500); // hard length cap
}

// ─── GROQ CALL (via server proxy) ───────────────────────────────
async function callGroq(
  messages: GroqMessage[],
  model: string,
  maxTokens: number,
  jsonMode = false
): Promise<string> {
  const { content } = await callGroqProxy({
    data: { messages, model, maxTokens, jsonMode },
  });
  return content;
}

// ─── LANGUAGE INSTRUCTION ────────────────────────────────────────
function buildLanguageInstruction(language: string): string {
  switch (language) {
    case 'Hindi':
      return `LANGUAGE: Write ALL user-facing text — session_title, narration_script, screen_text, motivation_summary, safety_notes, animation_cues, voice_recommendation — entirely in HINDI using Devanagari script. Keep it warm, simple, and easy to follow when spoken aloud. [pause Xs] markers stay as-is (Latin characters, not translated).`;
    case 'Bilingual (Hindi + English)':
      return `LANGUAGE: Write ALL user-facing text bilingually — for EVERY sentence or short passage, give the Hindi (Devanagari script) version FIRST, immediately followed by its English translation in parentheses or on the next line, e.g. "गहरी सांस लें (Take a deep breath)." Do this consistently through session_title, narration_script, screen_text items, motivation_summary, and safety_notes, so a listener hears/reads both languages together. [pause Xs] markers stay as-is (Latin characters, not translated).`;
    default:
      return `LANGUAGE: Write ALL user-facing text in clear, simple ENGLISH.`;
  }
}

// ─── SESSION SYSTEM PROMPT ──────────────────────────────────────
function buildSessionSystemPrompt(plan: TherapyPlan, knowledge: ConditionKnowledge | null, language: string): string {
  return `You are the World-Class AI Session Composer for the Mental Motor Imagery Therapy Engine.
Your task is to generate a single unique, coherent, 5-minute 30-second guided mental imagery session.

OUTPUT FORMAT: Valid JSON ONLY. No markdown fences. No extra text before or after the JSON object.

${buildLanguageInstruction(language)}

THERAPY PLAN (clinical reasoning already performed — use this to shape the session):
- Primary Goals: ${plan.primaryGoals.join('; ')}
- Secondary Goals: ${plan.secondaryGoals.join('; ') || 'None'}
- Recommended Breathing: ${plan.recommendedBreathing}
- Recommended Tone: ${plan.recommendedTone}
- Key Imagery Themes: ${plan.imageryThemes.join(', ')}
- Body Focus Areas: ${plan.bodyFocus.join(', ')}
- Session Intensity: ${plan.sessionIntensity}
- Relaxation Emphasis: ${plan.relaxationEmphasis}%
- Motor Imagery Emphasis: ${plan.motorImageryEmphasis}%
- Special Considerations: ${plan.specialConsiderations.join(' | ') || 'None'}
${knowledge ? `\nCONDITION KNOWLEDGE:\n- Functional Activities: ${knowledge.functionalActivities.join(', ')}\n- Contraindications: ${knowledge.contraindications.join(', ') || 'None'}\n- Motivation Hooks: ${knowledge.motivationHooks.join(', ')}\n- Progression Markers: ${knowledge.progressionMarkers.join(', ')}` : ''}

STRICT RULES:
1. Use ONLY mental rehearsal language: "imagine", "picture yourself", "mentally rehearse", "in your mind's eye"
2. NEVER instruct physical movement or actions
3. Create ONE seamless flowing narrative — not disconnected sections
4. Timeline must total exactly 330 seconds with 5–7 phases
5. Required phases in order: Opening/Grounding → Guided Breathing → Body Scan → Motor Imagery → Positive Visualization → Closing
6. narration_script must be the FULL narration, ~650–750 words, with [pause 3s] markers between sections
7. Adapt tone, breathing, and intensity to the Therapy Plan above

JSON SCHEMA (all fields required):
{
  "session_title": "string — descriptive and personal",
  "estimated_duration": "5 minutes 30 seconds",
  "medical_category": "string",
  "breathing_pattern": "string",
  "background_music_recommendation": "string",
  "voice_recommendation": "string",
  "difficulty_level": "Gentle | Moderate | Standard",
  "estimated_emotional_impact": "string",
  "timeline": [
    {
      "phase": "string",
      "start_time": "M:SS",
      "end_time": "M:SS",
      "duration_seconds": number,
      "screen_text": "short phrase for display (max 12 words)",
      "animation_cue": "description of what body visualizer should show (1 sentence)",
      "body_focus": ["array of body parts"]
    }
  ],
  "narration_script": "FULL narration with [pause 3s] markers",
  "screen_text": [
    { "start_time": "M:SS", "end_time": "M:SS", "text": "short display phrase" }
  ],
  "animation_cues": "overall animation guidance for the session",
  "body_focus_areas": ["primary body focus areas for the whole session"],
  "motivation_summary": "1-2 sentences of personalised motivation",
  "safety_notes": "1-2 sentences of safety guidance"
}`;
}

// ─── REPAIR PROMPT ───────────────────────────────────────────────
function buildRepairPrompt(rawJson: string, errors: string[]): string {
  return `The following JSON session has validation errors. Fix ALL issues and return ONLY the corrected valid JSON:

ERRORS TO FIX:
${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

INVALID JSON:
${rawJson.slice(0, 3000)}

Return ONLY the corrected JSON object. No markdown. No explanation.`;
}

// ─── MAIN SESSION GENERATOR ─────────────────────────────────────
export async function generateTherapySession(
  profile: UserProfile,
  therapyPlan: TherapyPlan,
  knowledge: ConditionKnowledge | null,
  retries = 2
): Promise<SessionJSON> {
  const conditionLabel = profile.primaryCondition.startsWith('Other')
    ? sanitizeInput(profile.customConditionDetails || 'Unspecified condition — use general safe wellbeing guidance')
    : sanitizeInput(profile.primaryCondition);

  const userMessage = `User Profile:
- Age: ${profile.age}, Gender: ${profile.gender}
- Primary Condition: ${conditionLabel}
- Secondary Conditions: ${(profile.secondaryConditions || []).map(sanitizeInput).join(', ') || 'None'}
- Pain Level: ${profile.painLevel}/10
- Mobility: ${profile.mobilityLevel}, Energy: ${profile.energyLevel}
- Stress: ${profile.stressLevel}, Sleep Quality: ${profile.sleepQuality}
- Personal Goal: ${sanitizeInput(profile.fitnessGoal || 'General wellbeing and rehabilitation')}
- Preferred Language: ${profile.language}

${profile.primaryCondition.startsWith('Other') ? `NOTE: This is a user-specified / non-standard condition not in the built-in knowledge base. Use your own clinical reasoning to research and infer sensible functional goals, contraindications, and imagery themes for "${conditionLabel}" and design the session accordingly, erring on the side of caution and gentleness.\n\n` : ''}Generate a unique, personalized 5-minute 30-second mental imagery session as valid JSON only.`;

  const systemPrompt = buildSessionSystemPrompt(therapyPlan, knowledge, profile.language);

  let lastRawContent = '';
  let lastErrors: string[] = [];

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      let rawContent: string;

      if (attempt === 0) {
        // Primary generation
        rawContent = await callGroq(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          GROQ_MODEL_SESSION,
          MAX_SESSION_TOKENS,
          true // JSON mode
        );
      } else {
        // Repair attempt with errors
        rawContent = await callGroq(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
            { role: 'assistant', content: lastRawContent },
            { role: 'user', content: buildRepairPrompt(lastRawContent, lastErrors) },
          ],
          GROQ_MODEL_SESSION,
          MAX_SESSION_TOKENS,
          true
        );
      }

      lastRawContent = rawContent;

      // Strip any accidental markdown fences
      const cleaned = rawContent
        .replace(/^```(?:json)?\n?/m, '')
        .replace(/\n?```$/m, '')
        .trim();

      let parsed: unknown;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        lastErrors = ['JSON parse failed — model returned invalid JSON'];
        if (attempt < retries) {
          await sleep(1000 * (attempt + 1));
          continue;
        }
        throw new Error('Model returned invalid JSON after all retries.');
      }

      const { result, session } = validateAndRepairSession(parsed);

      if (result.isValid || result.repaired) {
        if (!session) throw new Error('Session is null after validation');
        session.language = profile.language;
        return session;
      }

      lastErrors = result.errors;
      console.warn(`Session validation attempt ${attempt + 1} failed:`, result.errors);

      if (attempt < retries) {
        await sleep(1200 * (attempt + 1));
      }
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`Generation attempt ${attempt + 1} threw:`, err);
      await sleep(1000 * (attempt + 1));
    }
  }

  throw new Error(`Failed to generate a valid session after ${retries + 1} attempts. Last errors: ${lastErrors.join('; ')}`);
}

// ─── CONVERSATION AI ────────────────────────────────────────────
export async function getAdaptiveResponse(
  sessionTitle: string,
  conversationHistory: { role: 'user' | 'ai'; content: string }[],
  userMessage: string
): Promise<string> {
  const system = `You are a compassionate AI therapy guide for the session: "${sanitizeInput(sessionTitle)}".
The user is currently doing a mental motor imagery therapy session.
Respond warmly, briefly, and clinically. Max 2-3 sentences (under 60 words).

Guidelines:
- Pain or discomfort → validate, offer to shift to gentler imagery, check if they want to continue
- Anxiety or nervousness → ground them with breath focus
- Tiredness or fatigue → offer relaxation-only mode
- Positive feelings → affirm and encourage
- Confusion about imagery → gently guide them back
- Safety concern → advise stopping and contacting their healthcare provider

Never suggest physical actions. Always use mental rehearsal language.`;

  const messages: GroqMessage[] = [
    { role: 'system', content: system },
    ...conversationHistory.slice(-8).map((m) => ({
      role: (m.role === 'ai' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: sanitizeInput(m.content),
    })),
    { role: 'user', content: sanitizeInput(userMessage) },
  ];

  try {
    return await callGroq(messages, GROQ_MODEL_CHAT, MAX_CHAT_TOKENS);
  } catch {
    // Fallback responses for common triggers
    const lower = userMessage.toLowerCase();
    if (lower.includes('pain') || lower.includes('hurt'))
      return "Thank you for letting me know. Let's gently shift to simple body awareness — just noticing warmth and ease, no movement imagery. Take a slow breath.";
    if (lower.includes('anxious') || lower.includes('nervous') || lower.includes('worried'))
      return "That's completely okay. Let's pause and focus only on your breath for a moment — slow in through your nose, and gently out. You are safe.";
    if (lower.includes('tired') || lower.includes('fatigue') || lower.includes('exhausted'))
      return "Rest is valuable healing too. Let's shift to gentle relaxation — just noticing heaviness and warmth in your body, no movement needed at all.";
    if (lower.includes('good') || lower.includes('great') || lower.includes('relaxed') || lower.includes('better'))
      return "Wonderful. Let's carry that sense of ease into the next part of your session — picture yourself moving with that same comfort and confidence.";
    return "Thank you for sharing. Let's continue at your own pace — you're always in control of this experience.";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
