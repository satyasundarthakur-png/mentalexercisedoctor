# Mental Exercise Doctor 🧘

**AI-generated, 5-minute guided mental motor imagery therapy sessions — personalized to your condition, language, and voice.**

🔗 Live app: [mentalexercisedoctor.lovable.app](https://mentalexercisedoctor.lovable.app)

---

## What it does

Mental Exercise Doctor generates a unique, 5-minute-30-second guided mental imagery / motor-rehearsal session tailored to the user's medical profile — built for gentle rehabilitation support (post-stroke, orthopaedic, chronic pain, neurological, and general wellbeing use cases) where **mental rehearsal of movement** is used alongside, not instead of, professional care.

1. **Tell us about you** — age, gender, primary condition (choose from a curated list or describe your own via free text), secondary concerns, pain/mobility/energy/sleep/stress levels, and a personal goal.
2. **AI composes a session** — a Groq-powered LLM turns your profile into a structured JSON session: a timed narrative timeline, full narration script, on-screen text, breathing pattern, and body-focus cues, using only safe "imagine / picture yourself" language — never instructions to physically move.
3. **Guided playback** — a synced player narrates the session aloud (browser text-to-speech), animates a body visualizer, and displays a breathing guide and phase-by-phase progress.

## Key features

- 🌐 **English, Hindi, or Bilingual (Hindi + English)** sessions — narration, on-screen text, and title all generated in the chosen language
- 🗣️ **Male / Female narrator voice** selection, matched to the best available voice on the visitor's device, with a meditative pitch/rate profile as a graceful fallback when only one system voice is available
- 📝 **Custom / "Other" condition** — describe any condition not in the preset list; the AI reasons about it directly rather than requiring a hardcoded knowledge-base entry
- 📖 **On-screen narration transcript** so the session can be read along with (or instead of) audio
- 🛡️ **Built-in safety layer** — risk-level screening, contraindication checks, and a clear disclaimer that this is mental rehearsal only, not a substitute for professional care
- 🎨 A warm, animated "healing garden" visual design shared across the profile form and session player

## Tech stack

- **Frontend**: React + TanStack Start/Router, TypeScript, Tailwind CSS, Framer Motion
- **AI**: Groq (`openai/gpt-oss-120b` for session generation, `openai/gpt-oss-20b` for in-session conversational support) via a server-side proxy
- **Voice**: Browser Web Speech API (`SpeechSynthesis`) — no external TTS service required
- **Deployment**: [Lovable](https://lovable.dev)

## Project structure

```
src/
  routes/                # TanStack Start routes (index = main app shell)
  components/
    ProfileForm.tsx       # Step 1 — user profile intake form
    SessionPlayer.tsx     # Step 2 — guided session playback UI
    BodyVisualizer.tsx    # Animated body-focus visualization
  lib/
    ai-composer.ts         # Groq prompt construction + session generation
    therapy-planner.ts     # Rule-based clinical reasoning → therapy plan
    knowledge-graph.ts      # Built-in condition knowledge base
    safety-layer.ts         # Risk screening / contraindication checks
    session-validator.ts    # Validates & repairs AI-generated session JSON
    voice-engine.ts          # Browser TTS abstraction (language + gender aware)
    groq.functions.ts         # Server-side Groq API proxy
  types/
    session.ts              # Shared TypeScript types (UserProfile, SessionJSON, ...)
```

## Getting started

```bash
npm install
npm run dev       # start local dev server
npm run build     # production build
npm run lint       # lint
```

## ⚠️ Disclaimer

This app generates **mental rehearsal content only**. It is intended to complement — never replace — professional medical, rehabilitation, or mental health care. Always consult your healthcare provider before beginning any therapy programme.
