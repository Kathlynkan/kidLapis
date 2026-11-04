// Unit test for a helper of the parent page: activitiesOf (what the child did in a session).   Owner: Kat
// The function gives back the activities as a list, whether the session saved a list or one word.
import { describe, it, expect } from 'vitest'
import { activitiesOf } from '@/utils/format'

describe('activitiesOf', () => {
  it('returns the list when the session has a list of activities', () => {
    const result = activitiesOf({ activity: ['Chess', 'Drawing'] })
    expect(result).toHaveLength(2)
    expect(result[0]).toBe('Chess')
  })

  it('puts a single word into a list of one', () => {
    const result = activitiesOf({ activity: 'Soccer' })
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('Soccer')
  })

  it('returns an empty list when the session has no activity', () => {
    expect(activitiesOf({})).toHaveLength(0)
  })

  it('returns an empty list when the activity is empty text', () => {
    expect(activitiesOf({ activity: '' })).toHaveLength(0)
  })

  it('returns an empty list when the activity is null', () => {
    expect(activitiesOf({ activity: null })).toHaveLength(0)
  })
})
