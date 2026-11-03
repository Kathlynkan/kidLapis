// Unit test for the child code check.   Owner: Kai Sen
// Run:  pnpm test:unit
import { describe, it, expect } from 'vitest'
import { isValidChildCode } from '@/utils/validation'

// A child code links a parent to their child, e.g. "K7P3QX" (6 letters/numbers)
describe('isValidChildCode', () => {
  // Test case (1): a normal code passes
  it('accepts 6 letters and numbers', () => {
    expect(isValidChildCode('K7P3QX')).toBe(true)
  })

  // Test case (2): small letters are fine too (the server turns them into capitals)
  it('accepts small letters too', () => {
    expect(isValidChildCode('k7p3qx')).toBe(true)
  })

  // Test case (3): too short
  it('rejects a code that is too short', () => {
    expect(isValidChildCode('K7P3')).toBe(false)
  })

  // Test case (4): too long
  it('rejects a code that is too long', () => {
    expect(isValidChildCode('K7P3QXZ')).toBe(false)
  })

  // Test case (5): symbols and spaces are not allowed
  it('rejects symbols and spaces', () => {
    expect(isValidChildCode('K7P-3Q')).toBe(false)
    expect(isValidChildCode('K7 P3Q')).toBe(false)
  })

  // Test case (6): an empty code is not valid
  it('rejects an empty code', () => {
    expect(isValidChildCode('')).toBe(false)
  })
})
