/*
Unit Tests for the handover helper functions (server/routes/handover.js)   Owner: Yuqi
*/

import { describe, it, expect } from 'vitest'
import { checkMood } from '../routes/handover.js'

describe('TestSuite: checkMood (mood summary from the last 3 sessions)', () => {
  // Make fake sessions with only the mood filled in (newest first).
  // e.g. makeSessions(['okay', 'tired', 'tired'])  
  function makeSessions(moodList) {
    const sessions = []
    for (const mood of moodList) {
      sessions.push({ mood: mood })
    }
    return sessions
  }
  // check that theres 2 "tired" mood out of 3 latest sessions
  it('Test1: 2 tired sessions out of 3 is a pattern', () => {
    expect(checkMood(makeSessions(['okay', 'tired', 'tired']))).toBe(
      'Tired in 2 of the last 3 sessions. Check in at the start and keep tasks short.',
    )
  })

  // check that theres 2 "frustrated" mood out of 3 latest sessions
  it('Test2: uses the word "Frustrated" when the child was frustrated', () => {
    expect(checkMood(makeSessions(['frustrated', 'frustrated', 'happy']))).toBe(
      'Frustrated in 2 of the last 3 sessions. Check in at the start and keep tasks short.',
    )
  })

  // check that theres a mix of "tired" and "frustrated" mood out of 3 latest sessions
  it('Test3: uses "Tired or frustrated" for a mix of both', () => {
    expect(checkMood(makeSessions(['tired', 'frustrated', 'okay']))).toBe(
      'Tired or frustrated in 2 of the last 3 sessions. Check in at the start and keep tasks short.',
    )
  })

  // check that theres 1 ("tired" OR "frustrated") mood in the latest session
  it('Test4: one low mood in the latest session', () => {
    expect(checkMood(makeSessions(['tired', 'happy', 'happy']))).toBe('Was tired last session, so keep an eye on it.')
  })  
  
  // check that theres 1 ("tired" OR "frustrated") mood in the 2/3 session
  it('Test5: one low mood in an older session', () => {
    expect(checkMood(makeSessions(['okay', 'happy', 'tired']))).toBe('Had one low day recently, but has been fine since.')
  })

  // check that theres 3 happy mood in 3 latest sessions
  it('Test6: happy in every session', () => {
    expect(checkMood(makeSessions(['happy', 'happy', 'happy']))).toBe('Happy in the last 3 sessions.')
  })

  // check that theres NO ("tired" or "frustrated") mood in 3 latest sessions
  it('Test7: no low moods, but not all happy', () => {
    expect(checkMood(makeSessions(['happy', 'okay', 'happy']))).toBe('Settled and in a good mood in the last 3 sessions.')
  })

  // check that theres only 1 session and it's "happy" mood
  it('Test8: a new child with only 1 session', () => {
    expect(checkMood(makeSessions(['happy']))).toBe('Happy in the last session.')
  })

  // check if mood only comes from the latest 3 sessions
  it('Test9: only the newest 3 sessions count', () => {
    expect(checkMood(makeSessions(['happy', 'happy', 'happy', 'tired']))).toBe('Happy in the last 3 sessions.')
    expect(checkMood(makeSessions(['happy', 'happy', 'happy', 'tired']))).not.toContain('Tired')
  })
})