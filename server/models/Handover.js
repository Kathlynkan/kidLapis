// A saved AI handover, so we don't call Gemini every time a page opens.   Owner: Yuqi
// One saved summary per child, per audience ('volunteer' or 'parent'),
// per type ('handover' = next-session note, 'weekly' = Mon-Fri).
import mongoose from 'mongoose'
import { newId, jsonOptions } from './helpers.js'
 
const handoverSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => newId('h') },
    childId: { type: String, required: true, index: true },
    audience: { type: String, enum: ['volunteer', 'parent'], default: 'volunteer' },
    type: { type: String, enum: ['handover', 'weekly'], default: 'handover' },
    // if this changes (new session added / deleted), the summary is out of date
    sessionsKey: { type: String, default: '' },
    summary: { type: Object }, // the handover object Gemini returned
    createdAt: { type: String },
  },
  { toJSON: jsonOptions },
)

export default mongoose.model('Handover', handoverSchema)