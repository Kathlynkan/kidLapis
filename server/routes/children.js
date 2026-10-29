// =============================================================
// /children  - child profiles             Owner: Kai Sen
// -------------------------------------------------------------
// =============================================================
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { Child, User, Session, Homework, Message, Handover } from '../models/index.js'
import { newLinkCode } from '../models/helpers.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { canAccessChild, childFilterFor } from '../utils/access.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const router = Router()
router.use(requireAuth)

// GET /children  -> only the children this user is allowed to see
// Teachers also get each child's linkCode (the code parents use at sign up).
router.get('/', async (req, res) => {
  const isTeacher = req.user.role === 'teacher'
  let query = Child.find(childFilterFor(req.user)).sort({ name: 1 })
  if (isTeacher) query = query.select('+linkCode')
  const children = await query

  // Children added before child codes existed don't have one yet: give them one now
  if (isTeacher) {
    for (const child of children.filter((c) => !c.linkCode)) {
      child.linkCode = newLinkCode()
      await child.save()
    }
  }
  res.json(children)
})

// GET /children/:id
router.get('/:id', async (req, res) => {
  const child = await Child.findById(req.params.id)
  if (!child) return res.status(404).json({ message: 'Child not found' })
  if (!canAccessChild(req.user, child)) {
    return res.status(403).json({ message: 'You do not have access to this child.' })
  }
  res.json(child)
})

const LEVELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']

// Checks used by BOTH "add child" (POST) and "edit child" (PUT), so the rules are the same.
// Returns an error message, or '' if everything is fine.
// Never trust the browser: someone could send a request without using our form.
async function checkChildForm({ name, level, needs, parentId }) {
  if (!name || !String(name).trim()) {
    return 'Name is required.'
  }
  if (!LEVELS.includes(level)) {
    return 'Level must be P1 to P6.'
  }
  if (needs !== undefined && !Array.isArray(needs)) {
    return 'Needs must be a list.'
  }
  // The parent is optional, but if one is given it must be a real parent account
  if (parentId) {
    const parentExists = await User.exists({ _id: parentId, role: 'parent' })
    if (!parentExists) {
      return 'That parent account does not exist.'
    }
  }
  return ''
}

// POST /children   body: { name, level, school, parentId, needs, avatar, childEmail?, childPassword? }
// Only teachers get past requireRole('teacher'); everyone else gets 403.
// childEmail + childPassword are optional: if both are supplied, a child User login is also created.
router.post('/', requireRole('teacher'), async (req, res) => {
  const { name, level, school, parentId, needs, avatar, childEmail, childPassword } = req.body

  // 1. Validate profile fields
  const problem = await checkChildForm(req.body)
  if (problem) {
    return res.status(400).json({ message: problem })
  }

  // 2. Validate login fields if provided (either both or neither)
  const wantsLogin = childEmail || childPassword
  if (wantsLogin) {
    const email = String(childEmail || '').trim().toLowerCase()
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Child login email is not valid.' })
    }
    // Same minimum as every other account (MIN_PASSWORD_LENGTH in routes/auth.js)
    if (typeof childPassword !== 'string' || childPassword.length < 8) {
      return res.status(400).json({ message: 'Child login password must be at least 8 characters.' })
    }
    const exists = await User.exists({ email })
    if (exists) {
      return res.status(409).json({ message: 'That email is already used by another account.' })
    }
  }

  // 3. Save the child profile
  try {
    const child = await Child.create({
      name: String(name).trim(),
      level,
      school: school ? String(school).trim() : undefined,
      parentId: parentId || undefined,
      needs: needs || [],
      volunteerIds: [],
      avatar: avatar || undefined,
      linkCode: newLinkCode(), // the teacher gives this to the parent for sign up
    })

    // 4. Optionally create the child User account
    if (wantsLogin) {
      const email = String(childEmail).trim().toLowerCase()
      await User.create({
        name: String(name).trim(),
        email,
        password: await bcrypt.hash(childPassword, 10),
        role: 'child',
        childId: child._id,
      })
    }

    res.status(201).json(child)
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message })
    }
    throw error
  }
})

// PUT /children/:id   body: { name, level, school, parentId, needs }
// Edits the child's profile only. Volunteers (Yu Xuan), points (Jachin) and
// follow-up flags are changed by their own features, so they are not touched here.
router.put('/:id', requireRole('teacher'), async (req, res) => {
  // 1. Does this child exist? (+linkCode so the reply still has the child code for the table)
  const child = await Child.findById(req.params.id).select('+linkCode')
  if (!child) {
    return res.status(404).json({ message: 'Child not found' })
  }

  // 2. Validate (same rules as adding a child)
  const problem = await checkChildForm(req.body)
  if (problem) {
    return res.status(400).json({ message: problem })
  }

  // 3. Change the fields, then save. save() runs the schema rules in models/Child.js again.
  const { name, level, school, parentId, needs } = req.body
  child.name = String(name).trim()
  child.level = level
  child.school = school ? String(school).trim() : undefined // empty box = remove the school
  child.parentId = parentId || undefined // "No parent account yet" = remove the link
  child.needs = needs || []

  try {
    await child.save()
    res.json(child) // 200 OK + the updated child
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message })
    }
    throw error
  }
})

// DELETE /children/:id
// Decision (Kai Sen): deleting a child also deletes everything that belongs to them,
// so no session, homework, message or login is left pointing to a child that no longer
// exists. The page warns the coordinator before sending this request.
router.delete('/:id', requireRole('teacher'), async (req, res) => {
  // 1. Does this child exist?
  const child = await Child.findById(req.params.id)
  if (!child) {
    return res.status(404).json({ message: 'Child not found' })
  }

  // 2. Delete everything linked to this child (each result says how many were deleted)
  const childId = child.id
  const sessions = await Session.deleteMany({ childId })
  const homework = await Homework.deleteMany({ childId })
  const messages = await Message.deleteMany({ childId })
  await Handover.deleteMany({ childId }) // saved AI summaries for this child
  await User.deleteMany({ role: 'child', childId }) // the child's own login, if any

  // 3. Delete the child last
  await child.deleteOne()

  res.json({
    message: `${child.name} was deleted.`,
    deleted: {
      sessions: sessions.deletedCount,
      homework: homework.deletedCount,
      messages: messages.deletedCount,
    },
  })
})

export default router