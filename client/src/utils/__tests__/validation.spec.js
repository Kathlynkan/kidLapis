// Unit tests for the sign-up checks.   Owner: Kai Sen
// Run:  pnpm test:unit
import { describe, it, expect } from 'vitest'
import { isValidEmail, isValidChildCode, validateSignup } from '../validation'

// A form that passes every check; each test changes one thing
const goodForm = () => ({
  name: 'Tan Ah Kow',
  email: 'ahkow@example.com',
  password: 'secret123',
  confirmPassword: 'secret123',
  role: 'volunteer',
  skills: ['Fractions'],
  availability: ['Mon'],
})

describe('isValidEmail', () => {
  it('accepts a normal email', () => {
    expect(isValidEmail('ahkow@example.com')).toBe(true)
  })

  it('rejects emails without @, without a dot, or with spaces', () => {
    expect(isValidEmail('ahkow.example.com')).toBe(false)
    expect(isValidEmail('ahkow@example')).toBe(false)
    expect(isValidEmail('ah kow@example.com')).toBe(false)
  })
})

describe('validateSignup', () => {
  it('returns no errors for a correct form', () => {
    expect(validateSignup(goodForm())).toEqual({})
  })

  it('needs a name', () => {
    expect(validateSignup({ ...goodForm(), name: '   ' }).name).toBeTruthy()
  })

  it('needs a valid email', () => {
    expect(validateSignup({ ...goodForm(), email: '' }).email).toBe('Please enter your email.')
    expect(validateSignup({ ...goodForm(), email: 'hello' }).email).toContain('valid email')
  })

  it('needs a password of at least 8 characters', () => {
    const form = { ...goodForm(), password: 'short', confirmPassword: 'short' }
    expect(validateSignup(form).password).toContain('at least 8')
  })

  it('accepts a password of exactly 8 characters', () => {
    const form = { ...goodForm(), password: '12345678', confirmPassword: '12345678' }
    expect(validateSignup(form)).toEqual({})
  })

  it('needs the two passwords to match', () => {
    const form = { ...goodForm(), confirmPassword: 'different1' }
    expect(validateSignup(form).confirmPassword).toBe('Passwords do not match.')
  })

  it('needs a volunteer to pick at least one skill and one day', () => {
    const errors = validateSignup({ ...goodForm(), skills: [], availability: [] })
    expect(errors.skills).toContain('at least one skill')
    expect(errors.availability).toContain('at least one day')
  })

  it('does not ask parents for skills or days', () => {
    const form = { ...goodForm(), role: 'parent', skills: [], availability: [] }
    expect(validateSignup(form)).toEqual({})
  })

  it('lets parents leave the child code blank', () => {
    const form = { ...goodForm(), role: 'parent', childCode: '  ' }
    expect(validateSignup(form)).toEqual({})
  })

  it('accepts a correct child code, in any case', () => {
    expect(validateSignup({ ...goodForm(), role: 'parent', childCode: 'K7P3QX' })).toEqual({})
    expect(validateSignup({ ...goodForm(), role: 'parent', childCode: 'k7p3qx' })).toEqual({})
  })

  it('rejects a child code that is the wrong length or has symbols', () => {
    expect(
      validateSignup({ ...goodForm(), role: 'parent', childCode: 'K7P3' }).childCode,
    ).toContain('6 letters')
    expect(
      validateSignup({ ...goodForm(), role: 'parent', childCode: 'K7P-3Q' }).childCode,
    ).toBeTruthy()
  })

  it('ignores the child code for volunteers', () => {
    expect(validateSignup({ ...goodForm(), childCode: 'nope' })).toEqual({})
  })
})

describe('isValidChildCode', () => {
  it('accepts 6 letters and numbers', () => {
    expect(isValidChildCode('K7P3QX')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isValidChildCode('')).toBe(false)
    expect(isValidChildCode('K7P3QXZ')).toBe(false)
    expect(isValidChildCode('K7 P3Q')).toBe(false)
  })
})
