// =============================================================
// MongoDB connection (Mongoose)          Owner: Kai Sen
// -------------------------------------------------------------
// The connection string comes from server/config.env:
//   DB=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/kidslapis_<yourname>?retryWrites=true&w=majority
//
// Each member should use THEIR OWN database name (the part after .net/)
// so that `pnpm seed` and the E2E tests don't wipe each other's data.
// =============================================================
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import dns from 'node:dns'

// load server/config.env no matter which folder the command is run from
dotenv.config({ path: fileURLToPath(new URL('../config.env', import.meta.url)), quiet: true })

// Optional: some networks (e.g. phone hotspots) give Node a bad DNS answer for the mongodb+srv:// lookup.
// Put DNS_SERVERS=8.8.8.8,8.8.4.4 in your own config.env to use Google's DNS instead. Left out = no change.
if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(','))
}

export async function connectDb() {
  const uri = process.env.DB
  if (!uri) {
    console.error('\n❌ No database connection string.')
    console.error('   Copy server/config.env.example to server/config.env and set DB=... (see README)\n')
    process.exit(1)
  }
  try {
    await mongoose.connect(uri)
    console.log(`Connected to MongoDB database "${mongoose.connection.name}"`)
  } catch (error) {
    console.error('\n❌ Could not connect to MongoDB:', error.message)
    console.error('   Check your username/password in DB=..., and that Network Access in Atlas allows your IP.\n')
    process.exit(1)
  }
}

export async function disconnectDb() {
  await mongoose.disconnect()
}
