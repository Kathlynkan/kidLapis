# Kids Lapis — Student Care Development & Progress Tracking

IS216 Web Application Development II — Group Project

Parents whose children attend student care centres often have limited visibility into what actually happens during each session. The volunteers who work with children hold valuable observations — what the child is working on, how they are feeling, what approaches help — but this information rarely reaches parents in any useful form. Kids Lapis collects structured observations from volunteers and turns them into a clear, regularly-updated picture of each child's development that parents can actually read and act on.

**Core flow:** Volunteer records session (academic progress, mood, struggles, what worked) → App stores history → Gemini AI summarises it in plain language → Parent sees a personalised update, charts, and mood timeline → Next volunteer is briefed and continues without losing context

> 👉 **Team members: read [WORKLOAD.md](WORKLOAD.md) first.** It says who owns what. Then read [CONTRIBUTING.md](CONTRIBUTING.md) for the git workflow.

- **Deployed app:** _TODO (Kai Sen)_
- **Video:** _TODO_
- **Git repo:** _TODO (must be public)_

---

## Tech stack

| Layer | Tech (as taught in class) |
|---|---|
| Frontend | Vue 3 (`<script setup>`, Composition API), Vue Router, Pinia, Vite, pnpm |
| Styling | Bootstrap 5 + Bootstrap Icons + our own `assets/main.css` design tokens |
| HTTP | Axios (one shared instance in `src/services/api.js`) |
| Backend | Node.js + Express (REST API, same style as the Week 5 blog service) |
| Data store | MongoDB Atlas via Mongoose (models in `server/models/`). Demo data is loaded from `server/data/seed.json` with `pnpm seed`. |
| External API | Google Gemini API (LLM handover and parent summaries), called from the server so the API key stays secret |
| Charts | Chart.js + vue-chartjs |
| Testing | Playwright (end-to-end, desktop + iPhone 6 viewport), Vitest (unit) |

---

## Set up and run (local)

**You need:** Node.js **22.12 or newer** (`node -v`) and pnpm (`npm install -g pnpm`).

Use **two terminals**: one for the API, one for the Vue app.

### Step 0 — MongoDB Atlas (one-time)

The team shares **one free Atlas cluster**, but each member uses **their own database name** for development.
That way `pnpm seed` and the E2E tests (which reset the data) don't wipe each other's work.

**Kai Sen does this once for the team:**
1. Create a free **M0** cluster at https://cloud.mongodb.com. This is the same flow as `mongodb_guide.pptx` from class.
2. **Database Access** → add a database user (username + password). One shared user for the team is fine.
3. **Network Access** → *Add IP Address* → *Allow access from anywhere* (`0.0.0.0/0`). This is needed for the deployed server on Render, and for teammates on different Wi-Fi.
4. **Connect → Drivers** → copy the connection string. Send it to the team **privately**, not in the repo.

**Everyone:** put the string in `server/config.env` as `DB=...`.
- Replace `<password>`.
- Add your own database name after `.net/`, e.g. `...mongodb.net/kidslapis_yuqi?retryWrites=true&w=majority`.

MongoDB creates the database the first time you run `pnpm seed`.

### Terminal 1 — API server (http://localhost:8000)

```bash
cd server
pnpm install
cp config.env.example config.env     # Windows: copy config.env.example config.env
#  -> edit config.env and set DB=... (Step 0)
pnpm seed                            # loads the demo data into YOUR database
pnpm dev
```

You should see `Connected to MongoDB database "kidslapis_<yourname>"`. Run `pnpm seed` again any time to reset the demo data.

To look at the data, use **Atlas → Browse Collections** or **MongoDB Compass**: `users`, `children`, `sessions`, `homeworks`, `messages`, `handovers`, `decks`.

