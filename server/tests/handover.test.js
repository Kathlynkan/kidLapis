// Unit tests for the handover helpers   Owner: Yuqi
import { describe, it, expect } from 'vitest'
import {
  findRecurring,
  checkMood,
  buildFallbackHandover,
  buildWeeklyFallback,
  getWeekRange,
  getWeekOf,
  formatWeek,
  listWeeks,
  weekTitleFor,
} from '../routes/handover.js'

// fake sessions, newest first (same shape as MongoDB)
const sessions = [
  { date: '2026-10-29', subject: 'Math', topic: 'Fractions', correct: 4, attempted: 5, struggles: ['Mixed numbers'], whatWorked: 'Pizza drawings', nextStep: 'Word problems', mood: 'okay' },
  { date: '2026-10-28', subject: 'Math', topic: 'Fractions', correct: 3, attempted: 5, struggles: ['Common denominators'], whatWorked: '', nextStep: '', mood: 'tired' },
  { date: '2026-10-27', subject: 'Math', topic: 'Fractions', correct: 1, attempted: 5, struggles: ['Common denominators'], whatWorked: '', nextStep: '', mood: 'tired' },
]

describe('findRecurring', () => {
  it('finds struggles that appear 2 or more times', () => {
    expect(findRecurring(sessions)).toEqual(['Common denominators'])
  })

  it('returns an empty list when nothing repeats', () => {
    expect(findRecurring([sessions[0]])).toEqual([])
  })
})

describe('checkMood (counted in code, not by the AI)', () => {
  it('flags 2 tired sessions out of the last 3', () => {
    expect(checkMood(sessions)).toBe('Tired in 2 of the last 3 sessions. Check in at the start and keep tasks short.')
  })

  it('says when the child was low only once', () => {
    const moods = [{ mood: 'okay' }, { mood: 'happy' }, { mood: 'tired' }]
    expect(checkMood(moods)).toBe('Had one low day recently, but has been fine since.')
  })

  it('says when the child was happy', () => {
    const moods = [{ mood: 'happy' }, { mood: 'happy' }, { mood: 'happy' }]
    expect(checkMood(moods)).toBe('Happy in the last 3 sessions.')
  })
})

describe('buildFallbackHandover (volunteers)', () => {
  it('uses the newest session and the mood check', () => {
    const result = buildFallbackHandover(sessions)
    expect(result.lastResult).toBe('Got 4/5 on Fractions last session.')
    expect(result.nextStep).toBe('Word problems.')
    expect(result.recurring).toEqual(['Common denominators'])
    expect(result.source).toBe('fallback')
  })

  it('handles a child with no sessions', () => {
    const result = buildFallbackHandover([])
    expect(result.nextStep).toContain('No sessions yet')
  })
})

describe('getWeekRange (weekly summary switches on Friday)', () => {
  it('Mon - Thu shows LAST week (this week is not finished yet)', () => {
    expect(getWeekRange(new Date('2026-10-26T10:00:00'))).toEqual({ start: '2026-10-19', end: '2026-10-23' })
    expect(getWeekRange(new Date('2026-10-29T10:00:00'))).toEqual({ start: '2026-10-19', end: '2026-10-23' })
  })

  it('Fri - Sun shows THIS week', () => {
    expect(getWeekRange(new Date('2026-10-30T10:00:00'))).toEqual({ start: '2026-10-26', end: '2026-10-30' })
    expect(getWeekRange(new Date('2026-11-01T10:00:00'))).toEqual({ start: '2026-10-26', end: '2026-10-30' })
  })

  it('getWeekOf finds the Monday to Friday of any date', () => {
    expect(getWeekOf(new Date('2026-10-28T10:00:00'))).toEqual({ start: '2026-10-26', end: '2026-10-30' })
  })

  it('formatWeek writes the week for people', () => {
    expect(formatWeek({ start: '2026-10-26', end: '2026-10-30' })).toBe('Mon 26 Oct to Fri 30 Oct')
  })
})

describe('buildWeeklyFallback (parents)', () => {
  const week = [
    { date: '2026-10-30', topic: 'Reading', correct: 4, attempted: 5, mood: 'happy', socialNotes: 'Drew a comic.', whatWorked: 'Picture clues' },
    { date: '2026-10-28', topic: 'Spelling', correct: 8, attempted: 10, mood: 'tired', behaviour: 'Helped tidy up' },
  ]

  it('sums up the week for a parent, oldest first', () => {
    const result = buildWeeklyFallback(week, 'Arjun')
    expect(result.headline).toBe('Arjun had a good week overall, with a few tired or tricky moments.')
    expect(result.learning).toBe('Arjun worked on spelling (8 out of 10 right), reading (4 out of 5 right).')
    expect(result.worthKnowing).toContain('tired on Wed')
    expect(result.celebrate).toBe('Helped tidy up.')
    expect(result.atHome).toBe('Ask Arjun to show you how picture clues helped with reading.')
  })

  it('says when the child was happy all week', () => {
    const result = buildWeeklyFallback([week[0]], 'Arjun')
    expect(result.headline).toBe('Arjun has been happy and settled with us.')
  })

  it('handles a week with no sessions', () => {
    expect(buildWeeklyFallback([]).headline).toBe('No sessions were recorded that week.')
  })
})

describe('listWeeks', () => {
  it('lists each week with sessions once, newest first, and skips empty weeks', () => {
    const dates = ['2026-10-29', '2026-10-27', '2026-10-14', '2026-10-12'] // nothing in the week of 19 Oct
    const weeks = listWeeks(dates.map((date) => ({ date })))
    expect(weeks.map((w) => w.start)).toEqual(['2026-10-26', '2026-10-12'])
  })

  it('goes back at most 8 weeks', () => {
    const dates = []
    for (let i = 0; i < 12; i++) {
      const d = new Date('2026-10-28T00:00:00')
      d.setDate(d.getDate() - 7 * i)
      dates.push({ date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })
    }
    expect(listWeeks(dates)).toHaveLength(8)
  })
})

describe('weekTitleFor', () => {
  const today = new Date('2026-11-04T10:00:00') // a Wednesday
  it('names the week counted back from today', () => {
    expect(weekTitleFor({ start: '2026-11-02' }, today)).toBe('This week')
    expect(weekTitleFor({ start: '2026-10-26' }, today)).toBe('Last week')
    expect(weekTitleFor({ start: '2026-10-12' }, today)).toBe('3 weeks ago')
  })
})