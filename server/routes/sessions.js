// =============================================================
// /sessions  - session records (the core of the app)   Owner: Ning Xuan
// -------------------------------------------------------------
// Fields: see models/Session.jsn
// =============================================================
import { Router } from 'express'
import { Child, Session, User, Handover } from '../models/index.js' // import mongoDB collections
import { requireAuth, requireRole } from '../middleware/auth.js'
import { canAccessChild, visibleChildIds } from '../utils/access.js'

const router = Router()
router.use(requireAuth) // apply requireAuth to all routes (every route requires login)
// requireAuth ensure user is logged in

// GET /sessions?childId=c_1   -> newest first
router.get('/', async (req, res) => { // get list of all sessions
  try {
    const childId = req.query.childId // read childId from URL query
    const filter = {}

    if (childId) {
      const child = await Child.findById(childId)

      // check if child exists
      if (!child) {
        return res.status(404).json({
          message: 'Child not found'
        })
      }

      // check user access
      if (!canAccessChild(req.user, child)) {
        return res.status(403).json({
          message: 'No access'
        })
      }

      filter.childId = childId
    } else if (req.user.role !== 'teacher') {
      // non-coordinators can only see sessions belonging to children they can access
      // coordinators can see all sessions of all the children
      const allowedChildren = await visibleChildIds(req.user)

      // only return sessions for children user can access
      filter.childId = { $in: allowedChildren } 
    }

    // find all matching sessions, sort by newest date first
    const sessions = await Session.find(filter).sort({ date:-1 })

    // get unique volunteerId from sessions
    const volunteerIds = sessions.map((s) => s.volunteerId)
    const uniqueVolunteerIds = Array.from( // convert from Set back to array
      new Set(volunteerIds) // remove duplicates
    )

    // find volunteer names
    const volunteers = await User.find({
      _id: {$in: uniqueVolunteerIds}
    }).select('name')

    // create lookup table: map volunteerId -> volunteerName
    const nameOf = {}
    for (const volunteer of volunteers) {
      nameOf[volunteer.id] = volunteer.name
    }

    // add volunteerName to each session
    const sessionsWithNames = []
    for (const session of sessions) {
      const sessionData = session.toJSON() // convert to JSON
      // add volunteer name from nameOf
      sessionData.volunteerName = nameOf[session.volunteerId] || 'Unknown'
      sessionsWithNames.push(sessionData)
    }

    // return sessions
    return res.json(sessionsWithNames)
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to retrieve sessions'
    })
  }
})

// GET /sessions/:id
router.get('/:id', async (req, res) => { // get one specific session
  try {
    const session = await Session.findById(req.params.id)

    // check if session exists
    if (!session) {
      return res.status(404).json({
        message: 'Session not found'
      })
    }

    const child = await Child.findById(session.childId)

    // check if child exists
    if (!child) {
      return res.status(404).json({
        message: 'Child not found'
      })
    }

    // check user access
    if (!canAccessChild(req.user, child)) {
      return res.status(403).json({
        message: 'No access'
      })
    }

    // return session
    return res.json(session)
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to retrieve session'
    })
  }
})

