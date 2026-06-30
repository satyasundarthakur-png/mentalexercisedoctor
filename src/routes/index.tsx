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
    <div className="relative min-h-screen py-12 px-4 overflow-hidden bg-[#f6f8f7]">
      {/* Premium mesh gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: [
            'radial-gradient(60rem 40rem at 8% -10%, rgba(167,212,200,0.45), transparent 60%)',
            'radial-gradient(50rem 36rem at 100% 10%, rgba(199,210,254,0.45), transparent 60%)',
            'radial-gradient(55rem 38rem at 50% 110%, rgba(221,214,254,0.40), transparent 60%)',
            'radial-gradient(40rem 30rem at 80% 80%, rgba(186,230,253,0.35), transparent 65%)',
            'linear-gradient(180deg, #f7faf9 0%, #f3f6fb 100%)',
          ].join(','),
        }}
      />
      <div className="max-w-3xl mx-auto">
        <AnimatePresence>
          {!session && (
            <motion.header
              key="header"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              className="text-center mb-12"
            >
              <p className="text-[10px] tracking-[0.32em] font-medium text-[#0f4c3a]/70 uppercase">
                Mental Motor Imagery Therapy Engine
              </p>
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mt-4 text-[#0f2a23] leading-[1.05]">
                Create your personalized<br />
                <span className="bg-gradient-to-r from-[#0f4c3a] via-[#1a7a5a] to-[#3b82c4] bg-clip-text text-transparent">
                  5-minute session
                </span>
              </h1>
              <p className="text-[#4a5b56] max-w-md mx-auto mt-5 leading-relaxed text-sm">
                Evidence-informed guided imagery, clinically reasoned by AI, designed to
                complement your rehabilitation and wellbeing journey.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-7">
                {[
                  "🧠 AI-personalised",
                  "🔊 Voice narration",
                  "🫀 Body visualizer",
                  "💬 Live AI guide",
                  "🔒 Safety-first",
                ].map((chip) => (
                  <span
                    key={chip}
                    className="px-3.5 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-slate-200/80 text-xs text-[#4a5b56] shadow-[0_1px_2px_rgba(15,42,35,0.04)]"
                  >
                    {chip}
                  </span>
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
              transition={{ duration: 0.35 }}
            >
              <ProfileForm onSessionGenerated={setSession} />
            </motion.div>
          ) : (
            <motion.div
              key="player"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
            >
              <SessionPlayer session={session} onReset={handleReset} />
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="text-center mt-10 text-[11px] text-[#8a9a8a]">
          Mental Motor Imagery Therapy Engine · Built for Lovable
          <span className="mx-2">·</span>
          Mental rehearsal only — not a substitute for professional care
        </footer>
      </div>
    </div>
  );
}