To turn on the AI summary, paste a free Gemini key into `server/config.env` (`GEMINI_API_KEY=...`, get one at https://aistudio.google.com/apikey). Without a key the app still works: it falls back to a rule-based summary.

### Terminal 2 — Vue app (http://localhost:5173)

```bash
cd client
pnpm install
pnpm dev
```

Open http://localhost:5173. The URL with `/__devtools__/` opens Vue DevTools.

### Demo accounts (password for all: `password123`)

| Role | Email | Notes |
|---|---|---|
| Volunteer | `volunteer@kidslapis.sg` | Aisha — assigned to Ethan, Arjun, Chloe |
| Volunteer | `volunteer2@kidslapis.sg` | Daniel — Ethan, Meera, Ryan |
| Volunteer | `volunteer3@kidslapis.sg` | Priya — Arjun |
| Coordinator | `coordinator@kidslapis.sg` | Sees the whole centre |
| Parent | `parent@kidslapis.sg` | Ms Grace — parent of Ethan **and** Mia |
| Parent | `parent2@kidslapis.sg` | Ravi — parent of Meera **and** Arjun |
| Child | `child@kidslapis.sg` | Ethan |
| Child | `child2@kidslapis.sg` | Meera |

The demo data is built to trigger interesting cases:

- Ethan's fractions improve from 1/5 to 4/5, but "common denominators" keeps coming back as a recurring struggle.
- Ethan's mood has varied — parents can see the emotional trend alongside the academic one.
- Chloe has had no session for 11 days — triggers a coordinator alert.
- Sofia has no volunteer assigned — triggers an "unassigned child" alert.
- Chloe also has overdue homework.

---

## Testing

```bash
cd client
pnpm test:unit                         # Vitest unit + component tests (src/tests/<parent|child|volunteer|coordinator|shared>)
pnpm exec playwright install chromium  # first time only
pnpm test:e2e                          # Playwright E2E - starts API + Vue for you, re-seeds YOUR database
pnpm exec playwright show-report       # open the HTML report
```

The first line is only needed the first time. Playwright starts the server and the website by itself. Each test runs twice, once on a desktop screen and once on an iPhone 6 sized screen.

To run one file:
```
pnpm exec playwright test e2e/volunteer-handover.spec.js
```

### Test files

Each of us wrote our own tests: 1 unit test, 2 component tests and 2 E2E tests.

**Yuqi**
- Unit: `server/tests/handover.test.js` checks `checkMood`, the mood note for volunteers based on the last 3 sessions
- Component: `client/src/__tests__/volunteer/HandoverCard.spec.js` checks the summary card for volunteers and parents, including the week buttons
- Component: `client/src/__tests__/volunteer/ChildCard.spec.js` checks a child's card on the volunteer home page
- E2E: `client/e2e/volunteer-handover.spec.js` checks that a volunteer can search for a child and read the handover notes
- E2E: `client/e2e/coordinator-overview.spec.js` checks that a coordinator sees a child's overview, without the handover or edit buttons

**Jachin**
- Unit: `client/src/__tests__/child/gamification.spec.js` checks the badge and level rules
- Component: `client/src/__tests__/volunteer/HomeworkQuestCard.spec.js` checks the quest card buttons for children and volunteers
- Component: `client/src/__tests__/child/ChildAvatar.spec.js` checks the child's avatar (photo, emoji or empty)
- E2E: `client/e2e/child.spec.js` checks that a child can submit a quest and a volunteer can verify it
- E2E: `client/e2e/leaderboard.spec.js` checks the leaderboard order, the "You" label and the link back home

**Kai Sen**
- Unit: `client/src/__tests__/shared/validation.spec.js` checks `isValidChildCode`, the 6-character code a parent uses to link to their child
- Component: `client/src/__tests__/shared/LoginView.spec.js` checks the Show / Hide password button and the link to sign up
- Component: `client/src/__tests__/shared/SignupView.spec.js` checks that the form changes with the role (skills for volunteers, child code for parents) and shows errors when empty
- E2E: `client/e2e/auth.spec.js` checks that a wrong password shows an error
- E2E: `client/e2e/auth.spec.js` checks that a parent who opens `/coordinator` is sent back to their own page

**Kathlyn**
- Unit: `client/src/__tests__/parent/parentHelpers.spec.js` checks the parent page can always display what the child did at the student care
- Component: `client/src/__tests__/parent/ParentSocialDay.spec.js` checks that the parent sees what the volunteer recorded
- Component: `client/src/__tests__/parent/ChatThread.spec.js` checks the chat bubbles in Messages are displayed correctly 
- E2E: `client/e2e/messages.spec.js` checks that the bell notifies messages sent between parent and coordinator and that each child has a separate chat 
- E2E: `client/e2e/parent-viewed.spec.js` checks that one the parent views the page, the volunteer is unable to edit the session 

**Ning Xuan**
- Unit:
- Component:
- Component:
- E2E:
- E2E:

**Yu Xuan**
- Unit: server/tests/matchmaking.test.js checks the child being matched doesn't count towards workload
- Component: client/src/components/__tests__/WeekdayDots.spec.js checks five red days and 0/5 with no sessions
- Component: client/src/components/__tests__/MiniAvatar.spec.js checks it shows a photo when the avatar is a file path, the emoji when it's an emoji, the first letter of the name when there is no avatar, and that it uses the size it is given
- E2E: client/e2e/coordinator.spec.js checks Children, Volunteer, and Sessions week tiles appear
- E2E: client/e2e/schedule.spec.js checks that volunteer booking logic works, all volunteers appear, can't overbook, and pending requests

## Folders

```
kidLapis/
  server/          Express API
    routes/        one file per feature
    models/        Mongoose schemas
    data/          demo data (seed.json)
    tests/         server tests
  client/          Vue app
    e2e/           Playwright tests
    src/views/     pages, one folder per role
    src/components/  reusable components
    src/__tests__/   unit and component tests
```
