// =============================================================
// /users  - volunteer list & profiles     Owners: Yu Xuan (volunteers), Kai Sen
// =============================================================
import { Router } from 'express'
import { User, Child } from '../models/index.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// GET /users?role=volunteer   (coordinator only)
router.get('/', requireRole('teacher'), async (req, res) => {
  const filter = req.query.role ? { role: req.query.role } : {}
  const users = await User.find(filter).sort({ name: 1 })
  res.json(users)
})

// GET /users/:id  -> basic profile (name, role, skills) - used e.g. for chat headers
router.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id).select('name role skills')
  if (!user) return res.status(404).json({ message: 'User not found' })
  res.json(user)
})

// PUT /users/:id   body: { skills: [...], availability: [...] }
// A volunteer may update their own profile; a coordinator may update anyone.
router.put('/:id', async (req, res) => {
  if (req.user.role !== 'teacher' && req.user.id !== req.params.id) {
    return res.status(403).json({ message: 'You can only edit your own profile.' })
  }
  const user = await User.findById(req.params.id)
  if (!user) return res.status(404).json({ message: 'User not found' })

  // TODO (Yu Xuan): validate skills against SKILL_OPTIONS on the client
  const { skills, availability } = req.body
  if (skills) user.skills = skills
  if (availability) user.availability = availability
  await user.save()
  res.json(user)
})

// DELETE /users/:id   (teacher only)
// Removes a volunteer account. Sessions, homework, and messages they created are preserved
// as historical records. The volunteer is also removed from any children's volunteerIds list.
router.delete('/:id', requireRole('teacher'), async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) return res.status(404).json({ message: 'User not found.' })
  if (user.role !== 'volunteer') {
    return res.status(400).json({ message: 'Only volunteer accounts can be deleted this way.' })
  }

  // Detach from every child they were assigned to
  await Child.updateMany({ volunteerIds: user.id }, { $pull: { volunteerIds: user.id } })

  await User.deleteOne({ _id: user.id })
  res.json({ message: `${user.name} has been removed.` })
})

export default router
