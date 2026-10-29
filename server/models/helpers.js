// Shared bits for every Mongoose model.
import crypto from 'node:crypto'

// Short readable ids like "s_3f9a1c2b" instead of Mongo's default ObjectId.
// This keeps the demo ids from seed.json (c_1, u_vol1, ...) working in the
// Vue app and the E2E tests (e.g. /children/c_1).
export function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(4).toString('hex')}`
}

// Child codes like "K7P3QX" that the centre gives to a parent, so they can link their
// account to their child when they sign up. No 0/O or 1/I, so they are easy to read out.
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function newLinkCode() {
  let code = ''
  for (let i = 0; i < 6; i++) code += CODE_LETTERS[crypto.randomInt(CODE_LETTERS.length)]
  return code
}

// What the client receives when a document is sent with res.json(doc):
//   _id  -> id        (the Vue code uses `.id` everywhere)
//   __v and password are removed
export const jsonOptions = {
  versionKey: false,
  transform(doc, ret) {
    ret.id = ret._id
    delete ret._id
    delete ret.password
    return ret
  },
}

// Dates are stored as ISO strings ("2026-10-06" or "2026-10-06T09:40:00.000Z")
// so they sort correctly and look the same as before in the client.
export const nowIso = () => new Date().toISOString()
