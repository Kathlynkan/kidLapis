// =============================================================
// /handover  - AI handover summary (EXTERNAL API)   Owner: Yuqi
// -------------------------------------------------------------
// The Vue page calls OUR server, and our server calls Gemini.
// This keeps the API key secret (never put API keys in Vue code!).
//
// Vue (axios) --POST /handover/:childId--> Express --axios--> Gemini API
//
// 2 types of summary, picked by the role of the logged-in user:
//   'handover' - for VOLUNTEERS: note for the next session, from the last 5 sessions (default)
//   'weekly'   - for PARENTS: Monday to Friday, learning + social.
//                Fri-Sun shows this week, Mon-Thu shows last week.
//                If that week has no sessions, it shows the latest week that has some.
//                The parent can step back through the last 8 weeks that have sessions
//                (POST body { week: '2026-10-19' }). Each week is saved once, so going back is free.
//                Different volunteers write brief or detailed notes, so the AI combines them into one balanced picture of the week.
// =============================================================
import { Router } from 'express'
import axios from 'axios'
import { Child, Session, Handover } from '../models/index.js'
import { requireAuth } from '../middleware/auth.js'
import { canAccessChild } from '../utils/access.js'
import { toDateText, formatStart } from '../utils/startDate.js'

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

// Count mood in the 3 newest sessions (mood change fast so 3 is enough)
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
  if (lastThree.length === 1) {
    period = 'the last session'
  }

  // 2 or 3 low moods -> tell the volunteer to pay more attention
  if (low >= 2) {
    let feeling = 'Tired or frustrated' // mix of both
    if (frustrated === 0){
      feeling = 'Tired'
    }
    if (tired === 0) {
      feeling = 'Frustrated'
    }
    return `${feeling} in ${low} of ${period}. Check in at the start and keep tasks short.`
  }

  // only 1 low mood
  if (low === 1) {
    const newest = lastThree[0]
    if (newest.mood === 'tired' || newest.mood === 'frustrated') {
      return `Was ${newest.mood} last session, so keep an eye on it.`
    }
    return 'Had one low day recently, but has been fine since.' //low mood not for latest session
  }

  // no low moods
  if (happy === lastThree.length) {
    return `Happy in ${period}.`
  }
  return `Settled and in a good mood in ${period}.`
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

// format the week nicely in summary 'Mon 26 Oct to Fri 30 Oct'
export function formatWeek(week) {
  const monday = new Date(week.start + 'T00:00:00')
  const friday = new Date(week.end + 'T00:00:00')
  const options = { weekday: 'short', day: 'numeric', month: 'short' }
  return `${monday.toLocaleDateString('en-GB', options)} to ${friday.toLocaleDateString('en-GB', options)}`
}

// The weeks that have sessions, newest first, at most 8 summaries
export const MAX_WEEKS = 8
export function listWeeks(sessions) {
  const weeks = []
  for (const s of sessions) {
    const week = getWeekOf(new Date(s.date + 'T00:00:00'))
    const already = weeks.some((w) => w.start === week.start)
    if (!already) {
      weeks.push(week)
    }
    if (weeks.length === MAX_WEEKS) break
  }
  return weeks
}

// The title of a week, counted back from today:
// 'This week', 'Last week', '2 weeks ago', '3 weeks ago' ...
export function weekTitleFor(week, today = new Date()) {
  const thisMonday = getWeekOf(today).start
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000
  const weeksBack = Math.round((Date.parse(thisMonday) - Date.parse(week.start)) / WEEK_MS)
  if (weeksBack <= 0) return 'This week'
  if (weeksBack === 1) return 'Last week'
  return `${weeksBack} weeks ago`
}

