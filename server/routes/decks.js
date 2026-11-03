// =============================================================
// /decks  - the decks of questions a volunteer can give to a child
// =============================================================
import { Router } from 'express'
import { Deck } from '../models/index.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// Everything in this file needs a logged-in volunteer or coordinator (a child must never see the answers).
router.use(requireAuth)
router.use(requireRole('volunteer', 'coordinator'))

// ---------------------------------------------------------------
// GET /decks
// All the decks, sorted by subject and then by title.
// ---------------------------------------------------------------
router.get('/', async (req, res) => {
  const decks = await Deck.find().sort({ subject: 1, title: 1 })
  res.json(decks)
})

export default router
