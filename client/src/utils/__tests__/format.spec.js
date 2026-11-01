import { describe, it, expect } from 'vitest'
import { accuracy, daysSince, relativeDay, firstName, formatDate } from '../format'

describe('accuracy', () => {
  it('returns the percentage of correct answers', () => {
    expect(accuracy({ attempted: 5, correct: 3 })).toBe(60)
  })

  it('returns 0 when nothing was attempted', () => {
    expect(accuracy({ attempted: 0, correct: 0 })).toBe(0)
  })

  it('rounds to the nearest whole number', () => {
    expect(accuracy({ correct: 1, attempted: 3 })).toBe(33)
  })

  it('returns 100 for a perfect session', () => {
    expect(accuracy({ correct: 5, attempted: 5 })).toBe(100)
  })

  it('returns 0 for undefined session', () => {
    expect(accuracy(undefined)).toBe(0)
  })

  it('returns 0 for null session', () => {
    expect(accuracy(null)).toBe(0)
  })
})

describe('daysSince / relativeDay', () => {
  const today = new Date('2026-10-06T10:00:00Z')

  it('counts whole days', () => {
    expect(daysSince('2026-10-01', today)).toBe(5)
  })

  it('uses friendly words for today and yesterday', () => {
    expect(relativeDay('2026-10-06', today)).toBe('Today')
    expect(relativeDay('2026-10-05', today)).toBe('Yesterday')
  })
})

describe('firstName', () => {
  it('keeps only the first name (child privacy on leaderboards)', () => {
    expect(firstName('Ethan Wong')).toBe('Ethan')
  })

  it('keeps a title with the first name', () => {
    expect(firstName('Ms Grace Wong')).toBe('Ms Grace')
  })
})

describe('formatDate', () => {
  it('returns "-" for null', () => {
    expect(formatDate(null)).toBe('-')
  })

  it('returns "-" for empty string', () => {
    expect(formatDate('')).toBe('-')
  })

  it('includes the month name in the output', () => {
    expect(formatDate('2026-01-15')).toMatch(/Jan/)
  })
})
