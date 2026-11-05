import mongoose from 'mongoose'
import { newId, jsonOptions } from './helpers.js'
 
const handoverSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => newId('h') },
    childId: { type: String, required: true, index: true },
    audience: { type: String, enum: ['volunteer', 'parent'], default: 'volunteer' },
    type: { type: String, enum: ['handover', 'weekly'], default: 'handover' },
    // weekly only: the Monday of the week, e.g. '2026-10-26' (one saved summary per week). '' for volunteers.
    week: { type: String, default: '' },
    // if this changes (new session added / deleted), the summary is out of date
    sessionsKey: { type: String, default: '' },
    summary: { type: Object }, // the handover object Gemini returned
    createdAt: { type: String },
  },
  { toJSON: jsonOptions },
)

export default mongoose.model('Handover', handoverSchema)