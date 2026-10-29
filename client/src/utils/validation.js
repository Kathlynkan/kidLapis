// Form checks for sign up.   Owner: Kai Sen
// Kept as plain functions (no Vue) so they are easy to unit test (see __tests__/validation.spec.js).
// The server checks the same rules again in server/routes/auth.js.

export const MIN_PASSWORD_LENGTH = 8

// Something@something.something, with no spaces
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Child codes are 6 letters/numbers, e.g. "K7P3QX" (made by newLinkCode() in server/models/helpers.js).
// Lower case is fine - the server turns it into capitals.
export function isValidChildCode(code) {
  return /^[A-Z0-9]{6}$/i.test(code)
}

// Returns an object with one message per field that has a problem.
// An empty object {} means the form is fine.
export function validateSignup(form) {
  const errors = {}

  if (!form.name.trim()) {
    errors.name = 'Please enter your full name.'
  }

  if (!form.email.trim()) {
    errors.email = 'Please enter your email.'
  } else if (!isValidEmail(form.email.trim())) {
    errors.email = 'Please enter a valid email, e.g. name@example.com.'
  }

  if (form.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }

  if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  // Volunteers must pick at least one skill and one day, otherwise matchmaking
  // can never suggest them for a child. Parents don't see these questions.
  if (form.role === 'volunteer') {
    if (!form.skills || form.skills.length === 0) {
      errors.skills = 'Pick at least one skill you can help with.'
    }
    if (!form.availability || form.availability.length === 0) {
      errors.availability = 'Pick at least one day you can come in.'
    }
  }

  // Parents: the child code is optional, but if they type one it must look like a code
  if (
    form.role === 'parent' &&
    form.childCode?.trim() &&
    !isValidChildCode(form.childCode.trim())
  ) {
    errors.childCode = 'Child codes are 6 letters and numbers, e.g. K7P3QX.'
  }

  return errors
}
