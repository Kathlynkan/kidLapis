/*
Unit Test for activitiesOf in utils/format.js (what the child did in a session)   Owner: Kat

    the parent page shows what the child did, like chess or soccer, and it needs that as a list.
    but a session can have a list, just one word or nothing at all, so activitiesOf turns
    all of those into a list and each test case below checks one of them
*/

import { describe, it, expect } from 'vitest'
import { activitiesOf } from '@/utils/format'

describe('activitiesOf', () => {

    // Test case (1): Verify that a session with a list of activities gives the same list back.
    it('returns the list when the session has a list of activities', () => {
        const result = activitiesOf({ activity: ['Chess', 'Drawing'] })

        // 2 activities in, so 2 should come out and the first one is still Chess
        expect(result).toHaveLength(2)
        expect(result[0]).toBe('Chess')
    })

    // Test case (2): Verify that a session with just one word turns into a list of one.
    it('puts a single word into a list of one', () => {
        const result = activitiesOf({ activity: 'Soccer' })

        // Some sessions only have one word, so it should end up as a list with just that word
        expect(result).toHaveLength(1)
        expect(result[0]).toBe('Soccer')
    })

    // Test case (3): Verify that a session with no activity gives an empty list, so the page just shows nothing.
    it('returns an empty list when the session has no activity', () => {
        // the session has no activity field at all
        expect(activitiesOf({})).toHaveLength(0)
    })

    // Test case (4): Verify that empty text gives an empty list, not a list with a blank in it.
    it('returns an empty list when the activity is empty text', () => {
        expect(activitiesOf({ activity: '' })).toHaveLength(0)
    })

    // Test case (5): Verify that null gives an empty list and doesnt crash.
    it('returns an empty list when the activity is null', () => {
        expect(activitiesOf({ activity: null })).toHaveLength(0)
    })
})
