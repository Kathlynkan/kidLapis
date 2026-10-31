// =============================================================
// /handover  - AI handover summary (EXTERNAL API)   Owner: Yuqi
// -------------------------------------------------------------
// The Vue page calls OUR server, and our server calls Gemini.
// This keeps the API key secret (never put API keys in Vue code!).
//
// Vue (axios) --POST /handover/:childId--> Express --axios--> Gemini API
//
// 2 types of summary (body.type):
//   'handover' - for VOLUNTEERS: note for the next session, from the last 5 sessions (default)
//   'weekly'   - for PARENTS: Monday to Friday, learning + social.
//                Fri-Sun shows this week, Mon-Thu shows last week.
//                Different volunteers write brief or detailed notes, so the AI combines them into one balanced picture of the week.
// =============================================================
import { Router } from 'express'
import axios from 'axios'
import { Child, Session, Handover } from '../models/index.js'
import { requireAuth } from '../middleware/auth.js'
import { canAccessChild } from '../utils/access.js'

const router = Router()
router.use(requireAuth) 

// Which Monday to Friday should the weekly summary cover?
// Fri, Sat, Sun -> this week (the week is finished)
// Mon to Thu    -> last week (this week is not finished yet)
export function getWeekRange(today = new Date()) {
  const day = today.getDay() // get today's day 0 = Sun, 1 = Mon

  // find how many days back is this wk mon
  let daysBack = day - 1
  if (day === 0) { // yest was sun whr 0 = Sun
    daysBack = 6 // Sunday was 6 days ago
  }

  // Mon to Thu: go back one more week
  if (day >= 1 && day <= 4) {
    daysBack = daysBack + 7
  }

  const monday = new Date(today)
  monday.setDate(today.getDate() - daysBack)

  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)

  // 'YYYY-MM-DD' to be displayed for each summary
  return {
    start: monday.toISOString().slice(0, 10),
    end: friday.toISOString().slice(0, 10),
  }
}

// Find struggles that appear 2 or more times in the last 5 sessions
export function findRecurring(sessions) {
  const counts = {} // e.g. { 'Mixed numbers': 1, 'Finding common denominators': 2 }

  // only look at the newest 5 sessions
  const lastFive = sessions.slice(0, 5)
  for (const session of lastFive) {
    for (const struggle of session.struggles) {
      if (counts[struggle]) {
        counts[struggle] = counts[struggle] + 1 // seen before -> add 1
      } else {
        counts[struggle] = 1 // first time -> start at 1
      }
    }
  }
  // keep the ones that appeared more than once
  const recurring = []
  for (const struggle in counts) {
    if (counts[struggle] > 1) {
      recurring.push(struggle)
    }
  }
  return recurring
}

// Backup summary: used when there is no API key or Gemini fails.
// It just copies from the newest session.
export function buildFallbackHandover(sessions, audience = 'volunteer') {
  // child has no sessions yet (friendlier message for parents)
  if (sessions.length === 0 && audience === 'parent') {
    return {
      continueTopic: 'No sessions yet',
      struggle: '-',
      whatWorked: '-',
      lastResult: '-',
      nextStep: 'The volunteer will meet your child soon and find out what they enjoy and need help with.',
      recurring: [],
      source: 'fallback',
    }
  }
  // child has no sessions yet (for volunteer)
  if (sessions.length === 0) {
    return {
      continueTopic: 'No sessions yet',
      struggle: '-',
      whatWorked: '-',
      lastResult: '-',
      nextStep: 'Get to know the child and find out what they are working on.',
      recurring: [],
      source: 'fallback',
    }
  }
  const last = sessions[0] // newest session (sessions are sorted newest first)

  // parents get a simple version: "6 out of 8 right", and nothing alarming   (Kat)
  if (audience === 'parent') {
    let tricky = 'Nothing in particular - it went smoothly.'
    if (last.struggles.length > 0) {
      tricky = last.struggles.join(', ')
    }
    // mention mood gently if the last session was tired or frustrated
    if (last.mood === 'tired') {
      tricky = tricky === 'Nothing in particular - it went smoothly.'
        ? 'Seemed a bit tired in this session.'
        : `${tricky} (seemed a bit tired)`
    } else if (last.mood === 'frustrated') {
      tricky = tricky === 'Nothing in particular - it went smoothly.'
        ? 'Found this session a bit frustrating.'
        : `${tricky} (seemed frustrated)`
    }
    let helped = 'The volunteer is still finding out what works best.'
    if (last.whatWorked) {
      helped = last.whatWorked
    }
    let comingUp = 'The volunteer will decide next time.'
    if (last.nextStep) {
      comingUp = last.nextStep
    }
    return {
      continueTopic: `${last.subject}: ${last.topic}`,
      struggle: tricky,
      whatWorked: helped,
      lastResult: `Got ${last.correct} out of ${last.attempted} right`,
      nextStep: comingUp,
      recurring: findRecurring(sessions),
      source: 'fallback',
    }
  }

  let struggle = 'None noted'
  if (last.struggles.length > 0) {
    struggle = last.struggles.join(', ') 
  }

  let whatWorked = 'Not recorded'
  if (last.whatWorked) {
    whatWorked = last.whatWorked
  }

  let nextStep = 'Not recorded'
  if (last.nextStep) {
    nextStep = last.nextStep
  }

  return {
    continueTopic: `${last.subject}: ${last.topic}`,
    struggle: struggle,
    whatWorked: whatWorked,
    lastResult: `${last.correct}/${last.attempted} correct`,
    nextStep: nextStep,
    recurring: findRecurring(sessions),
    source: 'fallback',
  }
}

