'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Star, Clock, Zap, Trophy, ChevronRight, GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import {
  LESSONS,
  getLessonsByAgeGroup,
  getAgeGroup,
  earnedXp,
  totalXpForAgeGroup,
  type AgeGroup,
  type LessonProgress,
  type LessonCategory,
} from '@/lib/lessons';

const CATEGORY_COLORS: Record<LessonCategory, string> = {
  saving: 'bg-[#2ECC71]/10 text-[#27AE60]',
  interest: 'bg-[#3498DB]/10 text-[#2980B9]',
  goals: 'bg-[#9B59B6]/10 text-[#8E44AD]',
  spending: 'bg-[#E67E22]/10 text-[#D35400]',
  investing: 'bg-[#1ABC9C]/10 text-[#16A085]',
};

const CATEGORY_LABELS: Record<LessonCategory, string> = {
  saving: 'Saving',
  interest: 'Interest',
  goals: 'Goals',
  spending: 'Spending',
  investing: 'Investing',
};

const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  young: 'Ages 5–8',
  middle: 'Ages 9–12',
  teen: 'Ages 13+',
};

function getProgress(): LessonProgress[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('growbucks_lesson_progress');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function LearnPage() {
  const { status } = useSession();
  const router = useRouter();
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [ageFilter, setAgeFilter] = useState<AgeGroup | 'all'>('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    setProgress(getProgress());
  }, []);

  const completedIds = new Set(progress.filter((p) => p.completed).map((p) => p.lessonId));

  const displayLessons =
    ageFilter === 'all' ? LESSONS : getLessonsByAgeGroup(ageFilter);

  // XP stats
  const currentXp = earnedXp(LESSONS, progress);
  const maxXp = LESSONS.reduce((sum, l) => sum + l.xpReward, 0);
  const completedCount = completedIds.size;

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-4 border-[#2ECC71] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#2C3E50]">Learning Library</h1>
          <p className="text-[#7F8C8D]">Financial lessons for every age</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 text-center">
              <BookOpen className="w-8 h-8 text-[#3498DB] mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#2C3E50]">{completedCount}</p>
              <p className="text-sm text-[#7F8C8D]">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Zap className="w-8 h-8 text-[#F39C12] mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#2C3E50]">{currentXp}</p>
              <p className="text-sm text-[#7F8C8D]">XP Earned</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Trophy className="w-8 h-8 text-[#9B59B6] mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#2C3E50]">
                {LESSONS.length > 0 ? Math.round((completedCount / LESSONS.length) * 100) : 0}%
              </p>
              <p className="text-sm text-[#7F8C8D]">Progress</p>
            </CardContent>
          </Card>
        </div>

        {/* XP bar */}
        {maxXp > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-[#F39C12]" />
                  <span className="font-semibold text-[#2C3E50]">Total XP</span>
                </div>
                <span className="text-sm text-[#7F8C8D]">
                  {currentXp} / {maxXp} XP
                </span>
              </div>
              <div className="h-3 bg-[#ECF0F1] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentXp / maxXp) * 100}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-[#F39C12] to-[#E67E22] rounded-full"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Age group filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['all', 'young', 'middle', 'teen'] as const).map((group) => (
            <button
              key={group}
              onClick={() => setAgeFilter(group)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                ageFilter === group
                  ? 'bg-[#2ECC71] text-white'
                  : 'bg-[#ECF0F1] text-[#7F8C8D] hover:bg-[#BDC3C7]'
              }`}
            >
              {group === 'all' ? 'All Ages' : AGE_GROUP_LABELS[group]}
            </button>
          ))}
        </div>

        {/* Lesson cards */}
        <div className="space-y-4">
          {displayLessons.map((lesson, index) => {
            const isCompleted = completedIds.has(lesson.id);
            const lessonProgress = progress.find((p) => p.lessonId === lesson.id);
            const quizScore = lessonProgress?.quizScore;

            return (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/dashboard/learn/${lesson.id}`}>
                  <Card
                    className={`cursor-pointer hover:shadow-md transition-all ${
                      isCompleted ? 'border-[#2ECC71]/40 bg-[#2ECC71]/5' : ''
                    }`}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-4">
                        {/* Emoji */}
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${
                            isCompleted ? 'bg-[#2ECC71]/15' : 'bg-[#ECF0F1]'
                          }`}
                        >
                          {isCompleted ? '✅' : lesson.emoji}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-[#2C3E50] leading-tight">{lesson.title}</h3>
                            <ChevronRight className="w-5 h-5 text-[#BDC3C7] flex-shrink-0 mt-0.5" />
                          </div>

                          <p className="text-sm text-[#7F8C8D] mt-1 line-clamp-2">{lesson.summary}</p>

                          <div className="flex flex-wrap items-center gap-3 mt-3">
                            {/* Category badge */}
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                CATEGORY_COLORS[lesson.category]
                              }`}
                            >
                              {CATEGORY_LABELS[lesson.category]}
                            </span>

                            {/* Reading time */}
                            <span className="flex items-center gap-1 text-xs text-[#7F8C8D]">
                              <Clock className="w-3 h-3" />
                              {lesson.readingTimeMin} min
                            </span>

                            {/* XP */}
                            <span className="flex items-center gap-1 text-xs text-[#F39C12]">
                              <Zap className="w-3 h-3" />
                              {lesson.xpReward} XP
                            </span>

                            {/* Age groups */}
                            <span className="flex items-center gap-1 text-xs text-[#7F8C8D]">
                              <GraduationCap className="w-3 h-3" />
                              {lesson.ageGroups.map((ag) => AGE_GROUP_LABELS[ag]).join(', ')}
                            </span>

                            {/* Quiz score if completed */}
                            {isCompleted && quizScore !== null && quizScore !== undefined && (
                              <span className="flex items-center gap-1 text-xs font-medium text-[#2ECC71]">
                                <Star className="w-3 h-3" />
                                Quiz: {quizScore}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom tip */}
        <Card className="mt-6 bg-gradient-to-br from-[#F8FAFE] to-white">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-[#3498DB]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-6 h-6 text-[#3498DB]" />
              </div>
              <div>
                <p className="font-bold text-[#2C3E50] mb-1">Learning = Earning</p>
                <p className="text-sm text-[#7F8C8D]">
                  Complete lessons to earn XP! Each lesson ends with a short quiz to lock in the
                  knowledge. Age-appropriate content means every kid gets the right material. 🌱
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
