// Illustrative data only. Providers are fictional; no activity is tracked.
export const demoGoals = [
  { id: 'javascript', name: 'Learn JavaScript', lesson: 'Functions & scope', source: 'Example coding course', days: 12, current: 13, total: 20, unit: 'min', accent: 'amber', symbol: '{ }' },
  { id: 'spanish', name: 'Practice Spanish', lesson: 'Everyday conversations', source: 'Example language course', days: 4, current: 0, total: 1, unit: 'lesson', accent: 'purple', symbol: 'Aa' },
  { id: 'reading', name: 'Read something new', lesson: 'The art of paying attention', source: 'Example reading course', days: 7, current: 1, total: 1, unit: 'lesson', accent: 'green', symbol: '≡' },
] as const;

export type DemoGoal = (typeof demoGoals)[number];
export type PreviewState = 'sample' | 'empty' | 'loading';
