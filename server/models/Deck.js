import mongoose from 'mongoose'
import { newId, jsonOptions } from './helpers.js'

const deckSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => newId('d') },
    title: { type: String, required: true, trim: true }, // e.g. "7 times table"
    subject: String, // e.g. "Math"
    description: String, // what the child is asked to do, e.g. "Answer the questions about the 7 times table."
    questions: [{ text: String, answer: String, _id: false }], // every question has its right answer
  },
  { toJSON: jsonOptions },
)

export default mongoose.model('Deck', deckSchema)
