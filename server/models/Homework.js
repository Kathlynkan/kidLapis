// Homework "quests".   Owners: Ning Xuan (assign), Jachin (submit / verify / points)
import mongoose from 'mongoose'
import { newId, jsonOptions } from './helpers.js'

const homeworkSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => newId('h') },
    childId: { type: String, required: true, index: true },
    volunteerId: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    subject: String,
    details: String,
    dueDate: { type: String, required: true }, // "YYYY-MM-DD"
    points: { type: Number, default: 10 },
    status: { type: String, enum: ['assigned', 'submitted', 'verified'], default: 'assigned' },
    completedAt: { type: String, default: null },
  },
  { toJSON: jsonOptions },
)

export default mongoose.model('Homework', homeworkSchema)
