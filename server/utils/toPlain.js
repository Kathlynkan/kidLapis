export const toPlain = (doc) => ({ ...doc.toJSON(), id: doc.id })
