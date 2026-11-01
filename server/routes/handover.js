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
//                If that week has no sessions, it shows the latest week that has some.
//                Different volunteers write brief or detailed notes, so the AI combines them into one balanced picture of the week.
// =============================================================
import { Router } from 'express'
import axios from 'axios'
import { Child, Session, Handover } from '../models/index.js'
import { requireAuth } from '../middleware/auth.js'
import { canAccessChild } from '../utils/access.js'

const router = Router()
router.use(requireAuth) 

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

// Count mood in the 3 newest sessions
// Always gives a short summary, good or bad, e.g.
//   'Tired in 2 of the last 3 sessions. Check in at the start and keep tasks short.'
//   'Was tired last session, so keep an eye on it.'
//   'Had one low day recently, but has been fine since.'
//   'Happy in the last 3 sessions.'
//   'Settled and in a good mood in the last 3 sessions.'
export function checkMood(sessions) {
  const lastThree = sessions.slice(0, 3)
  let tired = 0
  let frustrated = 0
  let happy = 0
  for (const s of lastThree) {
    if (s.mood === 'tired') tired = tired + 1
    if (s.mood === 'frustrated') frustrated = frustrated + 1
    if (s.mood === 'happy') happy = happy + 1
  }
  const low = tired + frustrated

  // 'the last session' or 'the last 3 sessions' (a new child may have fewer than 3)
  let period = `the last ${lastThree.length} sessions`
  if (lastThree.length === 1) period = 'the last session'

  // 2 or 3 low moods -> a pattern: tell the volunteer to pay more attention
  if (low >= 2) {
    let feeling = 'Tired or frustrated'
    if (frustrated === 0) feeling = 'Tired'
    if (tired === 0) feeling = 'Frustrated'
    return `${feeling} in ${low} of ${period}. Check in at the start and keep tasks short.`
  }

  // only 1 low mood
  if (low === 1) {
    const newest = lastThree[0]
    if (newest.mood === 'tired' || newest.mood === 'frustrated') {
      return `Was ${newest.mood} last session, so keep an eye on it.`
    }
    return 'Had one low day recently, but has been fine since.'
  }

  // no low moods
  if (happy === lastThree.length) {
    return `Happy in ${period}.`
  }
  return `Settled and in a good mood in ${period}.`
}

