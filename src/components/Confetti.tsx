'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  size: number;
}

interface ConfettiProps {
  active: boolean;
  duration?: number;
  pieces?: number;
}

const COLORS = ['#2ECC71', '#F1C40F', '#3498DB', '#E74C3C', '#9B59B6', '#E67E22'];

export default function Confetti({ active, duration = 3000, pieces = 50 }: ConfettiProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (active) {
      const newConfetti: ConfettiPiece[] = Array.from({ length: pieces }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.5,
        rotation: Math.random() * 360,
        size: 8 + Math.random() * 8,
      }));
      setConfetti(newConfetti);

      const timer = setTimeout(() => setConfetti([]), duration);
      return () => clearTimeout(timer);
    }
  }, [active, duration, pieces]);

  return (
    <AnimatePresence>
      {confetti.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {confetti.map((piece) => (
            <motion.div
              key={piece.id}
              initial={{
                x: `${piece.x}vw`,
                y: -20,
                rotate: piece.rotation,
                opacity: 1,
              }}
              animate={{
                y: '110vh',
                rotate: piece.rotation + 720,
                opacity: [1, 1, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2 + Math.random() * 2,
                delay: piece.delay,
                ease: 'easeIn',
              }}
              className="absolute"
              style={{
                width: piece.size,
                height: piece.size,
                backgroundColor: piece.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

// Celebration overlay for goal achievements
export function CelebrationOverlay({
  show,
  onClose,
  title,
  message,
  emoji = '🎉',
}: {
  show: boolean;
  onClose: () => void;
  title: string;
  message: string;
  emoji?: string;
}) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <>
          <Confetti active={show} />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 10 }}
              transition={{ type: 'spring', damping: 15 }}
              className="bg-white rounded-3xl p-8 text-center max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="text-6xl mb-4"
              >
                {emoji}
              </motion.div>
              <h2 className="text-2xl font-bold text-[#2C3E50] mb-2">{title}</h2>
              <p className="text-[#7F8C8D] mb-6">{message}</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-[#2ECC71] text-white rounded-xl font-medium hover:bg-[#27AE60] transition-colors"
              >
                Awesome! 🌟
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