// for parent 
// Backup for the weekly summary (no API key, or Gemini fails)
export function buildWeeklyFallback(sessions) {
  if (sessions.length === 0) {
    return { headline: 'No sessions were recorded that week.', source: 'fallback' }
  }

  const last = sessions[0] // newest session
  return {
    headline: `Came in ${sessions.length} time(s) that week.`,
    learning: `Latest: ${last.subject} - ${last.topic}, got ${last.correct} out of ${last.attempted} right.`,
    source: 'fallback',
  }
}

// Turn one session into one line of text for the prompt (academic + social)
function describeSession(s) {
  let line = ''
  const date = new Date(s.date).toDateString() // e.g. 'Fri Sep 25 2026'

  let struggles = 'none'
  if (s.struggles.length > 0) {
    struggles = s.struggles.join(', ')
  }

  let whatWorked = 'not recorded'
  if (s.whatWorked) {
    whatWorked = s.whatWorked
  }

  let nextStep = 'not recorded'
  if (s.nextStep) {
    nextStep = s.nextStep
  }

  line = line + `- ${date}: ${s.subject} - ${s.topic}. `
  line = line + `Score ${s.correct}/${s.attempted}. `
  line = line + `Mood: ${s.mood || 'not recorded'}. `
  line = line + `Struggled with: ${struggles}. `
  line = line + `What worked: ${whatWorked}. `
  line = line + `Next step planned: ${nextStep}. `
  if (s.notes) line = line + `Notes: ${s.notes}. `

  // social part (all optional)
  if (s.meal) line = line + `Meal: ${s.meal}. `
  if (s.portion) line = line + `Portion eaten: ${s.portion}. `
  if (s.activity && s.activity.length > 0) line = line + `Activities: ${s.activity}. `
  if (s.interaction) line = line + `Peer interaction: ${s.interaction}. `
  if (s.behaviour) line = line + `Positive behaviour: ${s.behaviour}. `
  if (s.socialNotes) line = line + `Social note: ${s.socialNotes}. `
  return line + '\n'
}

