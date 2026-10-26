// =============================================================
// /auth  - Sign up, log in, log out        Owner: Kai Sen
// -------------------------------------------------------------
// This file is COMPLETE and doubles as the reference pattern for
// everyone else's routes:  validate -> Model.create / find -> res.json
// =============================================================
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { User, Child } from '../models/index.js'
import { newLinkCode } from '../models/helpers.js'
import { issueToken, revokeToken, requireAuth } from '../middleware/auth.js'

const router = Router()
const SIGNUP_ROLES = ['volunteer', 'parent'] // coordinators & child accounts are created by the centre
const MIN_PASSWORD_LENGTH = 8 // same rule as client/src/utils/validation.js
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/ // something@something.something, no spaces

// Tidy an email the same way everywhere, so " Ann@X.com " and "ann@x.com" count as the same account.
// String(...) also stops a crash if someone sends a number instead of text.
const cleanEmail = (email) =>
  String(email ?? '')
    .trim()
    .toLowerCase()

// The only skills and days a volunteer can pick.
// Must match SKILL_OPTIONS and DAYS in client/src/utils/constants.js (the server can't import client files).
const SKILL_OPTIONS = ['English', 'Math', 'Science', 'Mother Tongue']
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

// true if `list` is an array with at least one item, and every item is in `allowed`
const isPickedFrom = (list, allowed) =>
  Array.isArray(list) && list.length > 0 && list.every((item) => allowed.includes(item))

// POST /auth/signup   body: { name, email, password, role, skills?, availability?, childCode? }
// skills and availability are only for volunteers.
// childCode is optional, for parents: the code the centre gave them, which links
// the new account to their child. Without it, a teacher can link them later.
router.post('/signup', async (req, res) => {
  const { password, role } = req.body
  const name = String(req.body.name ?? '').trim()
  const email = cleanEmail(req.body.email)

  // 1. Validate (the page checks too, but never trust only the browser)
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Name, email, password and role are required.' })
  }
  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email.' })
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return res
      .status(400)
      .json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` })
  }
  if (!SIGNUP_ROLES.includes(role)) {
    return res.status(400).json({ message: 'You can only sign up as a volunteer or parent.' })
  }
  if (role === 'volunteer') {
    if (!isPickedFrom(req.body.skills, SKILL_OPTIONS)) {
      return res.status(400).json({ message: 'Pick at least one skill from the list.' })
    }
    if (!isPickedFrom(req.body.availability, DAYS)) {
      return res.status(400).json({ message: 'Pick at least one day from the list.' })
    }
  }

  // 2. Is the email already used?
  const exists = await User.exists({ email })
  if (exists) {
    return res.status(409).json({ message: 'An account with this email already exists.' })
  }

  // 3. Parents with a child code: find that child before creating the account,
  //    so a wrong code doesn't leave behind an account with no child
  let childToLink = null
  const childCode = String(req.body.childCode ?? '')
    .trim()
    .toUpperCase()
  if (role === 'parent' && childCode) {
    childToLink = await Child.findOne({ linkCode: childCode })
    if (!childToLink) {
      return res
        .status(400)
        .json({ message: 'That child code does not match any child. Please check it with the centre.' })
    }
    if (childToLink.parentId) {
      return res.status(409).json({
        message: 'This child is already linked to a parent account. Please ask the centre for help.',
      })
    }
  }

  // 4. Save. Mongoose fills in _id and createdAt using the defaults in models/User.js
  try {
    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role,
      // new Set(...) removes duplicates; parents get empty lists
      skills: role === 'volunteer' ? [...new Set(req.body.skills)] : [],
      availability: role === 'volunteer' ? [...new Set(req.body.availability)] : [],
    })
    // 5. Link the parent to their child. A new code replaces the used one, so each code works once.
    if (childToLink) {
      childToLink.parentId = user.id
      childToLink.linkCode = newLinkCode()
      await childToLink.save()
    }
    const token = issueToken(user.id)
    res.status(201).json({ token, user }) // password is removed by toJSON (models/helpers.js)
  } catch (error) {
    // 11000 = MongoDB's "duplicate key" error: two sign-ups with the same email at the same moment
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }
    throw error // anything else goes to the 500 handler in server.js
  }
})

// POST /auth/login   body: { email, password }
router.post('/login', async (req, res) => {
  const { password } = req.body
  const user = await User.findOne({ email: cleanEmail(req.body.email) })

  // typeof check: bcrypt.compare throws (-> 500) if password is missing or not text
  const valid =
    user && typeof password === 'string' && (await bcrypt.compare(password, user.password))
  if (!valid) {
    return res.status(401).json({ message: 'Incorrect email or password.' })
  }
  const token = issueToken(user.id)
  res.json({ token, user })
})

// GET /auth/me  -> who am I? (used to check a saved token is still valid)
router.get('/me', requireAuth, (req, res) => {
  res.json(req.user)
})

// PUT /auth/profile  -> update the logged-in user's own profile
router.put('/profile', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) return res.status(404).json({ message: 'User not found.' })

  // Name (child accounts are named by the teacher, not themselves)
  if (user.role !== 'child' && req.body.name !== undefined) {
    const name = String(req.body.name).trim()
    if (!name) return res.status(400).json({ message: 'Name is required.' })
    user.name = name
  }

  // Password change (optional — only sent when the user fills in the password section)
  if (user.role !== 'child' && req.body.newPassword !== undefined) {
    if (!req.body.currentPassword) {
      return res.status(400).json({ message: 'Enter your current password to change it.' })
    }
    const valid = await bcrypt.compare(req.body.currentPassword, user.password)
    if (!valid) return res.status(400).json({ message: 'Current password is incorrect.' })
    if (typeof req.body.newPassword !== 'string' || req.body.newPassword.length < MIN_PASSWORD_LENGTH) {
      return res
        .status(400)
        .json({ message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` })
    }
    user.password = await bcrypt.hash(req.body.newPassword, 10)
  }

  // Volunteer: update skills and availability
  if (user.role === 'volunteer') {
    if (req.body.skills !== undefined) {
      if (!isPickedFrom(req.body.skills, SKILL_OPTIONS)) {
        return res.status(400).json({ message: 'Pick at least one skill from the list.' })
      }
      user.skills = [...new Set(req.body.skills)]
    }
    if (req.body.availability !== undefined) {
      if (!isPickedFrom(req.body.availability, DAYS)) {
        return res.status(400).json({ message: 'Pick at least one day from the list.' })
      }
      user.availability = [...new Set(req.body.availability)]
    }
  }

  await user.save()

  // Child: avatar is stored on the Child document, not the User
  if (user.role === 'child' && req.body.avatar) {
    await Child.findByIdAndUpdate(user.childId, { avatar: String(req.body.avatar) })
  }

  res.json(user) // password stripped by toJSON in models/helpers.js
})

// POST /auth/logout
router.post('/logout', requireAuth, (req, res) => {
  revokeToken(req.token)
  res.json({ message: 'Logged out' })
})

export default router