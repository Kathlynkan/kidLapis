/*
Unit Test for activitiesOf in utils/format.js (what the child did in a session) Owner: Kat
*/

import { describe, it, expect } from 'vitest'
import { activitiesOf } from '@/utils/format'

describe('activitiesOf', () => {

    // Test case (1): Verify that a session with a list of activities gives the same list back.
    it('returns the list when the session has a list of activities', () => {
        const result = activitiesOf({ activity: ['Chess', 'Drawing'] })

        expect(result).toHaveLength(2)
        expect(result[0]).toBe('Chess')
    })

    // Test case (2): Verify that a session with one word (the older way) becomes a list of one.
    it('puts a single word into a list of one', () => {
        const result = activitiesOf({ activity: 'Soccer' })

        expect(result).toHaveLength(1)
        expect(result[0]).toBe('Soccer')
    })

    // Test case (3): Verify that a session with no activity gives an empty list, so the page shows nothing.
    it('returns an empty list when the session has no activity', () => {
        expect(activitiesOf({})).toHaveLength(0)
    })

    // Test case (4): Verify that an activity that is only empty text gives an empty list (not a list with a blank in it).
    it('returns an empty list when the activity is empty text', () => {
        expect(activitiesOf({ activity: '' })).toHaveLength(0)
    })

    // Test case (5): Verify that a missing value (null) gives an empty list and does not crash.
    it('returns an empty list when the activity is null', () => {
        expect(activitiesOf({ activity: null })).toHaveLength(0)
    })
})
