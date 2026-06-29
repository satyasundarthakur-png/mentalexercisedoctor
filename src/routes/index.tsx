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
    <div className="min-h-screen bg-[#f8f7f4] py-10 px-4">
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
              <p className="text-[10px] tracking-[4px] text-[#5c6b5c] uppercase">
                Mental Motor Imagery Therapy Engine
              </p>
              <h1 className="text-4xl sm:text-5xl font-light tracking-tight mt-3 text-[#2c3e2d] leading-tight">
                Create your personalized<br />
                <span className="text-[#0f4c3a]">5-minute session</span>
              </h1>
              <p className="text-[#5c6b5c] max-w-md mx-auto mt-4 leading-relaxed text-sm">
                Evidence-informed guided imagery, clinically reasoned by AI, designed to
                complement your rehabilitation and wellbeing journey.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {[
                  "🧠 AI-personalised",
                  "🔊 Voice narration",
                  "🫀 Body visualizer",
                  "💬 Live AI guide",
                  "🔒 Safety-first",
                ].map((chip) => (
                  <span
                    key={chip}
                    className="px-3 py-1 rounded-full bg-white border border-[#e6e3d9] text-xs text-[#5c6b5c]"
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