// Write the message (prompt) send to Gemini
// lastWeek = last week's sessions (weekly only), so the AI can compare the two weeks
function buildPrompt(child, sessions, audience, type, lastWeek = []) {
  // 1. turn the sessions into simple lines of text
  //    handover: the newest 5 sessions. weekly: every session of the week.
  let list = sessions.slice(0, 5)
  if (type === 'weekly') {
    list = sessions
  }
  let notes = ''
  for (const s of list) {
    notes = notes + describeSession(s)
  }

  // 2. struggles that keep coming back 
  let recurringText = 'none'
  const recurring = findRecurring(sessions)
  if (recurring.length > 0) {
    recurringText = recurring.join(', ')
  }

  // 3. how to write prompt: volunteer (teaching notes) or parent (friendly update)
  let style = ''
  if (audience === 'parent') {
    style = `You are writing for the child's PARENT, not a teacher.
Write short, warm, plain sentences. No jargon or abbreviations.
Say "got 6 out of 8 right" instead of "6/8 correct". Say "a bit tricky" instead of "struggled".
Be kind and honest. Mention one thing the child did well.
If the child's mood was tired or frustrated in several recent sessions, mention this gently (e.g. "seemed a bit tired lately, and found X tricky"). If the mood was happy or okay, you can note positive engagement. Do not overinterpret a single session.
If activity or peer interaction data is present, weave it naturally into the summary (e.g. "enjoyed board games with friends" or "worked well in a group"). If no social data is recorded, focus on the academic summary only.`
  } else {
    style = `You are writing for the NEXT VOLUNTEER, who has never met this child.
Be practical and specific, like a short note from one tutor to another.`
  }

  // 4. what to write: different for each type
  let task = ''
  if (type === 'weekly') {
    // which days the child came, oldest first, e.g. 'Mon, Tue, Thu'
    const days = []
    for (const sess of [...sessions].reverse()) {
      const day = new Date(sess.date).toDateString().slice(0, 3) // e.g. 'Mon'
      if (!days.includes(day)) {
        days.push(day)
      }
    }

    // last week's notes, so the AI can say what changed
    let lastWeekNotes = 'No sessions last week, so do not compare with last week.'
    if (lastWeek.length > 0) {
      lastWeekNotes = ''
      for (const sess of lastWeek) {
        lastWeekNotes = lastWeekNotes + describeSession(sess)
      }
    }

    task = `Write a WEEKLY update for the child's parent, from the student care team ("we" means the team).
This week the child came ${sessions.length} time(s), on: ${days.join(', ')}.

LAST WEEK's notes (only to compare, do not summarise them):
${lastWeekNotes}

Rules:
- Be honest about how much happened. If the child came only once, talk about that day ("On Tuesday, ..."), not "a wonderful week".
- Compare with last week when you can (e.g. "more settled than last week", "fractions went from 2 to 4 out of 5 right").
- Be specific: use real facts from the notes (scores, activities, what helped, what they ate).
- Warm and reassuring, like a friendly teacher. A short word of encouragement is fine when a fact supports it (e.g. "a big improvement, well done!"). No empty praise like "great energy" or "wonderful week".
- Use the child's first name once or twice in total, not in every line.
- Never repeat the same fact in two fields.
- Only name a friend if their name is written in the notes.
- Only mention food if a meal or portion is recorded.

Fields:
- "headline": how the week went in one sentence, including how many times the child came.
- "learning": what they worked on, their scores and what helped.
- "friends": who they played with, what they did and how they got along. Mention any change across the days.
- "worthKnowing": anything the parent should gently know (tired, quieter, ate little, found something hard), said in a reassuring way. Use "" if there is nothing.
- "celebrate": one specific proud moment.
- "atHome": one simple thing to do at home linked to this week: a question to ask, or a fun way to practise.
- Each field: one or two sentences, under 35 words. Use "" if there is no information.
- Only use facts from the notes. Do not make anything up.

Reply ONLY with JSON in exactly this shape:
{"headline":"","learning":"","friends":"","worthKnowing":"","celebrate":"","atHome":""}`
  } else {
    task = `Rules:
- Look at ALL the sessions above, not just the newest one.
- "continueTopic": the topic to work on next session.
- "struggle": the main difficulty. If it happened before, say so and whether it is getting better or worse.
- "whatWorked": the teaching method that helped most. Say if it worked more than once.
- "lastResult": the latest score. If there is an earlier score on the same topic, compare them (e.g. "4/6, up from 3/6").
- "nextStep": one concrete thing to do next session, using what worked before.
- Each field: one sentence, under 25 words.
- Only use facts from the notes. Do not make anything up.

Reply ONLY with JSON in exactly this shape:
{"continueTopic":"","struggle":"","whatWorked":"","lastResult":"","nextStep":""}`
  }

  // 5. put it all together (whole prompt)
  return `You help a student-care centre keep track of each child's learning AND social life.
${style}

Child: ${child.name}, ${child.level}.

Session notes${type === 'weekly' ? ' for THIS WEEK' : ''} (newest first):
${notes}
Struggles that came up more than once: ${recurringText}.

${task}`
}


