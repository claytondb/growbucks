/**
 * GrowBucks Learning Library
 *
 * Age-appropriate financial lessons about saving, compound interest, and
 * building good money habits. Content is tiered by age group.
 */

// =============================================================================
// Types
// =============================================================================

export type AgeGroup = 'young' | 'middle' | 'teen';
export type LessonCategory = 'saving' | 'interest' | 'goals' | 'spending' | 'investing';
export type QuizOption = { label: string; correct: boolean };

export interface QuizQuestion {
  question: string;
  options: QuizOption[];
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  emoji: string;
  category: LessonCategory;
  ageGroups: AgeGroup[];
  /** Reading time in minutes */
  readingTimeMin: number;
  summary: string;
  content: string[];
  quiz: QuizQuestion[];
  /** XP points awarded for completing the lesson */
  xpReward: number;
  /** Key takeaway shown after lesson completion */
  takeaway: string;
}

export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  quizScore: number | null;
  completedAt: string | null;
}

// =============================================================================
// Lesson Content
// =============================================================================

export const LESSONS: Lesson[] = [
  // -------------------------------------------------------------------------
  // Saving Basics
  // -------------------------------------------------------------------------
  {
    id: 'why-save',
    title: 'Why Should I Save Money?',
    emoji: '🐷',
    category: 'saving',
    ageGroups: ['young', 'middle', 'teen'],
    readingTimeMin: 2,
    summary: 'Learn why saving money is one of the most powerful habits you can build.',
    content: [
      'Saving money means keeping some of what you earn instead of spending it all right away.',
      'When you save, your money stays safe until you really need it — like for a big purchase or an emergency.',
      'Even small amounts add up over time. Saving just a little each week can grow into something big.',
      'People who save money have more choices. They can buy things they truly want, help others, and feel less stressed about unexpected costs.',
    ],
    quiz: [
      {
        question: 'What is saving money?',
        options: [
          { label: 'Spending all your money right away', correct: false },
          { label: 'Keeping some money for later', correct: true },
          { label: 'Giving all your money away', correct: false },
          { label: 'Losing your money', correct: false },
        ],
        explanation: 'Saving means setting aside money now so you have it when you need it later.',
      },
      {
        question: 'Why is saving a good habit?',
        options: [
          { label: 'So you can never buy anything', correct: false },
          { label: 'So you always have money for important things', correct: true },
          { label: 'Because spending is bad', correct: false },
          { label: 'So your parents are happy', correct: false },
        ],
        explanation: 'Saving gives you options — you can handle emergencies, reach goals, and feel financially secure.',
      },
    ],
    xpReward: 50,
    takeaway: 'Every dollar saved today is a choice waiting for tomorrow. 🐷',
  },

  // -------------------------------------------------------------------------
  // Compound Interest
  // -------------------------------------------------------------------------
  {
    id: 'magic-of-interest',
    title: 'The Magic of Interest',
    emoji: '✨',
    category: 'interest',
    ageGroups: ['young', 'middle'],
    readingTimeMin: 3,
    summary: 'Discover how your money can grow on its own when you earn interest.',
    content: [
      'Interest is like a reward for saving. When you keep money in a savings account, you earn a little extra money just for leaving it there.',
      'Imagine you have $10 and you earn 10% interest. That means you get $1 extra — now you have $11!',
      'Next time, you earn interest on $11 instead of $10. That tiny bit extra is called compound interest.',
      'Compound interest is powerful because your interest earns interest too. Over time, this makes your money grow faster and faster.',
    ],
    quiz: [
      {
        question: 'What is interest?',
        options: [
          { label: 'A fee you pay for spending money', correct: false },
          { label: 'Extra money you earn for saving', correct: true },
          { label: 'Money you borrow from a friend', correct: false },
          { label: 'A type of coin', correct: false },
        ],
        explanation: 'Interest is a reward for keeping your money saved. The bank pays you for letting them use it.',
      },
      {
        question: 'If you have $100 and earn 10% interest, how much do you have?',
        options: [
          { label: '$90', correct: false },
          { label: '$100', correct: false },
          { label: '$110', correct: true },
          { label: '$200', correct: false },
        ],
        explanation: '10% of $100 is $10. So $100 + $10 = $110. Your money grew just by being saved!',
      },
    ],
    xpReward: 75,
    takeaway: 'Interest makes your money work for you while you sleep. ✨',
  },

  {
    id: 'compound-interest-deep',
    title: 'Compound Interest: Money Growing Money',
    emoji: '📈',
    category: 'interest',
    ageGroups: ['middle', 'teen'],
    readingTimeMin: 4,
    summary: 'Go deeper on compound interest and see why starting early matters so much.',
    content: [
      'Simple interest pays you the same amount every period based on your starting balance.',
      'Compound interest is different — each time you earn interest, that interest gets added to your balance. Then you earn interest on the new, higher balance.',
      'This "snowball effect" is why time is so valuable. The longer your money compounds, the faster it grows.',
      'Example: $100 at 10% daily interest for 30 days → after day 1 you have $110, after day 2 you have $121, after a month you have about $1,745!',
      'Starting even 5 years earlier can double the final amount. The best time to start saving is right now.',
    ],
    quiz: [
      {
        question: 'What is the key difference between simple and compound interest?',
        options: [
          { label: 'Compound interest is always lower', correct: false },
          { label: 'Compound interest earns interest on interest already earned', correct: true },
          { label: 'Simple interest changes each period', correct: false },
          { label: 'There is no difference', correct: false },
        ],
        explanation: 'In compound interest, each interest payment becomes part of your balance, so you earn interest on a growing amount.',
      },
      {
        question: 'Why does starting to save early matter so much with compound interest?',
        options: [
          { label: "It doesn't — starting later is just as good", correct: false },
          { label: 'More time means more compounding cycles, resulting in much more growth', correct: true },
          { label: 'Early savers get special bonus rates', correct: false },
          { label: 'Banks reward young savers with gifts', correct: false },
        ],
        explanation: 'Each compounding period builds on the last. More time = more cycles = exponentially more growth.',
      },
      {
        question: 'If you earn 10% interest daily and start with $100, what do you have after 2 days?',
        options: [
          { label: '$120', correct: false },
          { label: '$121', correct: true },
          { label: '$110', correct: false },
          { label: '$200', correct: false },
        ],
        explanation: 'Day 1: $100 × 1.10 = $110. Day 2: $110 × 1.10 = $121. The extra $1 comes from earning interest on interest.',
      },
    ],
    xpReward: 100,
    takeaway: 'Time is your most powerful savings tool. Start now, thank yourself later. 📈',
  },

  // -------------------------------------------------------------------------
  // Goals
  // -------------------------------------------------------------------------
  {
    id: 'setting-goals',
    title: 'Setting Savings Goals',
    emoji: '🎯',
    category: 'goals',
    ageGroups: ['young', 'middle', 'teen'],
    readingTimeMin: 3,
    summary: 'Learn how to set clear goals that make saving feel exciting instead of boring.',
    content: [
      'A savings goal is something specific you want to save up for — like a video game, a bike, or a trip.',
      'Good goals are clear. Instead of "I want to save money," say "I want to save $50 for new headphones by July."',
      'Break big goals into smaller steps. If you need $50, that might be $5 per week for 10 weeks.',
      'Tracking your progress makes saving more fun. Each week you get closer is a small win to celebrate!',
      'Having a goal keeps you motivated when you feel like spending. You can ask yourself: "Is this worth delaying my goal?"',
    ],
    quiz: [
      {
        question: 'Which is a BETTER savings goal?',
        options: [
          { label: 'Save some money someday', correct: false },
          { label: 'Save $30 for a book by the end of the month', correct: true },
          { label: 'Try not to spend too much', correct: false },
          { label: 'Save money when I feel like it', correct: false },
        ],
        explanation: 'Specific goals with a target amount and deadline are much easier to achieve than vague intentions.',
      },
      {
        question: 'If your goal is $60 and you save $10 per week, how many weeks will it take?',
        options: [
          { label: '4 weeks', correct: false },
          { label: '6 weeks', correct: true },
          { label: '10 weeks', correct: false },
          { label: '12 weeks', correct: false },
        ],
        explanation: '$60 ÷ $10 per week = 6 weeks. Breaking goals into weekly steps makes them manageable.',
      },
    ],
    xpReward: 75,
    takeaway: 'A goal without a plan is just a wish. Make it specific and track your progress! 🎯',
  },

  // -------------------------------------------------------------------------
  // Spending
  // -------------------------------------------------------------------------
  {
    id: 'needs-vs-wants',
    title: 'Needs vs. Wants',
    emoji: '🛒',
    category: 'spending',
    ageGroups: ['young', 'middle'],
    readingTimeMin: 2,
    summary: 'Understand the difference between things you need and things you want.',
    content: [
      'A need is something you must have to be safe and healthy, like food, clothing, or shelter.',
      'A want is something you would enjoy having, but you can live without it — like a new toy or a video game.',
      'Both needs and wants are okay! But when money is limited, needs come first.',
      'Smart spenders think before buying: "Do I need this, or do I just want it?"',
      'Asking that question helps you save money for the things that matter most to you.',
    ],
    quiz: [
      {
        question: 'Which of these is a NEED?',
        options: [
          { label: 'A new video game', correct: false },
          { label: 'Movie tickets', correct: false },
          { label: 'Lunch at school', correct: true },
          { label: 'A new hat', correct: false },
        ],
        explanation: 'Food is a need — you must eat to be healthy. Video games, movies, and optional clothing are wants.',
      },
      {
        question: 'Why is it helpful to know the difference between needs and wants?',
        options: [
          { label: 'So you never buy anything fun', correct: false },
          { label: 'So you spend wisely and save for what matters most', correct: true },
          { label: 'So you always buy needs instead of wants', correct: false },
          { label: 'There is no reason — it does not matter', correct: false },
        ],
        explanation: 'Knowing the difference helps you prioritize spending and keep more money for your goals.',
      },
    ],
    xpReward: 50,
    takeaway: 'Needs first, wants second — that\'s the spending superpower. 🛒',
  },

  // -------------------------------------------------------------------------
  // Investing (Teen)
  // -------------------------------------------------------------------------
  {
    id: 'intro-to-investing',
    title: 'What Is Investing?',
    emoji: '🌱',
    category: 'investing',
    ageGroups: ['teen'],
    readingTimeMin: 5,
    summary: 'Learn what investing means and why it\'s different from saving.',
    content: [
      'Saving keeps your money safe but often grows slowly. Investing means putting money to work in ways that could grow much faster.',
      'When you invest in a company by buying its stock, you own a tiny piece of that company. If the company grows, so does your investment.',
      'Investing comes with risk — values can go down as well as up. That\'s why patience is key.',
      'Historically, stock markets have grown significantly over long periods. Someone who invested in an index fund 30 years ago has likely multiplied their money many times.',
      'The earlier you start investing, compound growth does the heavy lifting. Even small monthly amounts over decades can become life-changing wealth.',
      'Starting with savings first is essential — investing works best when you have a financial cushion and won\'t need the money soon.',
    ],
    quiz: [
      {
        question: 'What is the main difference between saving and investing?',
        options: [
          { label: 'Saving is riskier than investing', correct: false },
          { label: 'Investing involves risk but offers potential for higher growth', correct: true },
          { label: 'They are exactly the same thing', correct: false },
          { label: 'Investing means spending money on fun things', correct: false },
        ],
        explanation: 'Saving is safe but slow-growing. Investing can grow much faster but values can also fall — it requires patience.',
      },
      {
        question: 'Why do experts recommend starting to invest early?',
        options: [
          { label: 'Young people get better rates', correct: false },
          { label: 'Compound growth over many decades can turn small amounts into large sums', correct: true },
          { label: 'Investments only work for teenagers', correct: false },
          { label: 'Starting early is not actually important', correct: false },
        ],
        explanation: 'Time is the biggest factor in investing. Compound growth over 30-40 years is dramatically more powerful than over 10-20 years.',
      },
      {
        question: 'What should you have BEFORE you start investing?',
        options: [
          { label: 'A lot of debt', correct: false },
          { label: 'A basic savings cushion so you won\'t need the invested money soon', correct: true },
          { label: 'Zero savings', correct: false },
          { label: 'An expensive car', correct: false },
        ],
        explanation: 'Investing works best with a long time horizon. If you might need the money soon, keep it in savings instead.',
      },
    ],
    xpReward: 125,
    takeaway: 'Investing = making your money work for you. Time + consistency = wealth. 🌱',
  },
];

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get lessons filtered by age group.
 */
