// Chat messages between parents and teachers about one child.   Owner: Kat
import mongoose from 'mongoose'
import { newId, jsonOptions, nowIso } from './helpers.js'

const messageSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => newId('m') },
    childId: { type: String, required: true, index: true },
    fromId: { type: String, required: true },
    text: { type: String, required: true, trim: true },
    sentAt: { type: String, default: nowIso }, // sendAt is a field that the server adds to every message when the message is saved -> holds the time messages were sent 
    readBy: [String], // user ids who have read it
  },
  { toJSON: jsonOptions },
)

export default mongoose.model('Message', messageSchema)
