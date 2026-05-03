/**
 * Swerve Challenge Definitions
 * Static challenge catalog — progress is tracked in useSwerveStore.
 */

export const CHALLENGES = [
  {
    id: 'safe-month',
    name: '30-Day Safe Driver',
    icon: '🛡️',
    color: '#34d399',
    target: 30,
    description: 'Complete 30 routes with SSI ≥ 70',
    reward: 'Road Guardian badge + 500 bonus pts',
    check: ({ ssi }) => ssi >= 70,
    activeMonths: null, // always available
  },
  {
    id: 'storm-warrior',
    name: 'Storm Warrior',
    icon: '⛈️',
    color: '#3b82f6',
    target: 5,
    description: 'Navigate 5 routes with SSI ≤ 55 and complete them safely',
    reward: 'Storm Chaser Elite badge + 300 pts',
    check: ({ ssi }) => ssi <= 55,
    activeMonths: null,
  },
  {
    id: 'perfect-week',
    name: 'Perfect Week',
    icon: '⭐',
    color: '#fcd34d',
    target: 7,
    description: 'Log 7 routes with SSI ≥ 85 within any 7-day window',
    reward: 'Flawless Week badge + 400 pts',
    check: ({ ssi }) => ssi >= 85,
    windowDays: 7,
    activeMonths: null,
  },
  {
    id: 'adventure-seeker',
    name: 'Adventure Seeker',
    icon: '🔥',
    color: '#f97316',
    target: 10,
    description: 'Complete 10 Adventure Mode routes',
    reward: 'Thrill Rider badge + 600 pts',
    check: ({ isAdventureMode }) => !!isAdventureMode,
    activeMonths: null,
  },
  {
    id: 'hurricane-survivor',
    name: 'Hurricane Season Survivor',
    icon: '🌀',
    color: '#a78bfa',
    target: 5,
    description: 'Complete 5 routes during hurricane season (Jun–Nov) with SSI ≤ 60',
    reward: 'Hurricane Chaser badge + 500 pts',
    check: ({ ssi }) => ssi <= 60,
    activeMonths: [5, 6, 7, 8, 9, 10], // June–November (0-indexed)
    seasonal: true,
  },
  {
    id: 'winter-warrior',
    name: 'Winter Warrior',
    icon: '❄️',
    color: '#93c5fd',
    target: 5,
    description: 'Complete 5 routes in winter conditions with SSI ≤ 50',
    reward: 'Ice Road badge + 500 pts',
    check: ({ ssi }) => ssi <= 50,
    activeMonths: [11, 0, 1], // Dec–Feb
    seasonal: true,
  },
];

/** Returns challenges currently available based on the calendar month */
export function getActiveChallenges() {
  const month = new Date().getMonth();
  return CHALLENGES.filter(
    (c) => c.activeMonths === null || c.activeMonths.includes(month)
  );
}

/** Returns true if a challenge is available in the current month */
export function isChallengeAvailable(challenge) {
  if (!challenge.activeMonths) return true;
  return challenge.activeMonths.includes(new Date().getMonth());
}