// POST /sessions
router.post('/', requireRole('volunteer', 'teacher'), async (req, res) => { 
  // only volunteers and coordinators can create brand new session
  try {
    const child = await Child.findById(req.body.childId)

    // check if child exists
    if (!child) {
      return res.status(404).json({
        message: 'Child not found'
      })
    }

    // check user access
    if (!canAccessChild(req.user, child)) {
      return res.status(403).json({
        message: 'No access'
      })
    }

    const today = new Date().toISOString().slice(0, 10)

    // check date exists
    if (!req.body.date) {
      return res.status(400).json({
        message: 'Date is required'
      })
    }

    // validate date
    if (req.body.date > today) {
      return res.status(400).json({
        message: 'Date cannot be in the future'
      })
    }

    // validate topic
    if (!req.body.topic) {
      return res.status(400).json({
        message: 'Topic is required'
      })
    }

    // validate correct <= attempted
    if (req.body.correct > req.body.attempted) {
      return res.status(400).json({
        message: 'Correct cannot exceed attempted'
      })
    }

    // create new session
    const session = await Session.create({
      childId: req.body.childId,
      date: req.body.date,
      subject: req.body.subject,
      topic: req.body.topic,
      attempted: req.body.attempted,
      correct: req.body.correct,
      struggles: req.body.struggles,
      whatWorked: req.body.whatWorked,
      nextStep: req.body.nextStep,
      mood: req.body.mood,
      notes: req.body.notes,
      volunteerId: req.user.id,
      meal: req.body.meal,
      portion: req.body.portion,
      activity: req.body.activity,
      interaction: req.body.interaction,
      behaviour: req.body.behaviour,
      socialNotes: req.body.socialNotes,
      photos: req.body.photos || []
    })

    // return new session
    return res.status(201).json(session) 
    // status 201: request succeeded and created new session
    // default status 200: request succeeded
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to create session'
    })
  }
})

// PUT /sessions/:id
router.put('/:id', requireRole('volunteer', 'teacher'), async (req, res) => { 
  // only volunteers and coordinators can edit session
  try {
    const session = await Session.findById(req.params.id)

    // check if session exists
    if (!session) {
      return res.status(404).json({
        message: 'Session not found'
      })
    }

    // check if user is coordinator or owner of session
    if (req.user.role !== 'teacher' && session.volunteerId !== req.user.id) {
      // coordinators can edit all sessions
      // volunteers can only edit their own sessions
      return res.status(403).json({
        message: 'No access'
      })
    }

    const today = new Date().toISOString().slice(0, 10)

    // check date exists
    if (!req.body.date) {
      return res.status(400).json({
        message: 'Date is required'
      })
    }

    // validate date
    if (req.body.date > today) {
      return res.status(400).json({
        message: 'Date cannot be in the future'
      })
    }
    // validate topic
    if (!req.body.topic) {
      return res.status(400).json({
        message: 'Topic is required'
      })
    }

    // validate correct <= attempted
    if (req.body.correct > req.body.attempted) {
      return res.status(400).json({
        message: 'Correct cannot exceed attempted'
      })
    }

    // update fields
    session.date = req.body.date
    session.subject = req.body.subject
    session.topic = req.body.topic
    session.attempted = req.body.attempted
    session.correct = req.body.correct
    session.struggles = req.body.struggles
    session.whatWorked = req.body.whatWorked
    session.nextStep = req.body.nextStep
    session.mood = req.body.mood
    session.notes = req.body.notes
    session.meal = req.body.meal
    session.portion = req.body.portion
    session.activity = req.body.activity
    session.interaction = req.body.interaction
    session.behaviour = req.body.behaviour
    session.socialNotes = req.body.socialNotes
    session.photos = req.body.photos || []

    await session.save()
    // when session was edited -> saved AI summary is outdated -> delete 
    await Handover.deleteMany({ childId: session.childId })

    return res.json(session)

  } catch (error) {
    return res.status(500).json({
      message: 'Failed to edit session'
    })
  }
})

// DELETE /sessions/:id
router.delete('/:id', requireRole('volunteer', 'teacher'), async (req, res) => { 
  // only volunteers and coordinators can delete session
    try {
    const session = await Session.findById(req.params.id)

    // check if session exists
    if (!session) {
      return res.status(404).json({
        message: 'Session not found'
      })
    }

    // check if user is coordinator or owner of session
    if (req.user.role !== 'teacher' && session.volunteerId !== req.user.id) {
      // coordinators can delete all sessions
      // volunteers can only delete their own sessions
      return res.status(403).json({
        message: 'No access'
      })
    }

    await session.deleteOne()
    // session was deleted -> the saved AI summary is out of date, delete it
    await Handover.deleteMany({ childId: session.childId })

    return res.json({
      message: 'Session deleted successfully'
    })
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to delete session'
    })
  }
})

export default router