// Send the prompt to Gemini and get the answer back as an object.
// Returns null if there is no key or the answer is not valid JSON.
async function callLLM(prompt) {
  const key = process.env.GEMINI_API_KEY 
  if (!key) {
    return null // no key -> router uses the fallback
  }

  let model = 'gemini-3.5-flash-lite'
  if (process.env.GEMINI_MODEL) {
    model = process.env.GEMINI_MODEL
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  // what we send to Gemini (this shape is required by Google)
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' }, // ask for JSON back
  }

  // the key goes in a header (like "Authorization: Bearer token" in our Vue pages)
  const config = {
    headers: { 'x-goog-api-key': key },
  }

  const response = await axios.post(url, body, config)

  // Gemini's answer text is deep inside the response
  let text = response.data.candidates[0].content.parts[0].text

  // sometimes the AI wraps the JSON in ```json ... ``` -> remove it
  text = text.replaceAll('```json', '')
  text = text.replaceAll('```', '')
  text = text.trim()

  // turn the text into an object. If the text is broken, use the fallback.
  try {
    const result = JSON.parse(text)
    return result
  } catch (err) {
    console.error('Gemini did not return valid JSON:', text)
    return null
  }
}


// POST /handover/:childId
// body: { audience: 'volunteer' or 'parent', type: 'handover' or 'weekly' }
router.post('/:childId', async (req, res) => {
  // get the child from MongoDB
  const child = await Child.findById(req.params.childId)

  if (!canAccessChild(req.user, child)) {
    return res.status(403).json({ message: 'You do not have access to this child.' })
  }

  // get the child's sessions, newest first, at most 20
  const allSessions = await Session.find({ childId: child.id }).sort({ date: -1 }).limit(20)

  // who is the summary for? (default: volunteer)
  let audience = 'volunteer'
  if (req.body && req.body.audience) {
    audience = req.body.audience
  }

  // which summary? (default: handover)
  let type = 'handover'
  if (req.body && req.body.type === 'weekly') {
    type = 'weekly'
  }

  // pick the sessions this summary is about
  let sessions = allSessions
  let lastWeek = [] // weekly only: the week before, to compare with
  let periodLabel = '' // shown on the card
  if (type === 'weekly') {
    // the sessions between Monday and Friday
    const week = getWeekRange()
    sessions = allSessions.filter((s) => s.date >= week.start && s.date <= week.end)
    periodLabel = `${week.start} to ${week.end}`

    // the Monday to Friday before that (7 days earlier)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const before = getWeekRange(sevenDaysAgo)
    lastWeek = allSessions.filter((s) => s.date >= before.start && s.date <= before.end)
  }

  // no sessions -> nothing for the AI to read, send the backup (saves API calls)
  if (sessions.length === 0) {
    let empty = buildWeeklyFallback(sessions)
    if (type === 'handover') {
      empty = buildFallbackHandover(sessions, audience)
    }
    empty.recurring = findRecurring(allSessions) // struggles from the last 5 sessions
    empty.periodLabel = periodLabel
    return res.json(empty)
  }

  // if a session is added or deleted, this changes -> the saved summary is out of date
  // (if a session is edited, the IDs stay the same, so sessions.js deletes the saved summary)  
  const ids = []
  for (const s of sessions.slice(0, 5)) {
    ids.push(s.id)
  }
  const sessionsKey = type + ':' + ids.join(',') // e.g. 'weekly:s_3,s_2'

  // 1. use the saved summary if it is still up to date (no Gemini call)
  const saved = await Handover.findOne({ childId: child.id, audience: audience, type: type })
  if (saved && saved.sessionsKey === sessionsKey) {
    const result = saved.summary
    result.cached = true // so we can tell it came from the database
    return res.json(result)
  }

  // 2. otherwise ask Gemini
  try {
    const prompt = buildPrompt(child, sessions, audience, type, lastWeek)
    const ai = await callLLM(prompt)

    if (ai) {
      // add our own fields to the AI answer
      ai.recurring = findRecurring(allSessions) // struggles from the last 5 sessions
      ai.source = 'ai'
      ai.periodLabel = periodLabel

      // save it for next time (update the old one, or create it if there is none yet)
      await Handover.findOneAndUpdate(
        { childId: child.id, audience: audience, type: type },
        { sessionsKey: sessionsKey, summary: ai, createdAt: new Date().toISOString() },
        { upsert: true },
      )
      return res.json(ai)
    }
  } catch (error) {
    console.error('Gemini call failed, using fallback:', error.message)
  }

  // 3. Gemini didn't work -> send the backup summary (not saved, so we try Gemini again next time)
  let fallback = buildWeeklyFallback(sessions)
  if (type === 'handover') {
    fallback = buildFallbackHandover(sessions, audience)
  }
  fallback.recurring = findRecurring(allSessions) // struggles from the last 5 sessions
  fallback.periodLabel = periodLabel
  res.json(fallback)
})

export default router