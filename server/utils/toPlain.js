// Mongoose keeps the id in _id. This gives the same { id, ... } shape the client and
// seed.json use, which is what the pure functions in utils/ expect.
export const toPlain = (doc) => ({ ...doc.toJSON(), id: doc.id })
