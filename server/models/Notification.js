import mongoose from 'mongoose'
import { newId, jsonOptions, nowIso } from './helpers.js'

const notificationSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => newId('n') },
    userId: { type: String, required: true, index: true }, // who sees it
    text: { type: String, required: true },
    icon: { type: String, default: 'bi-info-circle' }, // a Bootstrap icon name
    link: String, // where clicking it goes, e.g. '/coordinator/schedule'
    createdAt: { type: String, default: nowIso },
    readAt: String, // set when the user opens their bell
  },
  { toJSON: jsonOptions },
)

export default mongoose.model('Notification', notificationSchema)