// -------- Backup summary for VOLUNTEERS -------- 
export function buildFallbackHandover(sessions) {
  // child has no sessions yet
  if (sessions.length === 0) {
    return {
      nextStep: 'No sessions yet. Get to know the child and find out what they are working on.',
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
    source: 'fallback',
  }
}

// -------- Backup summary for PARENTS -------- 
export function buildWeeklyFallback(sessions, name = 'Your child') {
  if (sessions.length === 0) {
    return { headline: 'No sessions were recorded that week.', source: 'fallback' }
  }

  const learning = [] // e.g. ['fractions (4 out of 5 right)']
  const friends = []
  const worth = []
  let lowMood = 0 // how many sessions were tired or frustrated
  let celebrate = ''

  for (const s of [...sessions].reverse()) {
    const day = new Date(s.date + 'T00:00:00').toDateString().slice(0, 3) // 'Mon'
    const topic = s.topic.toLowerCase()
    if (!learning.includes(`${topic} (${s.correct} out of ${s.attempted} right)`)) {
      learning.push(`${topic} (${s.correct} out of ${s.attempted} right)`)
    }
    if (s.socialNotes) {
      friends.push(s.socialNotes)
    }
    if (s.mood === 'tired' || s.mood === 'frustrated') {
      lowMood = lowMood + 1
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

  // the big picture, from the mood of the week
  let headline = `${name} has been happy and settled with us.`
  if (lowMood > 0) {
    headline = `${name} had a good week overall, with a few tired or tricky moments.`
  }
  if (lowMood > sessions.length / 2) {
    headline = `${name} seemed tired for much of the week, so a bit of extra rest may help.`
  }

  let worthKnowing = ''
  if (worth.length > 0) {
    worthKnowing = `${name} ${worth.join(', and ')}.`
  }

  const last = sessions[0] // newest session
  let atHome = `Ask ${name} to show you what they learned about ${last.topic.toLowerCase()}.`
  if (last.whatWorked) {
    atHome = `Ask ${name} to show you how ${last.whatWorked.toLowerCase()} helped with ${last.topic.toLowerCase()}.`
  }

  return {
    headline: headline,
    learning: `${name} worked on ${learning.join(', ')}.`,
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

  // 2. struggles that keep coming back (volunteers only: parents get a positive picture of the week)
  let recurringLine = ''
  if (audience !== 'parent') {
    let recurringText = 'none'
    const recurring = findRecurring(sessions)
    if (recurring.length > 0) {
      recurringText = recurring.join(', ')
    }
    recurringLine = `Struggles that came up more than once: ${recurringText}.`
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

    task = `Write a WEEKLY update about ${weekWords} for the child's PARENT, from the student care team ("we" means the team).
Imagine you are the parent: you want to know how your child is really doing, what they are proud of,
who their friends are, anything to keep an eye on, and something to talk about at the dinner table.
Call the week "${weekWords}" (the parent may read it a few days later).
The child came on: ${days.join(', ')}. Do NOT count the days or sessions in your answer, the parent does not need that.

Notes from THE WEEK BEFORE (only to compare, do not summarise them):
${lastWeekNotes}

How to write:
- Warm, natural sentences that flow, like a friendly teacher talking to a parent at pick-up. No lists, no semicolons.
- Insightful: say what the notes MEAN for the child (growing in confidence, settling in, making friends), not just what happened.
- Compare with the week before when it shows growth (e.g. "more settled than the week before", "fractions went from 3 to 4 out of 5 right").
- Use real facts from the notes. Only name a friend if their name is in the notes. Only mention food if a meal or portion is recorded.
- Honest and kind. Encouragement only when a fact supports it. No empty praise like "wonderful week".
- Do not worry the parent about schoolwork: no lists of weak topics and no "needs more practice". Talk about difficulties as progress (e.g. "is getting more confident with fractions").
- Use the child's first name once or twice in total, then "he" or "she" or the name again. Do not repeat a fact in two fields.
- Each field: one or two sentences, under 40 words. Use "" if there is no information.
- Only use facts from the notes. Do not make anything up.

Fields, in this order:
- "headline" (Overview): the big picture of how the child is doing, from their mood, learning and how they got along with others and the volunteers.
- "learning": what they worked on, how it is improving compared with before, and what helped them understand it.
- "friends": who they played with, what they did together, and what that shows about them (e.g. kind, a leader, more confident).
- "worthKnowing": anything the parent should gently know (tired, quieter, ate little, found something hard), with reassurance or what we did about it. Use "" if there is nothing.
- "celebrate" (Proud moment): one specific moment to be proud of, from learning or from how they treated others.
- "atHome" (Try at home): one dinner-table question or a small fun activity, linked to this week's learning or friends.

STYLE EXAMPLE (a different child, only to show the tone, do NOT copy any facts from it):
{"headline":"Mei has been cheerful and settled with us, and she is opening up more with the volunteers.",
 "learning":"Her spelling keeps getting stronger, from 5 to 8 out of 10 right, and making up silly sentences for tricky words is really helping her remember them.",
 "friends":"She spent most breaks drawing with Aisha and is starting to invite quieter children to join in.",
 "worthKnowing":"She was a little tired on Tuesday and only ate half her lunch, but she was back to herself by Thursday.",
 "celebrate":"She helped a younger child find their water bottle without being asked.",
 "atHome":"Ask Mei to teach you one of her silly spelling sentences, and see if you can make up one together."}

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
${recurringLine}

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
// No body needed: the summary type comes from the logged-in user's role (req.user.role)
router.post('/:childId', async (req, res) => {
  // get the child from MongoDB
  const child = await Child.findById(req.params.childId)

  if (!canAccessChild(req.user, child)) {
    return res.status(403).json({ message: 'You do not have access to this child.' })
  }

  // get the child's sessions, newest first, at most 60 (enough for 8 weeks)
  const allSessions = await Session.find({ childId: child.id }).sort({ date: -1 }).limit(60)

  // show summary depending on logged in user
  let audience = 'volunteer'
  let type = 'handover'
  if (req.user.role === 'parent') {
    audience = 'parent'
    type = 'weekly'
  }

  // pick the sessions this summary is about
  let sessions = allSessions
  let lastWeek = [] // weekly only: the week before, to compare with
  let periodLabel = '' // weekly only: shown on the card, e.g. 'Mon 26 Oct to Fri 30 Oct'
  let weekTitle = '' // weekly only: 'This week', 'Last week', '2 weeks ago' ...
  let weekWords = 'this week' // weekly only: how the AI should call the week
  let weeks = [] // weekly only: the weeks the parent can step through (the arrows on the card)
  let weekStart = '' // weekly only: the Monday of the week shown, e.g. '2026-10-26'
  let awayNote = '' // weekly only: e.g. 'No sessions since Wed 14 Oct. This is the last week Mia came.'
  if (type === 'weekly') {
    weeks = listWeeks(allSessions)

    // Fri - Sun: this week. Mon - Thu: last week
    const usualWeek = getWeekRange()
    let week = usualWeek

    // the parent pressed Earlier / Later week 
    let askedWeek = ''
    if (req.body && req.body.week) {
      askedWeek = String(req.body.week)
    }
    for (const w of weeks) {
      if (w.start === askedWeek) {
        week = w
      }
    }
    sessions = allSessions.filter((s) => s.date >= week.start && s.date <= week.end)

    // nothing that week (e.g. a school holiday) -> use the latest week that has sessions
    if (sessions.length === 0 && weeks.length > 0) {
      week = weeks[0]
      sessions = allSessions.filter((s) => s.date >= week.start && s.date <= week.end)
      // tell the parent why they see an older week
      if (week.start < usualWeek.start) {
        const firstName = child.name.split(' ')[0]
        awayNote = `No sessions since ${formatStart(allSessions[0].date)}. This is the last week ${firstName} came.`
      }
    }
    weekStart = week.start
    periodLabel = formatWeek(week)
    weekTitle = weekTitleFor(week) // 'This week', 'Last week', '2 weeks ago' ...
    weekWords = weekTitle.toLowerCase()
    if (weekTitle !== 'This week' && weekTitle !== 'Last week') {
      weekWords = `the week of ${periodLabel}` // e.g. 'the week of Mon 12 Oct to Fri 16 Oct'
    }

    // the Monday to Friday before that week, to compare with
    const weekBefore = new Date(week.start + 'T00:00:00')
    weekBefore.setDate(weekBefore.getDate() - 7)
    const before = getWeekOf(weekBefore)
    lastWeek = allSessions.filter((s) => s.date >= before.start && s.date <= before.end)
  }

  // the week facts the card needs (worked out above, never saved, so they are always up to date)
  function addWeekInfo(result) {
    result.periodLabel = periodLabel
    result.weekTitle = weekTitle
    result.weekStart = weekStart
    result.weeks = weeks.map((w) => w.start) // e.g. ['2026-10-26', '2026-10-19', ...] newest first
    result.awayNote = awayNote
    return result
  }

  // no sessions -> nothing for the AI to read, send the backup (saves API calls)
  if (sessions.length === 0) {
    let empty = buildWeeklyFallback(sessions, child.name.split(' ')[0])
    if (type === 'handover') {
      empty = buildFallbackHandover(sessions)
    }
    return res.json(addWeekInfo(empty))
  }

  // if a session is added or deleted, this changes -> the saved summary is out of date
  // (if a session is edited, the IDs stay the same, so sessions.js deletes the saved summary)  
  // handover: the newest 5 sessions. weekly: every session of that week.
  let keySessions = sessions.slice(0, 5)
  if (type === 'weekly') {
    keySessions = sessions
  }
  const ids = []
  for (const s of keySessions) {
    ids.push(s.id)
  }
  const sessionsKey = type + ':' + ids.join(',') // e.g. 'weekly:s_3,s_2'

  // one saved summary per week for parents ('2026-10-26'), one per child for volunteers ('')
  const savedFilter = { childId: child.id, audience: audience, type: type, week: weekStart }

  // 1. use the saved summary if it is still up to date (no Gemini call)
  const saved = await Handover.findOne(savedFilter)
  if (saved && saved.sessionsKey === sessionsKey) {
    const result = saved.summary
    // the same week can be "This week" on Friday and "Last week" on Monday, so set these again
    return res.json(addWeekInfo(result))
  }

  // 2. otherwise ask Gemini
  try {
    const prompt = buildPrompt(child, sessions, audience, type, lastWeek, weekWords)
    const ai = await callLLM(prompt)

    if (ai) {
      ai.source = 'ai'
      // volunteer handover
      if (type === 'handover') {
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
        savedFilter,
        { sessionsKey: sessionsKey, summary: ai, createdAt: new Date().toISOString() },
        { upsert: true },
      )
      return res.json(addWeekInfo(ai))
    }
  } catch (error) {
    console.error('Gemini call failed, using fallback:', error.message)
  }

  // 3. Gemini didn't work -> send the backup summary (not saved, so we try Gemini again next time)
  let fallback = buildWeeklyFallback(sessions, child.name.split(' ')[0])
  if (type === 'handover') {
    fallback = buildFallbackHandover(sessions)
  }
  res.json(addWeekInfo(fallback))
})

export default router