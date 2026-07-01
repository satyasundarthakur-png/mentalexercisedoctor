import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProfileForm from "@/components/ProfileForm";
import SessionPlayer from "@/components/SessionPlayer";
import type { SessionJSON } from "@/types/session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mental Motor Imagery Therapy Engine" },
      {
        name: "description",
        content:
          "Evidence-informed AI-guided motor imagery sessions to complement rehabilitation and wellbeing.",
      },
      { property: "og:title", content: "Mental Motor Imagery Therapy Engine" },
      {
        property: "og:description",
        content:
          "Personalized 5-minute AI-guided imagery sessions for rehabilitation and wellbeing.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

function Index() {
  const [session, setSession] = useState<SessionJSON | null>(null);
  const handleReset = () => setSession(null);

  return (
    <div className="relative min-h-screen py-12 px-4 overflow-hidden text-white">
      {/* Animated aurora backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 animate-aurora-shift"
        style={{
          background:
            'linear-gradient(135deg, #0b1e3f 0%, #1a1240 30%, #3a0f52 60%, #08243d 100%)',
          backgroundSize: '260% 260%',
        }}
      />

      {/* Floating colored orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="orb orb-c" />
        <div className="orb orb-d" />
        <div className="orb orb-e" />
      </div>

      {/* Twinkle grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-40 mix-blend-screen"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.6) 0.5px, transparent 1px), radial-gradient(circle at 70% 60%, rgba(255,255,255,0.5) 0.5px, transparent 1px), radial-gradient(circle at 40% 80%, rgba(255,255,255,0.5) 0.5px, transparent 1px)',
          backgroundSize: '120px 120px, 200px 200px, 160px 160px',
          animation: 'twinkle 6s ease-in-out infinite',
        }}
      />

      <div className="max-w-3xl mx-auto relative">
        <AnimatePresence>
          {!session && (
            <motion.header
              key="header"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <motion.p
                initial={{ opacity: 0, letterSpacing: '0.1em' }}
                animate={{ opacity: 1, letterSpacing: '0.32em' }}
                transition={{ duration: 0.8 }}
                className="text-[10px] font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-200 uppercase"
              >
                Mental Motor Imagery Therapy Engine
              </motion.p>

              <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mt-4 leading-[1.05]">
                <span className="text-white/95 drop-shadow-[0_2px_20px_rgba(180,140,255,0.35)]">
                  Create your personalized
                </span>
                <br />
                <span className="inline-block bg-[linear-gradient(120deg,#7ff7ff_0%,#a78bfa_25%,#ff7ad9_50%,#ffcf6b_75%,#7ff7ff_100%)] bg-[length:300%_300%] bg-clip-text text-transparent animate-gradient-x drop-shadow-[0_2px_30px_rgba(255,140,220,0.35)]">
                  5-minute session
                </span>
              </h1>

              <p className="text-white/70 max-w-md mx-auto mt-5 leading-relaxed text-sm">
                Evidence-informed guided imagery, clinically reasoned by AI, designed to
                complement your rehabilitation and wellbeing journey.
              </p>

              <div className="flex flex-wrap justify-center gap-2 mt-7">
                {[
                  { icon: '🧠', label: 'AI-personalised', ring: 'from-cyan-400/60 to-blue-500/60' },
                  { icon: '🔊', label: 'Voice narration', ring: 'from-fuchsia-400/60 to-pink-500/60' },
                  { icon: '🫀', label: 'Body visualizer', ring: 'from-rose-400/60 to-orange-400/60' },
                  { icon: '💬', label: 'Live AI guide', ring: 'from-emerald-400/60 to-teal-500/60' },
                  { icon: '🔒', label: 'Safety-first', ring: 'from-amber-300/60 to-yellow-500/60' },
                ].map((chip, i) => (
                  <motion.span
                    key={chip.label}
                    initial={{ opacity: 0, y: 8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.2 + i * 0.08, type: 'spring', stiffness: 240, damping: 18 }}
                    whileHover={{ y: -3, scale: 1.05 }}
                    className={`relative px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs text-white/90 shadow-[0_4px_20px_-6px_rgba(0,0,0,0.4)] before:absolute before:inset-0 before:rounded-full before:p-[1px] before:bg-gradient-to-r before:${chip.ring} before:opacity-70 before:-z-10`}
                  >
                    <span className="mr-1">{chip.icon}</span>{chip.label}
                  </motion.span>
                ))}
              </div>
            </motion.header>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {!session ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="relative"
            >
              {/* Colorful glow around card */}
              <div aria-hidden className="absolute -inset-1 rounded-[2rem] bg-[conic-gradient(from_0deg,#22d3ee,#a78bfa,#f472b6,#fbbf24,#22d3ee)] opacity-50 blur-2xl animate-spin-slow" />
              <div className="relative">
                <ProfileForm onSessionGenerated={setSession} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="player"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <SessionPlayer session={session} onReset={handleReset} />
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="text-center mt-10 text-[11px] text-white/50">
          Mental Motor Imagery Therapy Engine · Built for Lovable
          <span className="mx-2">·</span>
          Mental rehearsal only — not a substitute for professional care
        </footer>
      </div>
    </div>
  );
}
