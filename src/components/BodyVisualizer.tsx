'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BodyVisualizerProps {
  highlightedParts: string[];
  phase: string;
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

function isPartHighlighted(part: string, highlightedParts: string[]): boolean {
  const partLower = part.toLowerCase();
  return highlightedParts.some((p) => {
    const pLower = p.toLowerCase();
    return (
      pLower.includes(partLower) ||
      partLower.includes(pLower) ||
      // Handle compound terms like "affected arm/hand"
      pLower.split('/').some((segment) => segment.trim().includes(partLower)) ||
      partLower.split('/').some((segment) => segment.trim().includes(pLower.split(' ')[0]))
    );
  });
}

export default function BodyVisualizer({
  highlightedParts,
  phase,
  intensity = 'medium',
  className = '',
}: BodyVisualizerProps) {
  const isBreathing = phase.toLowerCase().includes('breath');

  const glowColor = useMemo(() => {
    if (intensity === 'high') return '#0f4c3a';
    if (intensity === 'medium') return '#2a6b5a';
    return '#4a8a7a';
  }, [intensity]);

  const glowOpacity = intensity === 'high' ? 0.72 : intensity === 'medium' ? 0.52 : 0.32;

  const hl = (part: string) => isPartHighlighted(part, highlightedParts);

  const partVariants = {
    highlighted: { opacity: 1, transition: { duration: 0.4 } },
    dim: { opacity: 0.28, transition: { duration: 0.4 } },
  };

  const glowVariants = {
    show: { opacity: glowOpacity, scale: 1, transition: { duration: 0.4 } },
    hide: { opacity: 0, scale: 0.9, transition: { duration: 0.3 } },
  };

  const labelParts = highlightedParts.length > 0 ? highlightedParts.join(', ') : 'Body awareness';

  return (
    <div className={`relative w-full max-w-[220px] mx-auto ${className}`}>
      <svg
        viewBox="0 0 200 400"
        className="w-full h-auto"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`Body diagram highlighting: ${labelParts}`}
      >
        {/* Background subtle reference outline */}
        <g opacity="0.1" stroke="#2c3e2d" strokeWidth="1.5" fill="none">
          <circle cx="100" cy="45" r="22" />
          <path d="M78 70 Q100 75 122 70 L125 160 Q100 175 75 160 Z" />
          <path d="M78 75 Q55 110 48 160" />
          <path d="M122 75 Q145 110 152 160" />
          <path d="M82 160 Q75 220 70 300" />
          <path d="M118 160 Q125 220 130 300" />
        </g>

        {/* ── HEAD ── */}
        <motion.g
          variants={partVariants}
          animate={hl('head') || hl('jaw') ? 'highlighted' : 'dim'}
        >
          <circle cx="100" cy="45" r="20" fill="#e8e4d9" stroke="#2c3e2d" strokeWidth="2" />
          <AnimatePresence>
            {hl('jaw') && (
              <motion.ellipse
                key="jaw-glow"
                cx="100" cy="56" rx="14" ry="6"
                fill={glowColor} opacity={glowOpacity}
                variants={glowVariants} initial="hide" animate="show" exit="hide"
              />
            )}
          </AnimatePresence>
        </motion.g>

        {/* ── SHOULDERS / UPPER BACK ── */}
        <motion.g
          variants={partVariants}
          animate={hl('shoulder') || hl('upper back') ? 'highlighted' : 'dim'}
        >
          <path d="M72 68 Q100 62 128 68" fill="none" stroke="#2c3e2d" strokeWidth="8" strokeLinecap="round" />
          <AnimatePresence>
            {(hl('shoulder') || hl('upper back')) && (
              <motion.path
                key="shoulder-glow"
                d="M72 68 Q100 62 128 68" fill="none"
                stroke={glowColor} strokeWidth="13" strokeLinecap="round" opacity={glowOpacity}
                variants={glowVariants} initial="hide" animate="show" exit="hide"
              />
            )}
          </AnimatePresence>
        </motion.g>

        {/* ── CHEST / HEART / AIRWAYS ── */}
        <motion.g
          variants={partVariants}
          animate={hl('chest') || hl('heart') || hl('airways') ? 'highlighted' : 'dim'}
        >
          <ellipse cx="100" cy="95" rx="18" ry="14" fill="#e8e4d9" stroke="#2c3e2d" strokeWidth="2" />
          <AnimatePresence>
            {(hl('chest') || hl('heart') || hl('airways')) && (
              <motion.ellipse
                key="chest-glow"
                cx="100" cy="95" rx="18" ry="14"
                fill={glowColor} opacity={glowOpacity * 0.6}
                variants={glowVariants} initial="hide" animate="show" exit="hide"
              />
            )}
          </AnimatePresence>
        </motion.g>

        {/* ── DIAPHRAGM / CORE / LUMBAR ── */}
        <motion.g
          variants={partVariants}
          animate={
            hl('diaphragm') || hl('core') || hl('lumbar') || hl('lower back') || hl('belly') || hl('spinal')
              ? 'highlighted'
              : 'dim'
          }
        >
          <ellipse cx="100" cy="125" rx="22" ry="16" fill="#e8e4d9" stroke="#2c3e2d" strokeWidth="2" />
          <AnimatePresence>
            {(hl('diaphragm') || hl('core') || hl('lumbar') || hl('lower back') || hl('spinal')) && (
              <motion.ellipse
                key="core-glow"
                cx="100" cy="125" rx="22" ry="16"
                fill={glowColor} opacity={glowOpacity * 0.5}
                variants={glowVariants} initial="hide" animate="show" exit="hide"
              />
            )}
          </AnimatePresence>

          {/* Breathing pulse — only during breathing phases */}
          {isBreathing && (
            <motion.ellipse
              cx="100" cy="125" rx="22" ry="16"
              fill="none" stroke={glowColor} strokeWidth="2.5" opacity={0.4}
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.65, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </motion.g>

        {/* ── HIP / PELVIS / GLUTEALS ── */}
        <motion.g
          variants={partVariants}
          animate={hl('hip') || hl('pelvis') || hl('gluteal') ? 'highlighted' : 'dim'}
        >
          <rect x="76" y="148" width="48" height="20" rx="8" fill="#e8e4d9" stroke="#2c3e2d" strokeWidth="2" />
          <AnimatePresence>
            {(hl('hip') || hl('pelvis') || hl('gluteal')) && (
              <motion.rect
                key="hip-glow"
                x="76" y="148" width="48" height="20" rx="8"
                fill={glowColor} opacity={glowOpacity * 0.6}
                variants={glowVariants} initial="hide" animate="show" exit="hide"
              />
            )}
          </AnimatePresence>
        </motion.g>

        {/* ── LEFT ARM ── */}
        <motion.g
          variants={partVariants}
          animate={hl('left arm') || hl('arm') || hl('hand') ? 'highlighted' : 'dim'}
        >
          <path d="M78 72 Q58 105 52 158" fill="none" stroke="#2c3e2d" strokeWidth="7" strokeLinecap="round" />
          <AnimatePresence>
            {(hl('left arm') || hl('arm') || hl('hand')) && (
              <motion.path
                key="larm-glow"
                d="M78 72 Q58 105 52 158" fill="none"
                stroke={glowColor} strokeWidth="11" strokeLinecap="round" opacity={glowOpacity}
                variants={glowVariants} initial="hide" animate="show" exit="hide"
              />
            )}
          </AnimatePresence>
        </motion.g>

        {/* ── RIGHT ARM / AFFECTED ARM ── */}
        <motion.g
          variants={partVariants}
          animate={hl('right arm') || hl('affected arm') || hl('arm') || hl('hand') ? 'highlighted' : 'dim'}
        >
          <path d="M122 72 Q142 105 148 158" fill="none" stroke="#2c3e2d" strokeWidth="7" strokeLinecap="round" />
          <AnimatePresence>
            {(hl('right arm') || hl('affected arm') || hl('arm')) && (
              <motion.path
                key="rarm-glow"
                d="M122 72 Q142 105 148 158" fill="none"
                stroke={glowColor} strokeWidth="11" strokeLinecap="round" opacity={glowOpacity}
                variants={glowVariants} initial="hide" animate="show" exit="hide"
              />
            )}
          </AnimatePresence>
        </motion.g>

        {/* ── LEFT LEG ── */}
        <motion.g
          variants={partVariants}
          animate={hl('left leg') || hl('leg') || hl('quadriceps') || hl('feet') ? 'highlighted' : 'dim'}
        >
          <path d="M85 168 Q78 232 75 298" fill="none" stroke="#2c3e2d" strokeWidth="8" strokeLinecap="round" />
          <AnimatePresence>
            {(hl('left leg') || hl('leg') || hl('quadriceps')) && (
              <motion.path
                key="lleg-glow"
                d="M85 168 Q78 232 75 298" fill="none"
                stroke={glowColor} strokeWidth="13" strokeLinecap="round" opacity={glowOpacity}
                variants={glowVariants} initial="hide" animate="show" exit="hide"
              />
            )}
          </AnimatePresence>
        </motion.g>

        {/* ── RIGHT LEG ── */}
        <motion.g
          variants={partVariants}
          animate={hl('right leg') || hl('leg') || hl('quadriceps') ? 'highlighted' : 'dim'}
        >
          <path d="M115 168 Q122 232 125 298" fill="none" stroke="#2c3e2d" strokeWidth="8" strokeLinecap="round" />
          <AnimatePresence>
            {(hl('right leg') || hl('leg') || hl('quadriceps')) && (
              <motion.path
                key="rleg-glow"
                d="M115 168 Q122 232 125 298" fill="none"
                stroke={glowColor} strokeWidth="13" strokeLinecap="round" opacity={glowOpacity}
                variants={glowVariants} initial="hide" animate="show" exit="hide"
              />
            )}
          </AnimatePresence>
        </motion.g>

        {/* ── KNEES ── */}
        <motion.g
          variants={partVariants}
          animate={hl('knee') ? 'highlighted' : 'dim'}
        >
          <circle cx="78" cy="238" r="7" fill="#e8e4d9" stroke="#2c3e2d" strokeWidth="2" />
          <circle cx="122" cy="238" r="7" fill="#e8e4d9" stroke="#2c3e2d" strokeWidth="2" />
          <AnimatePresence>
            {hl('knee') && (
              <>
                <motion.circle key="lknee-glow" cx="78" cy="238" r="10" fill={glowColor} opacity={glowOpacity * 0.5}
                  variants={glowVariants} initial="hide" animate="show" exit="hide" />
                <motion.circle key="rknee-glow" cx="122" cy="238" r="10" fill={glowColor} opacity={glowOpacity * 0.5}
                  variants={glowVariants} initial="hide" animate="show" exit="hide" />
              </>
            )}
          </AnimatePresence>
        </motion.g>

        {/* ── FEET / ANKLES ── */}
        <motion.g
          variants={partVariants}
          animate={hl('foot') || hl('feet') || hl('ankle') ? 'highlighted' : 'dim'}
        >
          <ellipse cx="72" cy="308" rx="9" ry="5" fill="#e8e4d9" stroke="#2c3e2d" strokeWidth="2" />
          <ellipse cx="128" cy="308" rx="9" ry="5" fill="#e8e4d9" stroke="#2c3e2d" strokeWidth="2" />
          <AnimatePresence>
            {(hl('foot') || hl('feet') || hl('ankle')) && (
              <>
                <motion.ellipse key="lfoot-glow" cx="72" cy="308" rx="12" ry="7" fill={glowColor} opacity={glowOpacity * 0.5}
                  variants={glowVariants} initial="hide" animate="show" exit="hide" />
                <motion.ellipse key="rfoot-glow" cx="128" cy="308" rx="12" ry="7" fill={glowColor} opacity={glowOpacity * 0.5}
                  variants={glowVariants} initial="hide" animate="show" exit="hide" />
              </>
            )}
          </AnimatePresence>
        </motion.g>

        {/* ── POSTURE / WHOLE BODY GLOW ── */}
        <AnimatePresence>
          {(hl('whole body') || hl('posture')) && (
            <motion.g key="whole-body-glow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ellipse cx="100" cy="180" rx="50" ry="100" fill={glowColor} opacity={0.06} />
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {/* Legend */}
      <p className="mt-2 text-center text-[10px] text-[#5c6b5c] leading-tight px-2">
        {labelParts}
      </p>
    </div>
  );
}
