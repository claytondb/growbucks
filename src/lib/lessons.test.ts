/**
 * Tests for the GrowBucks Learning Library (lessons.ts)
 */
import { describe, it, expect } from 'vitest';
import {
  LESSONS,
  getLessonsByAgeGroup,
  getLessonsByCategory,
  getLessonById,
  getAgeGroup,
  calculateQuizScore,
  totalXpForAgeGroup,
  earnedXp,
  getNextLessons,
  type AgeGroup,
  type LessonProgress,
} from './lessons';

// =============================================================================
// LESSONS data integrity
// =============================================================================

describe('LESSONS data integrity', () => {
  it('should have at least 5 lessons', () => {
    expect(LESSONS.length).toBeGreaterThanOrEqual(5);
  });

  it('each lesson should have a unique id', () => {
    const ids = LESSONS.map((l) => l.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('each lesson should have at least one quiz question', () => {
    for (const lesson of LESSONS) {
      expect(lesson.quiz.length).toBeGreaterThan(0);
    }
  });

  it('each quiz question should have exactly one correct answer', () => {
    for (const lesson of LESSONS) {
      for (const question of lesson.quiz) {
        const correctCount = question.options.filter((o) => o.correct).length;
        expect(correctCount).toBe(1);
      }
    }
  });

  it('each lesson should have at least 2 quiz options per question', () => {
    for (const lesson of LESSONS) {
      for (const question of lesson.quiz) {
        expect(question.options.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('each lesson should have a positive xpReward', () => {
    for (const lesson of LESSONS) {
      expect(lesson.xpReward).toBeGreaterThan(0);
    }
  });

  it('each lesson should have at least one ageGroup', () => {
    for (const lesson of LESSONS) {
      expect(lesson.ageGroups.length).toBeGreaterThan(0);
    }
  });

  it('each lesson should have content', () => {
    for (const lesson of LESSONS) {
      expect(lesson.content.length).toBeGreaterThan(0);
    }
  });

  it('each lesson should have a non-empty summary', () => {
    for (const lesson of LESSONS) {
      expect(lesson.summary.length).toBeGreaterThan(0);
    }
  });

  it('each lesson should have a non-empty takeaway', () => {
    for (const lesson of LESSONS) {
      expect(lesson.takeaway.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// getLessonsByAgeGroup
// =============================================================================

describe('getLessonsByAgeGroup', () => {
  it('should return only lessons for young age group', () => {
    const lessons = getLessonsByAgeGroup('young');
    for (const lesson of lessons) {
      expect(lesson.ageGroups).toContain('young');
    }
  });

  it('should return only lessons for middle age group', () => {
    const lessons = getLessonsByAgeGroup('middle');
    for (const lesson of lessons) {
      expect(lesson.ageGroups).toContain('middle');
    }
  });

  it('should return only lessons for teen age group', () => {
    const lessons = getLessonsByAgeGroup('teen');
    for (const lesson of lessons) {
      expect(lesson.ageGroups).toContain('teen');
    }
  });

  it('should return at least 2 lessons for each age group', () => {
    const ageGroups: AgeGroup[] = ['young', 'middle', 'teen'];
    for (const group of ageGroups) {
      expect(getLessonsByAgeGroup(group).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('young group lessons should include basic categories', () => {
    const lessons = getLessonsByAgeGroup('young');
    const categories = lessons.map((l) => l.category);
    expect(categories).toContain('saving');
  });

  it('teen group should include investing lesson', () => {
    const lessons = getLessonsByAgeGroup('teen');
    const ids = lessons.map((l) => l.id);
    expect(ids).toContain('intro-to-investing');
  });
});

// =============================================================================
// getLessonsByCategory
// =============================================================================

describe('getLessonsByCategory', () => {
  it('should return only lessons for saving category', () => {
    const lessons = getLessonsByCategory('saving');
    for (const lesson of lessons) {
      expect(lesson.category).toBe('saving');
    }
  });

  it('should return only lessons for interest category', () => {
    const lessons = getLessonsByCategory('interest');
    for (const lesson of lessons) {
      expect(lesson.category).toBe('interest');
    }
  });

  it('should return at least one lesson for saving', () => {
    expect(getLessonsByCategory('saving').length).toBeGreaterThanOrEqual(1);
  });

  it('should return at least two lessons for interest', () => {
    expect(getLessonsByCategory('interest').length).toBeGreaterThanOrEqual(2);
  });

  it('should return empty array for unknown category', () => {
    // TypeScript won't allow unknown values directly, so cast for test
    const lessons = getLessonsByCategory('unknown' as never);
    expect(lessons).toEqual([]);
  });
});

// =============================================================================
// getLessonById
// =============================================================================

describe('getLessonById', () => {
  it('should return the correct lesson for a known id', () => {
    const lesson = getLessonById('why-save');
    expect(lesson).not.toBeNull();
    expect(lesson?.id).toBe('why-save');
    expect(lesson?.category).toBe('saving');
  });

  it('should return null for an unknown id', () => {
    expect(getLessonById('not-a-real-lesson')).toBeNull();
  });

  it('should return compound interest deep lesson', () => {
    const lesson = getLessonById('compound-interest-deep');
    expect(lesson).not.toBeNull();
    expect(lesson?.ageGroups).toContain('teen');
  });

  it('should return all LESSONS by id', () => {
    for (const lesson of LESSONS) {
      expect(getLessonById(lesson.id)).not.toBeNull();
    }
  });
});

// =============================================================================
// getAgeGroup
// =============================================================================

describe('getAgeGroup', () => {
  it('returns young for age 5', () => expect(getAgeGroup(5)).toBe('young'));
  it('returns young for age 7', () => expect(getAgeGroup(7)).toBe('young'));
  it('returns young for age 8', () => expect(getAgeGroup(8)).toBe('young'));
  it('returns middle for age 9', () => expect(getAgeGroup(9)).toBe('middle'));
  it('returns middle for age 10', () => expect(getAgeGroup(10)).toBe('middle'));
  it('returns middle for age 12', () => expect(getAgeGroup(12)).toBe('middle'));
  it('returns teen for age 13', () => expect(getAgeGroup(13)).toBe('teen'));
  it('returns teen for age 16', () => expect(getAgeGroup(16)).toBe('teen'));
  it('returns teen for age 18', () => expect(getAgeGroup(18)).toBe('teen'));
  it('returns young for very young child (age 3)', () => expect(getAgeGroup(3)).toBe('young'));
});

// =============================================================================
// calculateQuizScore
// =============================================================================

describe('calculateQuizScore', () => {
  const lesson = getLessonById('magic-of-interest')!;

  it('should return 100 when all answers are correct', () => {
    // Both correct answers are at index 1
    const answers = lesson.quiz.map((q) =>
      q.options.findIndex((o) => o.correct)
    );
    expect(calculateQuizScore(lesson, answers)).toBe(100);
  });

  it('should return 0 when all answers are wrong', () => {
    // Pick wrong answers (index 0, which is not correct for either question)
    const answers = lesson.quiz.map(() => 0);
    expect(calculateQuizScore(lesson, answers)).toBe(0);
  });

  it('should return 50 for half correct (2 questions)', () => {
    const correctIdx = lesson.quiz[0].options.findIndex((o) => o.correct);
    const wrongIdx = lesson.quiz[1].options.findIndex((o) => !o.correct);
    expect(calculateQuizScore(lesson, [correctIdx, wrongIdx])).toBe(50);
  });

  it('should handle empty answers gracefully', () => {
    const score = calculateQuizScore(lesson, []);
    expect(score).toBe(0);
  });

  it('should return 100 for a lesson with no quiz questions', () => {
    const emptyLesson = { ...LESSONS[0], quiz: [] };
    expect(calculateQuizScore(emptyLesson, [])).toBe(100);
  });

  it('should handle 3-question quiz correctly', () => {
    const deepLesson = getLessonById('compound-interest-deep')!;
    expect(deepLesson.quiz.length).toBe(3);
    const allCorrect = deepLesson.quiz.map((q) =>
      q.options.findIndex((o) => o.correct)
    );
    expect(calculateQuizScore(deepLesson, allCorrect)).toBe(100);
  });
});

// =============================================================================
// totalXpForAgeGroup
// =============================================================================

describe('totalXpForAgeGroup', () => {
  it('should return a positive total for each age group', () => {
    const groups: AgeGroup[] = ['young', 'middle', 'teen'];
    for (const group of groups) {
      expect(totalXpForAgeGroup(group)).toBeGreaterThan(0);
    }
  });

  it('teen group should have more total XP than young group (has more lessons)', () => {
    // teen has all middle/young lessons PLUS investing
    expect(totalXpForAgeGroup('teen')).toBeGreaterThan(totalXpForAgeGroup('young'));
  });

  it('total XP equals sum of xpReward for that age group', () => {
    for (const group of ['young', 'middle', 'teen'] as AgeGroup[]) {
      const expected = getLessonsByAgeGroup(group).reduce(
        (sum, l) => sum + l.xpReward,
        0
      );
      expect(totalXpForAgeGroup(group)).toBe(expected);
    }
  });
});

// =============================================================================
// earnedXp
// =============================================================================

describe('earnedXp', () => {
  const lessons = getLessonsByAgeGroup('young');

  it('should return 0 when no lessons are completed', () => {
    const progress: LessonProgress[] = lessons.map((l) => ({
      lessonId: l.id,
      completed: false,
      quizScore: null,
      completedAt: null,
    }));
    expect(earnedXp(lessons, progress)).toBe(0);
  });

  it('should return full total when all lessons are completed', () => {
    const progress: LessonProgress[] = lessons.map((l) => ({
      lessonId: l.id,
      completed: true,
      quizScore: 100,
      completedAt: new Date().toISOString(),
    }));
    const expected = lessons.reduce((sum, l) => sum + l.xpReward, 0);
    expect(earnedXp(lessons, progress)).toBe(expected);
  });

  it('should return XP for only completed lessons', () => {
    if (lessons.length < 2) return;
    const progress: LessonProgress[] = lessons.map((l, i) => ({
      lessonId: l.id,
      completed: i === 0, // only first completed
      quizScore: i === 0 ? 100 : null,
      completedAt: i === 0 ? new Date().toISOString() : null,
    }));
    expect(earnedXp(lessons, progress)).toBe(lessons[0].xpReward);
  });

  it('should handle empty progress array', () => {
    expect(earnedXp(lessons, [])).toBe(0);
  });

  it('should handle empty lessons array', () => {
    const progress: LessonProgress[] = [
      { lessonId: 'why-save', completed: true, quizScore: 100, completedAt: new Date().toISOString() },
    ];
    expect(earnedXp([], progress)).toBe(0);
  });
});

// =============================================================================
// getNextLessons
// =============================================================================

describe('getNextLessons', () => {
  const lessons = getLessonsByAgeGroup('young');

  it('should return all lessons when none are completed', () => {
    const next = getNextLessons(lessons, [], lessons.length);
    expect(next.length).toBe(lessons.length);
  });

  it('should not include completed lessons', () => {
    const completedId = lessons[0].id;
    const progress: LessonProgress[] = [
      { lessonId: completedId, completed: true, quizScore: 100, completedAt: new Date().toISOString() },
    ];
    const next = getNextLessons(lessons, progress, lessons.length);
    expect(next.map((l) => l.id)).not.toContain(completedId);
  });

  it('should respect the limit parameter', () => {
    const next = getNextLessons(lessons, [], 1);
    expect(next.length).toBe(1);
  });

  it('should return empty array when all lessons are completed', () => {
    const progress: LessonProgress[] = lessons.map((l) => ({
      lessonId: l.id,
      completed: true,
      quizScore: 100,
      completedAt: new Date().toISOString(),
    }));
    expect(getNextLessons(lessons, progress)).toEqual([]);
  });

  it('defaults to returning 3 next lessons', () => {
    const manyLessons = getLessonsByAgeGroup('teen');
    if (manyLessons.length >= 3) {
      const next = getNextLessons(manyLessons, []);
      expect(next.length).toBeLessThanOrEqual(3);
    }
  });
});