// A date as 'YYYY-MM-DD' in OUR time zone
// (toISOString() would use UTC, which is the day before in Singapore before 8am)
function toDateText(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

// The Monday to Friday of the week that a date is in
// e.g. getWeekOf(new Date('2026-10-28')) -> { start: '2026-10-26', end: '2026-10-30' }
export function getWeekOf(date) {
  const day = date.getDay() // 0 = Sun, 1 = Mon ... 6 = Sat
  let daysBack = day - 1 // how many days back to that week's Monday
  if (day === 0) {
    daysBack = 6 // Sunday: Monday was 6 days ago
  }
  const monday = new Date(date)
  monday.setDate(date.getDate() - daysBack)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  return { start: toDateText(monday), end: toDateText(friday) }
}

// Which Monday to Friday should the weekly summary cover?
// Fri, Sat, Sun -> this week (the week is finished)
// Mon to Thu    -> last week (this week is not finished yet)
export function getWeekRange(today = new Date()) {
  const day = today.getDay()
  if (day >= 1 && day <= 4) {
    const lastWeek = new Date(today)
    lastWeek.setDate(today.getDate() - 7)
    return getWeekOf(lastWeek)
  }
  return getWeekOf(today)
}

// The week written for people, e.g. 'Mon 26 Oct to Fri 30 Oct'
export function formatWeek(week) {
  const monday = new Date(week.start + 'T00:00:00')
  const friday = new Date(week.end + 'T00:00:00')
  const options = { weekday: 'short', day: 'numeric', month: 'short' }
  return `${monday.toLocaleDateString('en-GB', options)} to ${friday.toLocaleDateString('en-GB', options)}`
}

// Backup summary for VOLUNTEERS: used when there is no API key or Gemini fails.
// (Parents get the weekly summary, so their backup is buildWeeklyFallback below.)
// It uses the newest session, plus the mood of the last 3.
export function buildFallbackHandover(sessions) {
  // child has no sessions yet
  if (sessions.length === 0) {
    return {
      nextStep: 'No sessions yet. Get to know the child and find out what they are working on.',
      recurring: [],
      source: 'fallback',
    }
  }
  const last = sessions[0] // newest session (sessions are sorted newest first)

  let nextStep = `Carry on with ${last.subject} (${last.topic}).`
  if (last.nextStep) {
    nextStep = `${last.nextStep}.`
  }

  let struggle = 'Nothing stood out as tricky last session.'
  if (last.struggles.length > 0) {
    struggle = `Found ${last.struggles.join(' and ')} tricky last session.`
  }

  let whatWorked = 'Not recorded yet.'
  if (last.whatWorked) {
    whatWorked = `${last.whatWorked} helped last time.`
  }

  return {
    nextStep: nextStep,
    struggle: struggle,
    lastResult: `Got ${last.correct}/${last.attempted} on ${last.topic} last session.`,
    whatWorked: whatWorked,
    watchFor: checkMood(sessions),
    recurring: findRecurring(sessions),
    source: 'fallback',
  }
}

// for PARENTS: backup for the weekly summary (no API key, or Gemini fails)
// It goes through the week's sessions, oldest first, and fills the same lines as the AI.
export function buildWeeklyFallback(sessions) {
  if (sessions.length === 0) {
    return { headline: 'No sessions were recorded that week.', source: 'fallback' }
  }

  const days = [] // e.g. ['Mon', 'Wed']
  const learning = [] // e.g. ['Mon: Fractions, 4 out of 5 right']
  const friends = []
  const worth = []
  let celebrate = ''

  for (const s of [...sessions].reverse()) {
    const day = new Date(s.date + 'T00:00:00').toDateString().slice(0, 3) // 'Mon'
    if (!days.includes(day)) {
      days.push(day)
    }
    learning.push(`${day}: ${s.topic}, ${s.correct} out of ${s.attempted} right`)
    if (s.socialNotes) {
      friends.push(`${day}: ${s.socialNotes}`)
    }
    if (s.mood === 'tired') {
      worth.push(`seemed a bit tired on ${day}`)
    }
    if (s.mood === 'frustrated') {
      worth.push(`found ${day} a bit hard`)
    }
    if (s.portion === 'Little' || s.portion === 'None') {
      worth.push(`did not eat much on ${day}`)
    }
    if (!celebrate && s.behaviour) {
      celebrate = `${s.behaviour}.`
    }
  }

  const last = sessions[0] // newest session
  let worthKnowing = ''
  if (worth.length > 0) {
    worthKnowing = `Your child ${worth.join(', and ')}.`
  }
  let atHome = ''
  if (last.nextStep) {
    atHome = `Practise together: ${last.nextStep}.`
  }

  return {
    headline: `Came in on ${days.length} day(s) that week (${days.join(', ')}).`,
    learning: learning.join('. ') + '.',
    friends: friends.join(' '),
    worthKnowing: worthKnowing,
    celebrate: celebrate,
    atHome: atHome,
    source: 'fallback',
  }
}

// Turn one session into one line of text for the prompt (academic + social)
function describeSession(s) {
  let line = ''
  const date = new Date(s.date + 'T00:00:00').toDateString() // e.g. 'Fri Sep 25 2026'

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
// lastWeek = the week before (weekly only), so the AI can compare the two weeks
// weekWords = 'this week', 'last week' or 'the week of Mon 19 Oct to Fri 23 Oct' (weekly only)
function buildPrompt(child, sessions, audience, type, lastWeek = [], weekWords = 'this week') {
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
      const day = new Date(sess.date + 'T00:00:00').toDateString().slice(0, 3) // e.g. 'Mon'
      if (!days.includes(day)) {
        days.push(day)
      }
    }

    // last week's notes, so the AI can say what changed
    let lastWeekNotes = 'No sessions the week before, so do not compare.'
    if (lastWeek.length > 0) {
      lastWeekNotes = ''
      for (const sess of lastWeek) {
        lastWeekNotes = lastWeekNotes + describeSession(sess)
      }
    }

    task = `Write a WEEKLY update for the child's parent about ${weekWords}, from the student care team ("we" means the team).
Call it "${weekWords}" in your sentences (the parent may be reading it a few days later).
In ${weekWords} the child came ${sessions.length} time(s), on: ${days.join(', ')}.

Notes from THE WEEK BEFORE (only to compare, do not summarise them):
${lastWeekNotes}

Rules:
- Be honest about how much happened. If the child came only once, talk about that day ("On Tuesday, ..."), not "a wonderful week".
- Compare with the week before when you can (e.g. "more settled than the week before", "fractions went from 2 to 4 out of 5 right").
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
    task = `Write a handover note for a volunteer who has NEVER taught this child, as if YOU are the volunteer who taught them before.
It is read top to bottom: WHAT to teach next -> WHY -> PROGRESS so far -> WHAT HELPS -> how to handle their MOOD.

MOOD CHECK (already counted by our system and shown to the volunteer): ${checkMood(sessions)}

How to write:
- Write like a friendly fellow volunteer giving advice: full, natural sentences that flow. Use the child's first name now and then.
- No semicolons, no lists, no labels like "Fractions:" at the start. No dates like "Oct 29" (say "last session" or "on Thursday").
- Be insightful: explain what the scores and notes MEAN for the next volunteer, not just what happened.
- Each field adds NEW information. Do not repeat a topic, method or score in two fields.
- Each field: one or two sentences, under 35 words.
- Only use facts from the notes. Do not make anything up.

Fields:
- "nextStep": what to teach next and how to run it. If the child scored 80% or more on a topic in the last two tries,
  move on to the next harder step instead of more of the same. Mention a second subject that needs work, if there is one.
- "struggle": why: the difficulty behind this choice, how often it came up in the sessions above, and whether it is getting better.
  Always name the "struggles that came up more than once" listed above, because the volunteer will not see them anywhere else.
  Mention the child's attitude if the notes show it (e.g. keeps trying, gets upset after mistakes).
- "lastResult": progress: the latest score written like "4/5", compared with earlier scores on the same topic.
- "whatWorked": the teaching methods that helped and why they work for this child, plus anything they enjoy that could be used as a reward.
- "watchFor": one practical tip for handling the MOOD CHECK above, based on the notes (e.g. what helped when they were tired or upset).
  Do not repeat the mood facts. Only give a tip if the MOOD CHECK mentions tired or frustrated, otherwise use "".

STYLE EXAMPLE (a different child, only to show the tone, do NOT copy any facts from it):
{"nextStep":"Go over the silent-letter words from her list again, then test her on five new ones. If there is time, start her on double consonants.",
 "struggle":"Silent letters came up in 3 of the last 5 sessions, but she is getting more of them right each time and never gives up.",
 "lastResult":"Steady progress, from 5/10 to 8/10 on spelling over the last few weeks.",
 "whatWorked":"Making up silly sentences for each word helps her remember them. She loves drawing, so a few minutes of it works well as a reward.",
 "watchFor":"Give her a short break between activities and she settles back in quickly."}

Reply ONLY with JSON in exactly this shape:
{"nextStep":"","struggle":"","lastResult":"","whatWorked":"","watchFor":""}`
  }

  // 5. put it all together (whole prompt)
  return `You help a student-care centre keep track of each child's learning AND social life.
${style}

Child: ${child.name}, ${child.level}.

Session notes${type === 'weekly' ? ' for ' + weekWords.toUpperCase() : ''} (newest first):
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
  let periodLabel = '' // weekly only: shown on the card, e.g. 'Mon 26 Oct to Fri 30 Oct'
  let weekTitle = '' // weekly only: 'This week', 'Last week' or 'Latest week'
  let weekWords = 'this week' // weekly only: how the AI should call the week
  if (type === 'weekly') {
    // Fri - Sun: this week. Mon - Thu: last week.
    let week = getWeekRange()
    weekTitle = 'This week'
    const today = new Date().getDay()
    if (today >= 1 && today <= 4) {
      weekTitle = 'Last week'
    }
    sessions = allSessions.filter((s) => s.date >= week.start && s.date <= week.end)

    // nothing that week (e.g. a school holiday) -> use the latest week that has sessions
    if (sessions.length === 0 && allSessions.length > 0) {
      week = getWeekOf(new Date(allSessions[0].date + 'T00:00:00'))
      weekTitle = 'Latest week'
      sessions = allSessions.filter((s) => s.date >= week.start && s.date <= week.end)
    }
    periodLabel = formatWeek(week)
    weekWords = weekTitle.toLowerCase()
    if (weekTitle === 'Latest week') {
      weekWords = `the week of ${periodLabel}`
    }

    // the Monday to Friday before that week, to compare with
    const weekBefore = new Date(week.start + 'T00:00:00')
    weekBefore.setDate(weekBefore.getDate() - 7)
    const before = getWeekOf(weekBefore)
    lastWeek = allSessions.filter((s) => s.date >= before.start && s.date <= before.end)
  }

  // no sessions -> nothing for the AI to read, send the backup (saves API calls)
  if (sessions.length === 0) {
    let empty = buildWeeklyFallback(sessions)
    if (type === 'handover') {
      empty = buildFallbackHandover(sessions)
    }
    empty.recurring = findRecurring(allSessions) // struggles from the last 5 sessions
    empty.periodLabel = periodLabel
    empty.weekTitle = weekTitle
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
    // the same week can be "This week" on Friday and "Last week" on Monday, so set these again
    result.periodLabel = periodLabel
    result.weekTitle = weekTitle
    return res.json(result)
  }

  // 2. otherwise ask Gemini
  try {
    const prompt = buildPrompt(child, sessions, audience, type, lastWeek, weekWords)
    const ai = await callLLM(prompt)

    if (ai) {
      // add own fields to the AI answer
      ai.recurring = findRecurring(allSessions) 
      ai.source = 'ai'
      ai.periodLabel = periodLabel
      ai.weekTitle = weekTitle
      // volunteer handover
      if (type === 'handover' && audience === 'volunteer') {
        // no semicolons: turn "a; b" into "a, b" (in case the AI still uses them)
        for (const key of ['nextStep', 'struggle', 'lastResult', 'whatWorked', 'watchFor']) {
          if (ai[key]) {
            ai[key] = ai[key].replaceAll(';', ',')
          }
        }
        // the mood fact comes from checkMood + AI's tip
        let tip = ''
        if (ai.watchFor) {
          tip = ' ' + ai.watchFor
        }
        ai.watchFor = checkMood(sessions) + tip
      }

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
    fallback = buildFallbackHandover(sessions)
  }
  fallback.recurring = findRecurring(allSessions) 
  fallback.periodLabel = periodLabel
  fallback.weekTitle = weekTitle
  res.json(fallback)
})

export default router