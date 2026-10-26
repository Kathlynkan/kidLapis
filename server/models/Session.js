// One tutoring session record - the core of the app.   Owner: Ning Xuan
import mongoose from 'mongoose'
import { newId, jsonOptions } from './helpers.js'

const sessionSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => newId('s') },
    childId: { type: String, required: true, index: true },
    volunteerId: { type: String, required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    subject: { type: String, required: true },
    topic: { type: String, required: true, trim: true },
    attempted: { type: Number, default: 0, min: 0 },
    correct: { type: Number, default: 0, min: 0 },
    struggles: [String],
    whatWorked: String,
    nextStep: String,
    mood: { type: String, enum: ['happy', 'okay', 'tired', 'frustrated'], default: 'okay' },
    notes: String,
    meal: String,
    portion: String,
    activity: [String],
    interaction: String,
    behaviour: String,
    socialNotes: String,
    photos: [{type: String}]
  },
  { toJSON: jsonOptions },
)

export default mongoose.model('Session', sessionSchema)