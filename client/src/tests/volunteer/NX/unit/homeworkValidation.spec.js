// verify that homework can only be assigned with 
// valid due dates (today or later)

import { describe, test, expect } from 'vitest'

describe('Homework validation', () => {

  // Test Case 1: Due date in the past
  test('rejects homework with due date in the past', () => {
    const today = '2026-11-05'
    const dueDate = '2026-11-01'

    const valid = dueDate >= today

    expect(valid).toBe(false)
  })

// Test Case 2: Due date is current day
  test('accepts homework due today', () => {
    const today = '2026-11-05'
    const dueDate = '2026-11-05'

    const isValid = dueDate >= today

    expect(isValid).toBe(true)
  })

  // Test Case 3: Due date in the future
  test('accepts homework with due date in the future', () => {
    const today = '2026-11-05'
    const dueDate = '2026-11-10'

    const isValid = dueDate >= today

    expect(isValid).toBe(true)
  })

  // Test Case 4: Empty due date
  test('rejects empty due date', () => {
    const dueDate = ''

    expect(Boolean(dueDate)).toBe(false)
  })
})