export function getLessonsByAgeGroup(ageGroup: AgeGroup): Lesson[] {
  return LESSONS.filter((l) => l.ageGroups.includes(ageGroup));
}

/**
 * Get lessons filtered by category.
 */
export function getLessonsByCategory(category: LessonCategory): Lesson[] {
  return LESSONS.filter((l) => l.category === category);
}

/**
 * Get a single lesson by ID.
 */
export function getLessonById(id: string): Lesson | null {
  return LESSONS.find((l) => l.id === id) ?? null;
}

/**
 * Determine the appropriate age group from a child's age.
 * - young: 5–8
 * - middle: 9–12
 * - teen: 13+
 */
export function getAgeGroup(age: number): AgeGroup {
  if (age <= 8) return 'young';
  if (age <= 12) return 'middle';
  return 'teen';
}

/**
 * Calculate a quiz score (percentage of correct answers, 0–100).
 * `answers` is an array of selected option indices for each question.
 */
export function calculateQuizScore(
  lesson: Lesson,
  answers: number[]
): number {
  if (lesson.quiz.length === 0) return 100;
  let correct = 0;
  lesson.quiz.forEach((question, qi) => {
    const selectedIndex = answers[qi] ?? -1;
    if (selectedIndex >= 0 && question.options[selectedIndex]?.correct) {
      correct++;
    }
  });
  return Math.round((correct / lesson.quiz.length) * 100);
}

/**
 * Returns the total XP available from all lessons for a given age group.
 */
export function totalXpForAgeGroup(ageGroup: AgeGroup): number {
  return getLessonsByAgeGroup(ageGroup).reduce((sum, l) => sum + l.xpReward, 0);
}

/**
 * Returns the total XP earned from completed lessons.
 */
export function earnedXp(
  lessons: Lesson[],
  progress: LessonProgress[]
): number {
  const completedIds = new Set(
    progress.filter((p) => p.completed).map((p) => p.lessonId)
  );
  return lessons
    .filter((l) => completedIds.has(l.id))
    .reduce((sum, l) => sum + l.xpReward, 0);
}

/**
 * Returns lessons that have not yet been completed.
 */
export function getNextLessons(
  lessons: Lesson[],
  progress: LessonProgress[],
  limit = 3
): Lesson[] {
  const completedIds = new Set(
    progress.filter((p) => p.completed).map((p) => p.lessonId)
  );
  return lessons.filter((l) => !completedIds.has(l.id)).slice(0, limit);
}
