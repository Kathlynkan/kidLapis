import mongoose from 'mongoose'
import { newId, jsonOptions } from './helpers.js'

const childSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => newId('c') },
    name: { type: String, required: true, trim: true },
    level: { type: String, required: true }, // P1 - P6
    school: String,
    parentId: String, // -> User (role parent)
    // Child code a parent types in at sign up to link to this child.
    // select: false = never sent to the browser unless a route asks for it (only coordinators see it).
    linkCode: { type: String, unique: true, sparse: true, select: false },
    volunteerIds: [String], // -> Users (role volunteer) assigned to this child
    // which day each volunteer sees this child
    // status: a new slot from matchmaking is 'pending' until the volunteer
    // accepts it (routes/requests.js). Declining removes the slot. Slots without a status
    // (seed data, older assignments) count as 'accepted'.
    // startDate: the first date of the sessions, set when the volunteer accepts
    // (the next time that weekday comes round). Empty = already running (seed data).
    schedule: [
      {
        _id: false,
        volunteerId: String,
        day: String,
        time: String,
        status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'accepted' },
        requestedAt: { type: Date, default: Date.now },
        startDate: { type: String, default: '' }, // for volunteer accept match
        // When the coordinator changes the day/time of an ACCEPTED session, it becomes a request again.
        // prevDay / prevTime / prevStartDate remember the old session: if the volunteer says no to the change,
        // the session goes back to the old day and time instead of being lost. 
        prevDay: { type: String, default: '' },
        prevTime: { type: String, default: '' },
        prevStartDate: { type: String, default: '' },
        // the change the volunteer said no to, e.g. 'Thu 15:00' (shown on their Requests page)
        declinedChange: { type: String, default: '' },
      },
    ],
    needs: [String], // skills the child needs help with (matchmaking)
    points: { type: Number, default: 0 }, // gamification
    avatar: { type: String, default: '🙂' },
    followUp: { type: Boolean, default: false }, // flagged by coordinator
  },
  { toJSON: jsonOptions },
)

export default mongoose.model('Child', childSchema)