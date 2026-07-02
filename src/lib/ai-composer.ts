import type { UserProfile, SessionJSON, TherapyPlan } from '@/types/session';
import { parseLanguage } from '@/types/session';
import { validateAndRepairSession } from './session-validator';
import type { ConditionKnowledge } from './knowledge-graph';
import { callGroqProxy } from './groq.functions';

const GROQ_MODEL_SESSION = 'openai/gpt-oss-120b'; // Updated Jul 2026: llama-3.3-70b-versatile deprecated
const GROQ_MODEL_CHAT = 'openai/gpt-oss-20b'; // Updated Jul 2026: llama-3.1-8b-instant deprecated
const MAX_SESSION_TOKENS = 2200; // Reduced Jul 2026: org TPM limit is 8000/min — keep well under it
const MAX_CHAT_TOKENS = 220;
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
  const { base, bilingual } = parseLanguage(language);
  if (base === 'English') return `LANGUAGE: Simple, clear ENGLISH.`;
  if (bilingual) {
    return `LANGUAGE: Bilingual — short ${base} line (in ${base}'s native script), then its English translation in parentheses, e.g. a short ${base} phrase followed by "(English translation)". Keep [pause Xs] markers in Latin script.`;
  }
  return `LANGUAGE: All text in simple, warm ${base} (native script). Keep [pause Xs] markers in Latin script.`;
}

// ─── SESSION SYSTEM PROMPT ──────────────────────────────────────
function buildSessionSystemPrompt(plan: TherapyPlan, knowledge: ConditionKnowledge | null, language: string): string {
  return `You are the AI Session Composer for a Mental Motor Imagery Therapy Engine.
Generate ONE unique 5-minute-30-second guided mental imagery session as JSON only (no markdown fences, no extra text).

${buildLanguageInstruction(language)}

PLAN: Goals: ${plan.primaryGoals.join('; ')}. Breathing: ${plan.recommendedBreathing}. Tone: ${plan.recommendedTone}. Imagery: ${plan.imageryThemes.join(', ')}. Body focus: ${plan.bodyFocus.join(', ')}. Intensity: ${plan.sessionIntensity}. Considerations: ${plan.specialConsiderations.join(' | ') || 'None'}.
${knowledge ? `Condition notes: activities ${knowledge.functionalActivities.join(', ')}; avoid ${knowledge.contraindications.join(', ') || 'none'}; motivators ${knowledge.motivationHooks.join(', ')}.` : ''}

RULES:
1. Mental rehearsal language only ("imagine", "picture yourself") — never instruct physical movement.
2. ONE flowing narrative, not disconnected sections.
3. Timeline totals exactly 330 seconds, 5–7 phases, in order: Opening/Grounding → Guided Breathing → Body Scan → Motor Imagery → Positive Visualization → Closing.
4. BE CONCISE — every sentence must be meaningful, no filler or repetition. narration_script: ~380–450 words TOTAL (not per phase), written slowly and simply so it paces out to 5:30 when spoken. Insert a [pause 3s] or [pause 5s] marker between each section so the listener has real silent space to breathe and picture the imagery — pauses carry the session's length, not extra words.
5. Keep every other field to ONE short sentence — no multi-sentence fields anywhere.

JSON SCHEMA (all fields required, keep values short):
{
  "session_title": "short, personal",
  "estimated_duration": "5 minutes 30 seconds",
  "medical_category": "string",
  "breathing_pattern": "string",
  "background_music_recommendation": "string",
  "voice_recommendation": "string",
  "difficulty_level": "Gentle | Moderate | Standard",
  "estimated_emotional_impact": "short phrase",
  "timeline": [
    { "phase": "string", "start_time": "M:SS", "end_time": "M:SS", "duration_seconds": number, "screen_text": "max 12 words", "animation_cue": "1 short sentence", "body_focus": ["body parts"] }
  ],
  "narration_script": "full narration, ~380-450 words, with [pause Xs] markers",
  "screen_text": [{ "start_time": "M:SS", "end_time": "M:SS", "text": "short phrase" }],
  "animation_cues": "1 short sentence",
  "body_focus_areas": ["primary areas"],
  "motivation_summary": "1 short sentence",
  "safety_notes": "1 short sentence"
}`;
}

// ─── REPAIR PROMPT ───────────────────────────────────────────────
function buildRepairPrompt(rawJson: string, errors: string[]): string {
  return `Fix ALL issues in this JSON and return ONLY the corrected valid JSON (no markdown, no explanation), keeping all text concise:

ERRORS:
${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

INVALID JSON:
${rawJson.slice(0, 1800)}`;
}

// ─── MAIN SESSION GENERATOR ─────────────────────────────────────
export async function generateTherapySession(
  profile: UserProfile,
  therapyPlan: TherapyPlan,
  knowledge: ConditionKnowledge | null,
  retries = 1
): Promise<SessionJSON> {
  const conditionLabel = profile.primaryCondition.startsWith('Other')
    ? sanitizeInput(profile.customConditionDetails || 'Unspecified condition — use general safe wellbeing guidance')
    : sanitizeInput(profile.primaryCondition);

  const userMessage = `Profile: Age ${profile.age}, ${profile.gender}. Condition: ${conditionLabel}. Secondary: ${(profile.secondaryConditions || []).map(sanitizeInput).join(', ') || 'None'}. Pain ${profile.painLevel}/10. Mobility ${profile.mobilityLevel}, Energy ${profile.energyLevel}, Stress ${profile.stressLevel}, Sleep ${profile.sleepQuality}. Goal: ${sanitizeInput(profile.fitnessGoal || 'General wellbeing and rehabilitation')}. Language: ${profile.language}.
${profile.primaryCondition.startsWith('Other') ? `This condition is not in the built-in knowledge base — use clinical reasoning for "${conditionLabel}", erring on the side of caution.\n` : ''}Generate the session as valid JSON only. Be concise — meaningful words only, real [pause] silence for pacing, not extra text.`;

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
        // Repair attempt with errors — truncate the resent prior output to save tokens
        rawContent = await callGroq(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
            { role: 'assistant', content: lastRawContent.slice(0, 1800) },
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
        session.voiceGender = profile.voiceGender;
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
