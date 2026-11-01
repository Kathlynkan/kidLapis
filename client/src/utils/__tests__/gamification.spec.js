import { describe, it, expect } from 'vitest'
import { earnedBadges, badgeProgress, levelFor, BADGES } from '../gamification'

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

const submittedHw = (overrides = {}) => ({
  ...verifiedHw(overrides),
  status: 'submitted',
})

describe('levelFor', () => {
  it('starts at level 1 with 0 points', () => {
    expect(levelFor(0)).toMatchObject({ level: 1, progress: 0, starsToNext: 50 })
  })

  it('reaches level 2 at 50 points', () => {
    expect(levelFor(50)).toMatchObject({ level: 2, progress: 0, starsToNext: 50 })
  })

  it('tracks progress within a level (25 of 50 = 50%)', () => {
    expect(levelFor(75)).toMatchObject({ level: 2, progress: 50, starsToNext: 25 })
  })

  it('reaches level 5 (full cake) at 200 points', () => {
    expect(levelFor(200)).toMatchObject({ level: 5, progress: 0 })
  })
})

describe('earnedBadges', () => {
  it('returns no badges for a new child', () => {
    expect(earnedBadges(child0, [])).toHaveLength(0)
  })

  it('awards first-quest after one verified homework', () => {
    const result = earnedBadges(child0, [verifiedHw()])
    expect(result.map((b) => b.id)).toContain('first-quest')
  })

  it('awards century at 100 points', () => {
    const result = earnedBadges(child100, [])
    expect(result.map((b) => b.id)).toContain('century')
  })

  it('does not award century below 100 points', () => {
    const result = earnedBadges({ points: 99 }, [])
    expect(result.map((b) => b.id)).not.toContain('century')
  })

  // streak-3
  it('awards streak-3 for 3 consecutive on-time submissions', () => {
    const hw = [
      verifiedHw({ id: 'h1', completedAt: '2026-10-01', dueDate: '2026-10-02' }),
      verifiedHw({ id: 'h2', completedAt: '2026-10-03', dueDate: '2026-10-04' }),
      verifiedHw({ id: 'h3', completedAt: '2026-10-05', dueDate: '2026-10-06' }),
    ]
    const result = earnedBadges(child0, hw)
    expect(result.map((b) => b.id)).toContain('streak-3')
  })

  it('does not award streak-3 when a late submission breaks the chain', () => {
    const hw = [
      verifiedHw({ id: 'h1', completedAt: '2026-10-01', dueDate: '2026-10-02' }),
      verifiedHw({ id: 'h2', completedAt: '2026-10-05', dueDate: '2026-10-03' }), // late
      verifiedHw({ id: 'h3', completedAt: '2026-10-06', dueDate: '2026-10-07' }),
    ]
    const result = earnedBadges(child0, hw)
    expect(result.map((b) => b.id)).not.toContain('streak-3')
  })

  it('awards streak-3 when completedAt uses a full ISO datetime on the due date', () => {
    const hw = [
      verifiedHw({ id: 'h1', completedAt: '2026-10-01T09:00:00.000Z', dueDate: '2026-10-01' }),
      verifiedHw({ id: 'h2', completedAt: '2026-10-03T11:00:00.000Z', dueDate: '2026-10-04' }),
      verifiedHw({ id: 'h3', completedAt: '2026-10-05T14:00:00.000Z', dueDate: '2026-10-06' }),
    ]
    const result = earnedBadges(child0, hw)
    expect(result.map((b) => b.id)).toContain('streak-3')
  })

  it('does not award streak-3 with only 2 on-time verified homework', () => {
    const hw = [
      verifiedHw({ id: 'h1', completedAt: '2026-10-01', dueDate: '2026-10-02' }),
      verifiedHw({ id: 'h2', completedAt: '2026-10-03', dueDate: '2026-10-04' }),
    ]
    const result = earnedBadges(child0, hw)
    expect(result.map((b) => b.id)).not.toContain('streak-3')
  })

  // bookworm (threshold now 2)
  it('awards bookworm after 2 verified English homework', () => {
    const hw = Array.from({ length: 2 }, (_, i) => verifiedHw({ id: `h${i}`, subject: 'English' }))
    const result = earnedBadges(child0, hw)
    expect(result.map((b) => b.id)).toContain('bookworm')
  })

  it('does not award bookworm with 1 verified English homework', () => {
    const result = earnedBadges(child0, [verifiedHw({ subject: 'English' })])
    expect(result.map((b) => b.id)).not.toContain('bookworm')
  })

  // rising-star: 3 quests handed in before the due date
  it('awards rising-star after 3 verified homework handed in before the due date', () => {
    const hw = Array.from({ length: 3 }, (_, i) =>
      verifiedHw({ id: `h${i}`, completedAt: '2026-10-08', dueDate: '2026-10-10' }),
    )
    expect(earnedBadges(child0, hw).map((b) => b.id)).toContain('rising-star')
  })

  it('does not award rising-star with only 2 handed in early', () => {
    const hw = Array.from({ length: 2 }, (_, i) =>
      verifiedHw({ id: `h${i}`, completedAt: '2026-10-08', dueDate: '2026-10-10' }),
    )
    expect(earnedBadges(child0, hw).map((b) => b.id)).not.toContain('rising-star')
  })

  it('does not count homework handed in on the due date or late', () => {
    const hw = [
      verifiedHw({ id: 'h1', completedAt: '2026-10-08', dueDate: '2026-10-10' }), // early
      verifiedHw({ id: 'h2', completedAt: '2026-10-10', dueDate: '2026-10-10' }), // on the day: not before
      verifiedHw({ id: 'h3', completedAt: '2026-10-12', dueDate: '2026-10-10' }), // late
    ]
    expect(earnedBadges(child0, hw).map((b) => b.id)).not.toContain('rising-star')
  })

  it('uses the day when completedAt is a full ISO datetime', () => {
    const hw = Array.from({ length: 3 }, (_, i) =>
      verifiedHw({ id: `h${i}`, completedAt: '2026-10-09T23:30:00.000Z', dueDate: '2026-10-10' }),
    )
    expect(earnedBadges(child0, hw).map((b) => b.id)).toContain('rising-star')
  })

  it('result contains only BADGE objects from the BADGES list', () => {
    const result = earnedBadges(child100, [verifiedHw()])
    const badgeIds = BADGES.map((b) => b.id)
    result.forEach((b) => expect(badgeIds).toContain(b.id))
  })
})

describe('badges unlock for submitted (not yet verified) homework', () => {
  it('awards first-quest for a submitted homework', () => {
    const result = earnedBadges(child0, [submittedHw()])
    expect(result.map((b) => b.id)).toContain('first-quest')
  })

  it('awards quest-champion for 5 submitted homework', () => {
    const hw = Array.from({ length: 5 }, (_, i) => submittedHw({ id: `h${i}` }))
    const result = earnedBadges(child0, hw)
    expect(result.map((b) => b.id)).toContain('quest-champion')
  })

  it('century counts pending points from submitted homework', () => {
    // child has 90 server-confirmed points; one submitted 10-pt quest tips them over
    const { current, target } = badgeProgress(
      { id: 'century' },
      { points: 90 },
      [submittedHw({ id: 'h1', points: 10 })],
    )
    expect(current).toBe(100)
    expect(target).toBe(100)
  })
})
