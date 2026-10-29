import { describe, it, expect } from 'vitest'
import { earnedBadges, levelFor, BADGES } from '../gamification'

const child0 = { points: 0 }
const child100 = { points: 100 }

const verifiedHw = (overrides = {}) => ({
  id: 'h_test',
  status: 'verified',
  subject: 'Math',
  dueDate: '2026-10-10',
  completedAt: '2026-10-08',
  points: 10,
  ...overrides,
})

const session = (overrides = {}) => ({
  topic: 'Fractions',
  date: '2026-10-01',
  attempted: 5,
  correct: 4,
  ...overrides,
})

describe('levelFor', () => {
  it('starts at level 1 with 0 points', () => {
    expect(levelFor(0)).toEqual({ level: 1, progress: 0 })
  })

  it('reaches level 2 at 100 points', () => {
    expect(levelFor(100)).toEqual({ level: 2, progress: 0 })
  })

  it('tracks progress within a level', () => {
    expect(levelFor(150)).toEqual({ level: 2, progress: 50 })
  })
})

describe('earnedBadges', () => {
  it('returns no badges for a new child', () => {
    expect(earnedBadges(child0, [], [])).toHaveLength(0)
  })

  it('awards first-quest after one verified homework', () => {
    const result = earnedBadges(child0, [verifiedHw()], [])
    expect(result.map((b) => b.id)).toContain('first-quest')
  })

  it('awards century at 100 points', () => {
    const result = earnedBadges(child100, [], [])
    expect(result.map((b) => b.id)).toContain('century')
  })

  it('does not award century below 100 points', () => {
    const result = earnedBadges({ points: 99 }, [], [])
    expect(result.map((b) => b.id)).not.toContain('century')
  })

  it('awards fraction-hero when 2 sessions have 80%+ on Fractions', () => {
    const result = earnedBadges(child0, [], [
      session({ correct: 4, attempted: 5 }),
      session({ date: '2026-10-03', correct: 5, attempted: 5 }),
    ])
    expect(result.map((b) => b.id)).toContain('fraction-hero')
  })

  it('does not award fraction-hero after only 1 session with 80%+ on Fractions', () => {
    const result = earnedBadges(child0, [], [
      session({ correct: 4, attempted: 5 }),
      session({ date: '2026-10-03', correct: 2, attempted: 5 }), // 40%, doesn't count
    ])
    expect(result.map((b) => b.id)).not.toContain('fraction-hero')
  })

  it('does not award fraction-hero on a non-fraction topic', () => {
    const result = earnedBadges(child0, [], [session({ topic: 'Spelling', correct: 5, attempted: 5 })])
    expect(result.map((b) => b.id)).not.toContain('fraction-hero')
  })

  // streak-3
  it('awards streak-3 for 3 consecutive on-time submissions', () => {
    const hw = [
      verifiedHw({ id: 'h1', completedAt: '2026-10-01', dueDate: '2026-10-02' }),
      verifiedHw({ id: 'h2', completedAt: '2026-10-03', dueDate: '2026-10-04' }),
      verifiedHw({ id: 'h3', completedAt: '2026-10-05', dueDate: '2026-10-06' }),
    ]
    const result = earnedBadges(child0, hw, [])
    expect(result.map((b) => b.id)).toContain('streak-3')
  })

  it('does not award streak-3 when a late submission breaks the chain', () => {
    const hw = [
      verifiedHw({ id: 'h1', completedAt: '2026-10-01', dueDate: '2026-10-02' }),
      verifiedHw({ id: 'h2', completedAt: '2026-10-05', dueDate: '2026-10-03' }), // late
      verifiedHw({ id: 'h3', completedAt: '2026-10-06', dueDate: '2026-10-07' }),
    ]
    const result = earnedBadges(child0, hw, [])
    expect(result.map((b) => b.id)).not.toContain('streak-3')
  })

  it('awards streak-3 when completedAt uses a full ISO datetime on the due date', () => {
    const hw = [
      verifiedHw({ id: 'h1', completedAt: '2026-10-01T09:00:00.000Z', dueDate: '2026-10-01' }),
      verifiedHw({ id: 'h2', completedAt: '2026-10-03T11:00:00.000Z', dueDate: '2026-10-04' }),
      verifiedHw({ id: 'h3', completedAt: '2026-10-05T14:00:00.000Z', dueDate: '2026-10-06' }),
    ]
    const result = earnedBadges(child0, hw, [])
    expect(result.map((b) => b.id)).toContain('streak-3')
  })

  it('does not award streak-3 with only 2 on-time verified homework', () => {
    const hw = [
      verifiedHw({ id: 'h1', completedAt: '2026-10-01', dueDate: '2026-10-02' }),
      verifiedHw({ id: 'h2', completedAt: '2026-10-03', dueDate: '2026-10-04' }),
    ]
    const result = earnedBadges(child0, hw, [])
    expect(result.map((b) => b.id)).not.toContain('streak-3')
  })

  // bookworm (threshold now 2)
  it('awards bookworm after 2 verified English homework', () => {
    const hw = Array.from({ length: 2 }, (_, i) => verifiedHw({ id: `h${i}`, subject: 'English' }))
    const result = earnedBadges(child0, hw, [])
    expect(result.map((b) => b.id)).toContain('bookworm')
  })

  it('does not award bookworm with 1 verified English homework', () => {
    const result = earnedBadges(child0, [verifiedHw({ subject: 'English' })], [])
    expect(result.map((b) => b.id)).not.toContain('bookworm')
  })

  // rising-star
  it('awards rising-star when a topic improves by 15+ percentage points over 3 sessions', () => {
    const sessions = [
      session({ topic: 'Fractions', date: '2026-10-01', correct: 1, attempted: 5 }), // 20%
      session({ topic: 'Fractions', date: '2026-10-03', correct: 3, attempted: 5 }), // 60%
      session({ topic: 'Fractions', date: '2026-10-05', correct: 4, attempted: 5 }), // 80%
    ]
    const result = earnedBadges(child0, [], sessions)
    expect(result.map((b) => b.id)).toContain('rising-star')
  })

  it('does not award rising-star when improvement is less than 15 percentage points', () => {
    const sessions = [
      session({ topic: 'Fractions', date: '2026-10-01', correct: 3, attempted: 5 }), // 60%
      session({ topic: 'Fractions', date: '2026-10-03', correct: 3, attempted: 5 }), // 60%
      session({ topic: 'Fractions', date: '2026-10-05', correct: 4, attempted: 6 }), // ~67% — only 7pp gain
    ]
    const result = earnedBadges(child0, [], sessions)
    expect(result.map((b) => b.id)).not.toContain('rising-star')
  })

  it('does not award rising-star with only 2 sessions on a topic', () => {
    const sessions = [
      session({ topic: 'Fractions', date: '2026-10-01', correct: 1, attempted: 5 }), // 20%
      session({ topic: 'Fractions', date: '2026-10-05', correct: 5, attempted: 5 }), // 100%
    ]
    const result = earnedBadges(child0, [], sessions)
    expect(result.map((b) => b.id)).not.toContain('rising-star')
  })

  it('does not award rising-star when the first session has zero attempts', () => {
    // 3 total sessions but only 2 have attempted > 0; the invalid one is excluded,
    // leaving fewer than the required 3 valid sessions.
    const sessions = [
      session({ topic: 'Fractions', date: '2026-10-01', correct: 0, attempted: 0 }), // invalid
      session({ topic: 'Fractions', date: '2026-10-03', correct: 3, attempted: 5 }), // 60%
      session({ topic: 'Fractions', date: '2026-10-05', correct: 4, attempted: 5 }), // 80%
    ]
    const result = earnedBadges(child0, [], sessions)
    expect(result.map((b) => b.id)).not.toContain('rising-star')
  })

  it('does not award rising-star when performance declines', () => {
    const sessions = [
      session({ topic: 'Fractions', date: '2026-10-01', correct: 4, attempted: 5 }), // 80%
      session({ topic: 'Fractions', date: '2026-10-03', correct: 3, attempted: 5 }), // 60%
      session({ topic: 'Fractions', date: '2026-10-05', correct: 1, attempted: 5 }), // 20%
    ]
    const result = earnedBadges(child0, [], sessions)
    expect(result.map((b) => b.id)).not.toContain('rising-star')
  })

  it('still awards rising-star when all 3 sessions are valid and improvement exceeds 15pp', () => {
    const sessions = [
      session({ topic: 'Fractions', date: '2026-10-01', correct: 1, attempted: 5 }), // 20%
      session({ topic: 'Fractions', date: '2026-10-03', correct: 3, attempted: 5 }), // 60%
      session({ topic: 'Fractions', date: '2026-10-05', correct: 4, attempted: 5 }), // 80%
    ]
    const result = earnedBadges(child0, [], sessions)
    expect(result.map((b) => b.id)).toContain('rising-star')
  })

  it('result contains only BADGE objects from the BADGES list', () => {
    const result = earnedBadges(child100, [verifiedHw()], [session()])
    const badgeIds = BADGES.map((b) => b.id)
    result.forEach((b) => expect(badgeIds).toContain(b.id))
  })
})
