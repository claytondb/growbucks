'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Zap,
  ChevronRight,
  ChevronLeft,
  Star,
  CheckCircle2,
  XCircle,
  GraduationCap,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import {
  getLessonById,
  calculateQuizScore,
  type Lesson,
  type LessonProgress,
  type AgeGroup,
} from '@/lib/lessons';

const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  young: 'Ages 5–8',
  middle: 'Ages 9–12',
  teen: 'Ages 13+',
};

// ---------------------------------------------------------------------------
// LocalStorage helpers
// ---------------------------------------------------------------------------

function loadProgress(): LessonProgress[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('growbucks_lesson_progress');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProgress(progress: LessonProgress[]) {
  try {
    localStorage.setItem('growbucks_lesson_progress', JSON.stringify(progress));
  } catch {
    // ignore storage errors
  }
}

function markComplete(lessonId: string, quizScore: number) {
  const all = loadProgress();
  const existing = all.findIndex((p) => p.lessonId === lessonId);
  const entry: LessonProgress = {
    lessonId,
    completed: true,
    quizScore,
    completedAt: new Date().toISOString(),
  };
  if (existing >= 0) {
    all[existing] = entry;
  } else {
    all.push(entry);
  }
  saveProgress(all);
  return all;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type Phase = 'reading' | 'quiz' | 'done';

function ReadingPhase({
  lesson,
  onStartQuiz,
}: {
  lesson: Lesson;
  onStartQuiz: () => void;
}) {
  const [page, setPage] = useState(0);
  const total = lesson.content.length;

  return (
    <motion.div key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-6">
        {lesson.content.map((_, i) => (
          <button
            key={i}
            onClick={() => setPage(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              i === page ? 'bg-[#2ECC71] scale-125' : 'bg-[#ECF0F1]'
            }`}
          />
        ))}
      </div>

      {/* Content card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="mb-6">
            <CardContent className="pt-6 pb-8">
              <p className="text-lg text-[#2C3E50] leading-relaxed">{lesson.content[page]}</p>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        <span className="text-sm text-[#7F8C8D]">
          {page + 1} / {total}
        </span>

        {page < total - 1 ? (
          <Button onClick={() => setPage((p) => p + 1)}>
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={onStartQuiz} className="bg-[#F39C12] hover:bg-[#E67E22]">
            Take Quiz ✏️
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function QuizPhase({
  lesson,
  onComplete,
}: {
  lesson: Lesson;
  onComplete: (score: number, answers: number[]) => void;
}) {
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const question = lesson.quiz[qIndex];
  const isLast = qIndex === lesson.quiz.length - 1;

  const handleSelect = (i: number) => {
    if (revealed) return;
    setSelected(i);
  };

  const handleConfirm = () => {
    if (selected === null) return;
    setRevealed(true);
  };

  const handleNext = () => {
    const newAnswers = [...answers, selected!];
    if (isLast) {
      const score = calculateQuizScore(lesson, newAnswers);
      onComplete(score, newAnswers);
    } else {
      setAnswers(newAnswers);
      setQIndex((q) => q + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  return (
    <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* Quiz progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-[#7F8C8D]">
          Question {qIndex + 1} of {lesson.quiz.length}
        </span>
        <div className="flex gap-1">
          {lesson.quiz.map((_, i) => (
            <div
              key={i}
              className={`w-6 h-1.5 rounded-full transition-all ${
                i < qIndex
                  ? 'bg-[#2ECC71]'
                  : i === qIndex
                  ? 'bg-[#F39C12]'
                  : 'bg-[#ECF0F1]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          <p className="text-lg font-semibold text-[#2C3E50]">{question.question}</p>
        </CardContent>
      </Card>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {question.options.map((opt, i) => {
          let className =
            'w-full text-left px-4 py-3 rounded-xl border-2 transition-all font-medium ';

          if (!revealed) {
            className +=
              selected === i
                ? 'border-[#3498DB] bg-[#3498DB]/10 text-[#2C3E50]'
                : 'border-[#ECF0F1] bg-white text-[#2C3E50] hover:border-[#BDC3C7]';
          } else {
            if (opt.correct) {
              className += 'border-[#2ECC71] bg-[#2ECC71]/10 text-[#27AE60]';
            } else if (selected === i && !opt.correct) {
              className += 'border-[#E74C3C] bg-[#E74C3C]/10 text-[#C0392B]';
            } else {
              className += 'border-[#ECF0F1] bg-white text-[#BDC3C7]';
            }
          }

          return (
            <button key={i} className={className} onClick={() => handleSelect(i)}>
              <div className="flex items-center gap-3">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    !revealed
                      ? selected === i
                        ? 'bg-[#3498DB] text-white'
                        : 'bg-[#ECF0F1] text-[#7F8C8D]'
                      : opt.correct
                      ? 'bg-[#2ECC71] text-white'
                      : selected === i
                      ? 'bg-[#E74C3C] text-white'
                      : 'bg-[#ECF0F1] text-[#BDC3C7]'
                  }`}
                >
                  {revealed ? (
                    opt.correct ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : selected === i ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      String.fromCharCode(65 + i)
                    )
                  ) : (
                    String.fromCharCode(65 + i)
                  )}
                </span>
                {opt.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Explanation (after reveal) */}
      {revealed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="border-[#3498DB]/30 bg-[#3498DB]/5">
            <CardContent className="pt-4">
              <p className="text-sm text-[#2C3E50]">
                <span className="font-bold">💡 </span>
                {question.explanation}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Action button */}
      {!revealed ? (
        <Button className="w-full" onClick={handleConfirm} disabled={selected === null}>
          Check Answer
        </Button>
      ) : (
        <Button className="w-full" onClick={handleNext}>
          {isLast ? 'See Results 🎉' : 'Next Question'}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </motion.div>
  );
}

function DonePhase({
  lesson,
  score,
  xpEarned,
  onRetakeQuiz,
}: {
  lesson: Lesson;
  score: number;
  xpEarned: number;
  onRetakeQuiz: () => void;
}) {
  const isPerfect = score === 100;
  const isGood = score >= 75;

  return (
    <motion.div
      key="done"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="text-center"
    >
      <div className="text-6xl mb-4">{isPerfect ? '🌟' : isGood ? '🎉' : '💪'}</div>
      <h2 className="text-2xl font-bold text-[#2C3E50] mb-2">
        {isPerfect ? 'Perfect Score!' : isGood ? 'Great Work!' : 'Keep Practicing!'}
      </h2>
      <p className="text-[#7F8C8D] mb-6">
        You scored{' '}
        <span className="font-bold text-[#2C3E50]">{score}%</span> on the quiz.
      </p>

      {/* Score circle */}
      <div className="relative w-28 h-28 mx-auto mb-6">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#ECF0F1" strokeWidth="10" />
          <motion.circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={isPerfect ? '#F39C12' : isGood ? '#2ECC71' : '#E74C3C'}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - score / 100) }}
            transition={{ duration: 1, delay: 0.2 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-[#2C3E50]">{score}%</span>
        </div>
      </div>

      {/* XP earned */}
      <Card className="mb-4 border-[#F39C12]/30 bg-[#F39C12]/5">
        <CardContent className="pt-4 pb-4 flex items-center justify-center gap-3">
          <Zap className="w-6 h-6 text-[#F39C12]" />
          <div>
            <p className="font-bold text-[#2C3E50]">+{xpEarned} XP Earned!</p>
            <p className="text-xs text-[#7F8C8D]">Lesson complete</p>
          </div>
        </CardContent>
      </Card>

      {/* Takeaway */}
      <Card className="mb-6 bg-gradient-to-br from-[#F8FAFE] to-white">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm text-[#7F8C8D] mb-1 font-medium uppercase tracking-wide">Key Takeaway</p>
          <p className="text-[#2C3E50] font-medium">{lesson.takeaway}</p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        {score < 100 && (
          <Button variant="secondary" className="flex-1" onClick={onRetakeQuiz}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Retake Quiz
          </Button>
        )}
        <Link href="/dashboard/learn" className="flex-1">
          <Button className="w-full">
            <BookOpen className="w-4 h-4 mr-2" />
            More Lessons
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function LessonPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const lessonId = typeof params?.id === 'string' ? params.id : '';

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [phase, setPhase] = useState<Phase>('reading');
  const [quizScore, setQuizScore] = useState<number | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (lessonId) {
      const found = getLessonById(lessonId);
      if (!found) {
        router.push('/dashboard/learn');
      } else {
        setLesson(found);
      }
    }
  }, [lessonId, router]);

  const handleQuizComplete = (score: number, _answers: number[]) => {
    setQuizScore(score);
    // Always save to localStorage as the local source of truth
    markComplete(lessonId, score);
    setPhase('done');

    // Also persist to server for cross-device sync (child users only)
    const isChild = (session?.user as { isChild?: boolean })?.isChild;
    if (isChild) {
      fetch('/api/lesson-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, completed: true, quizScore: score }),
      }).catch((err) => {
        // Non-fatal — localStorage already has the record
        console.warn('Failed to sync lesson progress to server:', err);
      });
    }
  };

  const handleRetakeQuiz = () => {
    setPhase('quiz');
    setQuizScore(null);
  };

  if (status === 'loading' || !lesson) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-4 border-[#2ECC71] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back link */}
      <Link
        href="/dashboard/learn"
        className="inline-flex items-center gap-2 text-sm text-[#7F8C8D] hover:text-[#2C3E50] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Library
      </Link>

      {/* Lesson header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-[#ECF0F1] flex items-center justify-center text-3xl flex-shrink-0">
          {lesson.emoji}
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#2C3E50] leading-tight">{lesson.title}</h1>
          <p className="text-sm text-[#7F8C8D] mt-1">{lesson.summary}</p>
          <div className="flex flex-wrap gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-[#7F8C8D]">
              <Clock className="w-3 h-3" />
              {lesson.readingTimeMin} min read
            </span>
            <span className="flex items-center gap-1 text-xs text-[#F39C12]">
              <Zap className="w-3 h-3" />
              {lesson.xpReward} XP
            </span>
            <span className="flex items-center gap-1 text-xs text-[#7F8C8D]">
              <GraduationCap className="w-3 h-3" />
              {lesson.ageGroups.map((ag) => AGE_GROUP_LABELS[ag]).join(', ')}
            </span>
          </div>
        </div>
      </div>

      {/* Phase indicator tabs */}
      <div className="flex gap-1 mb-6 bg-[#ECF0F1] rounded-xl p-1">
        {(['reading', 'quiz', 'done'] as Phase[]).map((p) => (
          <div
            key={p}
            className={`flex-1 text-center py-2 rounded-lg text-sm font-medium transition-all ${
              phase === p
                ? 'bg-white text-[#2C3E50] shadow-sm'
                : 'text-[#7F8C8D]'
            }`}
          >
            {p === 'reading' ? '📖 Read' : p === 'quiz' ? '✏️ Quiz' : '🏆 Done'}
          </div>
        ))}
      </div>

      {/* Phase content */}
      <AnimatePresence mode="wait">
        {phase === 'reading' && (
          <ReadingPhase
            key="reading"
            lesson={lesson}
            onStartQuiz={() => setPhase('quiz')}
          />
        )}
        {phase === 'quiz' && (
          <QuizPhase key="quiz" lesson={lesson} onComplete={handleQuizComplete} />
        )}
        {phase === 'done' && quizScore !== null && (
          <DonePhase
            key="done"
            lesson={lesson}
            score={quizScore}
            xpEarned={lesson.xpReward}
            onRetakeQuiz={handleRetakeQuiz}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
