// Users of every role: volunteer, coordinator, parent, child.   Owner: Kai Sen
import mongoose from 'mongoose'
import { newId, jsonOptions, nowIso } from './helpers.js'

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => newId('u') },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // bcrypt hash, never plain text (routes/auth.js)
    role: { type: String, required: true, enum: ['volunteer', 'coordinator', 'parent', 'child'] },
    skills: [String], // volunteers - used by matchmaking
    availability: [String], // volunteers - e.g. ['Mon', 'Wed']
    childId: String, // child accounts - which child profile this login belongs to
    gender: { type: String, enum: ['boy', 'girl'] }, // child accounts only — drives the colour theme
    avatar: String, // a photo like /photos/grace.jpg (a child's avatar is saved on the child, not here)
    createdAt: { type: String, default: nowIso },
  },
  { toJSON: jsonOptions },
)

export default mongoose.model('User', userSchema)
