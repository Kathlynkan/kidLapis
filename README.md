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
| Teacher | `teacher@kidslapis.sg` | Sees the whole centre |
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
pnpm test:unit                         # Vitest unit tests (src/**/__tests__)
pnpm exec playwright install chromium  # first time only
pnpm test:e2e                          # Playwright E2E - starts API + Vue for you, re-seeds YOUR database
pnpm exec playwright show-report       # open the HTML report
```

The E2E tests run on two projects: **Desktop Chrome** and **iPhone 6** (responsive check). They use `data-test="..."` attributes as stable selectors.

| Spec | Covers | Owner |
|---|---|---|
| `e2e/auth.spec.js` | Landing page, login for all 4 roles, wrong password, route guards, sign-up (new volunteer, validation errors, duplicate email) | Kai Sen |
| `e2e/volunteer.spec.js` | Assigned children only, handover + history on profile, open/submit session form, assign homework | Yuqi / Ning Xuan / Jachin |
| `e2e/child.spec.js` | Child quests (submit, verify, API failure), leaderboard (loads, tab switch) | Jachin |
| `e2e/parent.spec.js` | Parent home: greeting, child info, handover card, recurring badge, session timeline with mood labels, SkillProgressChart, child switcher, switching children | Jachin |
| `e2e/teacher.spec.js` | Dashboard KPI cards, alerts table + type filter, follow-up toggle, unassigned alert → matchmaking, matchmaking suggestions, manage children, manage volunteers | Yu Xuan |
| `e2e/messages.spec.js` | Parent child list, chat thread visible, switch child, send message + real-time delivery, teacher sees same thread | Kat |

---

## Project structure

```
kids-lapis/
├── WORKLOAD.md            <- who does what
├── CONTRIBUTING.md        <- git workflow
├── server/                <- Express API (port 8000)
│   ├── server.js          <- mounts all routes
│   ├── config.env.example <- copy to config.env (git-ignored)
│   ├── middleware/auth.js <- requireAuth, requireRole
│   ├── models/            <- Mongoose schemas: User, Child, Session, Homework, Message, Handover, Deck
│   ├── utils/db.js        <- MongoDB connection (DB= in config.env)
│   ├── utils/seed.js      <- `pnpm seed`: reset your database with the demo data
│   ├── utils/access.js    <- who can see which child (+ the same rule as a Mongo filter)
│   ├── data/seed.json     <- demo data
│   └── routes/            <- one file per feature, each with an owner + TODO list
└── client/                <- Vue 3 + Vite app (port 5173)
    ├── e2e/               <- Playwright tests
    └── src/
        ├── main.js        <- Bootstrap, Pinia, Router
        ├── App.vue        <- NavBar + <RouterView />
        ├── router/        <- all routes + role guard
        ├── stores/auth.js <- logged-in user (Pinia + sessionStorage)
        ├── services/api.js<- shared axios instance (adds the token)
        ├── utils/         <- format, constants, gamification (+ unit tests)
        ├── components/    <- reusable pieces (cards, charts, chat...)
        └── views/         <- one folder per role: auth, volunteer, parent, child, coordinator, shared
```

---

## API reference

All routes except `/auth/signup` and `/auth/login` need `Authorization: Bearer <token>`. The client adds it automatically.

| Method & path | What it does | Status | Owner |
|---|---|---|---|
| `POST /auth/signup`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` | Accounts | ✅ done | Kai Sen |
| `GET /children`, `GET /children/:id` | Children visible to me | ✅ done | Kai Sen |
| `POST / PUT / DELETE /children` | Manage children | ✅ done | Kai Sen |
| `GET /users?role=volunteer`, `GET /users/:id`, `PUT /users/:id` | Volunteers & profiles | ✅ done | Yu Xuan |
| `GET /sessions?childId=`, `GET /sessions/:id` | Session history | ✅ done | Ning Xuan |
| `POST / PUT / DELETE /sessions` | Record / edit / delete | ✅ done | Ning Xuan |
| `GET /homework?childId=` | Homework list | ✅ done | Ning Xuan |
| `POST /homework` | Assign homework (with optional question deck) | ✅ done | Ning Xuan / Jachin |
| `PUT /homework/:id/submit`, `PUT /homework/:id/verify` | Child submits; volunteer verifies and awards stars | ✅ done | Jachin |
| `GET /homework/leaderboard` | Berry leaderboard (all-time + weekly) | ✅ done | Jachin |
| `GET /decks` | Question bank decks for homework | ✅ done | Jachin |
| `POST /handover/:childId` | AI summary (Gemini + fallback), audience: volunteer or parent | ✅ done | Yuqi |
| `GET /messages?childId=` | Conversation history | ✅ done | Kat |
| `POST /messages`, `PUT /messages/read`, `GET /messages/unread` | Send message, mark read, unread counts | ✅ done | Kat |
| `GET /dashboard/summary` | KPI numbers | ✅ done | Yu Xuan |
| `GET /dashboard/alerts` | Needs-attention list | ✅ done | Yu Xuan |
| `PUT /dashboard/follow-up/:childId` | Toggle follow-up flag | ✅ done | Yu Xuan |
| `GET /matchmaking/:childId`, `PUT /matchmaking/:childId/assign` | Skills-based volunteer matching | ✅ done | Yu Xuan |
| `GET /progress/:childId`, `GET /progress/overview` | Per-topic accuracy, trends, recurring struggles | ✅ done | Jachin |

---

## Third-party code & credits

Bootstrap, Bootstrap Icons, Vue, Vue Router, Pinia, Axios, Chart.js, vue-chartjs, Express, Mongoose, Playwright, Vitest (all free/open-source). Fonts: Nunito (Google Fonts); the child pages use Arial and Georgia. The child pages (stars, Bounty Board leaderboard) are a fan-inspired nod to the One Piece series and use only emoji and our own CSS, no original artwork. The project skeleton was generated with AI assistance as boilerplate starter code, which the module allows. Each feature is implemented by its owner as listed in WORKLOAD.md.
