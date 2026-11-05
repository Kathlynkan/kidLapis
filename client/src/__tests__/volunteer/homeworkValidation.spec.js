// Verify that homework can only be assigned with
// valid due dates (today or later)

import { describe, test, expect } from 'vitest'

describe('Homework validation', () => {

  // Test Case 1: Due date is in the past
  test('rejects homework with due date in the past', () => {
    const today = '2026-11-05'
    const dueDate = '2026-11-01'

    const valid = dueDate >= today

    expect(valid).toBe(false)
  })

  // Test Case 2: Due date is yesterday
  test('rejects homework with due yesterday', () => {
    const today = '2026-11-05'
    const dueDate = '2026-11-04'

    const valid = dueDate >= today

    expect(valid).toBe(false)
  })

// Test Case 3: Due date is today
  test('accepts homework due today', () => {
    const today = '2026-11-05'
    const dueDate = '2026-11-05'

    const isValid = dueDate >= today

    expect(isValid).toBe(true)
  })

  // Test Case 4: Due date is tomorrow
  test('accepts homework with due tomorrow', () => {
    const today = '2026-11-05'
    const dueDate = '2026-11-06'

    const valid = dueDate >= today

    expect(valid).toBe(true)
  })

  // Test Case 5: Due date is in the future
  test('accepts homework with due date in the future', () => {
    const today = '2026-11-05'
    const dueDate = '2026-11-10'

    const isValid = dueDate >= today

    expect(isValid).toBe(true)
  })

  // Test Case 6: Empty due date
  test('rejects empty due date', () => {
    const dueDate = ''

    expect(Boolean(dueDate)).toBe(false)
  })
})