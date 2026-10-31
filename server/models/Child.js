// A child enrolled at the centre.   Owner: Kai Sen (CRUD), Yu Xuan (followUp, volunteerIds)
import mongoose from 'mongoose'
import { newId, jsonOptions } from './helpers.js'

const childSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => newId('c') },
    name: { type: String, required: true, trim: true },
    level: { type: String, required: true }, // P1 - P6
    school: String,
    parentId: String, // -> User (role parent)
    // Child code a parent types in at sign up to link to this child (Kai Sen).
    // select: false = never sent to the browser unless a route asks for it (only teachers see it).
    linkCode: { type: String, unique: true, sparse: true, select: false },
    volunteerIds: [String], // -> Users (role volunteer) assigned to this child
    schedule: [{ _id: false, volunteerId: String, day: String, time: String }], // which day each volunteer sees this child (Yu Xuan)
    needs: [String], // skills the child needs help with (matchmaking)
    points: { type: Number, default: 0 }, // gamification (Jachin)
    avatar: { type: String, default: '🙂' },
    followUp: { type: Boolean, default: false }, // flagged by coordinator (Yu Xuan)
  },
  { toJSON: jsonOptions },
)

export default mongoose.model('Child', childSchema)
