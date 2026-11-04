# Kids Lapis — Workload Split (6 members)

> **One-line pitch:** Kids Lapis gives parents clearer visibility into their child's development at student care by turning volunteer session notes into a personalised, regularly-updated picture — academic progress, mood, recurring struggles, and what approaches are helping.
>
> **Core flow:** Volunteer records session (academic progress, mood, struggles, what worked) → App stores history → Gemini AI summarises in plain language → Parent sees a personalised update, charts, and mood timeline → Next volunteer is briefed and continues without losing context

Each member owns **one vertical slice**: their screens (Vue views + components), their backend routes (Express), and their tests.
Owning the whole slice end to end means:

- Everyone writes frontend **and** backend code. The brief requires every member to code.
- Everyone can explain their own feature from button to database in the individual Q&A (20% of the final grade).
- Nobody is blocked waiting for someone else. The skeleton already has working `GET` routes and demo data for every feature.

---

## 1. Who does what (summary)

| # | Member | Module | Screens (views) they own | Backend they own | "Wow" feature for the demo |
|---|--------|--------|--------------------------|------------------|-----------------------------|
| 1 | **Yuqi** | Volunteer A: briefing & AI handover | My Children, Child Profile (pre-session briefing) | `routes/handover.js` | **External LLM API (Gemini)** writes the handover. This covers the required external API. |
| 2 | **Ning Xuan** | Volunteer B: session logging & homework | Record/Edit Session form, Session history, Give Homework form | `routes/sessions.js`, `POST /homework` | The full CRUD that feeds the whole app |
| 3 | **Kat** | Parent portal & messaging | Parent Home, Messages (shared by volunteers, parents and coordinators) | `routes/messages.js` | Parent sees "today at student care" + chats with the volunteer |
| 4 | **Kai Sen** | Coordinator A: accounts, children & deployment | Landing, Login, Sign up, NavBar (+ bell), Manage Children, Session requests | `routes/auth.js`, `routes/children.js`, `routes/requests.js`, `routes/notifications.js`, `middleware/auth.js` | Role-based access (4 roles) + live notifications (socket.io) + **deployment** |
| 5 | **Yu Xuan** | Coordinator B: dashboard, matchmaking & schedule | Coordinator Dashboard, Volunteers, Matchmaking, Schedule | `routes/dashboard.js`, `routes/matchmaking.js`, `routes/users.js` | "Needs attention" alerts + skills-based volunteer matching |
| 6 | **Jachin** | Data visualisation & child gamification | Charts (on 3 pages), Child Home (quests, badges, level), Leaderboard | `routes/progress.js`, `routes/decks.js`, homework submit/verify/leaderboard in `routes/homework.js` | Interactive question-answer homework quests + Chart.js progress charts + berry-based levels, badges, and leaderboard |

**What changed from your first split, and why**

- **Kat** keeps **Parent** and also gets **Messaging**. Parents and volunteers talking is one feature, so one person owns both ends.
- The **Child** screen moves from Kat to **Jachin**. The child page is mostly visual progress (berries, levels, badges), which fits data viz. Data viz alone was the lightest role.
- The two **volunteer** people split by *before the session* (Yuqi: read and brief) and *after the session* (Ning Xuan: record).
- The two **coordinator** people split by *setting up the centre* (Kai Sen: accounts and children) and *watching the centre* (Yu Xuan: dashboard and matching).
- **Kai Sen** also **deploys the app** on Render.

---

## 2. File ownership (every file in the repo)

Each person must be able to open their files and explain every line in the Q&A.
The homework route is split — see the callout at the bottom of this section.

### Kai Sen — Auth, Children, Platform infrastructure

| File | What it does |
|---|---|
| `client/src/views/HomeView.vue` | Landing page — how-it-works cards, role cards |
| `client/src/views/auth/LoginView.vue` | Login form, error handling, redirect by role |
| `client/src/views/auth/SignupView.vue` | Sign-up form — skills/days for volunteers, child code for parents |
| `client/src/views/coordinator/ManageChildrenView.vue` | Add/edit/delete child modal, child list |
| `client/src/views/NotFoundView.vue` | 404 page |
| `client/src/views/shared/ProfileView.vue` | Edit your own name/email/password/skills/avatar |
| `client/src/router/index.js` | All routes, `meta.roles`, `meta.guestOnly`, `beforeEach` guard |
| `client/src/stores/auth.js` | Pinia store — token + user in sessionStorage, login/logout/patchUser |
| `client/src/services/api.js` | Axios instance — base URL, auth header, 401 handler |
| `client/src/utils/validation.js` | `isValidEmail`, `isValidChildCode`, `validateSignup` — same rules as server |
| `client/src/__tests__/shared/validation.spec.js` | Unit test for `isValidChildCode` |
| `client/src/__tests__/shared/LoginView.spec.js` | Component test — show/hide password, link to sign up |
| `client/src/__tests__/shared/SignupView.spec.js` | Component test — fields change with the role, `?role=parent`, empty form errors |
| `client/src/views/volunteer/RequestsView.vue` | Volunteer accepts or declines new session requests |
| `client/src/main.js` | App bootstrap — Vue, Pinia, Router, 401 handler wired up |
| `client/src/App.vue` | Root shell — NavBar, `<RouterView>`, page-peel transition |
| `client/src/components/NavBar.vue` | Top nav bar — role-aware links, unread message badge, notification bell, log out |
| `client/src/components/PageHeader.vue` | Shared page title + subtitle + action-buttons slot |
| `client/src/components/StateMessage.vue` | Shared loading / error / empty state message |
| `client/src/components/ChildInitial.vue` | Round child picture — shows photo if available, else initial letter; used in NavBar and ProfileView |
| `server/routes/auth.js` | POST /auth/signup, POST /auth/login, POST /auth/logout — bcryptjs, token auth |
| `server/routes/children.js` | GET, POST, PUT, DELETE /children — coordinators manage child profiles |
| `server/middleware/auth.js` | `requireAuth` (verifies token), `requireRole` (checks user role) |
| `server/models/User.js` | Mongoose schema — email, password (hashed), role, skills, availability |
| `server/models/Child.js` | Mongoose schema — name, level, school, needs, volunteerIds, schedule, followUp |
| `server/models/index.js` | Re-exports all models from one import |
| `server/models/helpers.js` | Shared Mongoose utilities |
| `server/utils/access.js` | `canAccessChild`, `childFilterFor`, `visibleChildIds` — who can see which child |
| `server/utils/db.js` | MongoDB Atlas connection (loads `config.env`) |
| `server/utils/seed.js` | `pnpm seed` — wipes DB and loads `server/data/seed.json` |
| `server/utils/toPlain.js` | Helper to strip Mongoose document wrappers to plain objects |
| `server/routes/requests.js` | GET /requests, PUT /requests/:childId — volunteer accepts or declines a session |
| `server/routes/notifications.js` | GET /notifications, PUT /notifications/read — the bell's updates |
| `server/models/Notification.js` | Mongoose schema — one saved update for one user |
| `server/utils/notify.js` | Sends bell updates over socket.io (`notifyBell`, `notifyCoordinators`, `addUpdate`) |
| `server/server.js` | Express + socket.io app — CORS, JSON, login check on connect, rooms per user / role / child, mounts all routes |
| `server/config.env` | DB connection string + Gemini API key (not in git) |
| `server/data/seed.json` | Demo data — children, parents, volunteers, sessions, homework, messages |
| `client/src/__tests__/shared/auth.spec.js` | Unit tests for the auth Pinia store |
| `client/e2e/auth.spec.js` | E2E — login per role, wrong password, wrong-role redirect, sign-up flow, child code |
| `README.md`, `CONTRIBUTING.md`, `WORKLOAD.md` | Project docs, setup instructions, team split |
| `pnpm-workspace.yaml`, `client/vite.config.js`, `client/vitest.config.js`, `client/playwright.config.js` | Build, test, workspace config |

### Yuqi — Pre-session briefing & AI handover

| File | What it does |
|---|---|
| `client/src/views/volunteer/VolunteerHomeView.vue` | "My Children" home — week calendar strip, search/filter, needs-attention logic |
| `client/src/views/volunteer/ChildProfileView.vue` | Pre-session briefing — handover card, session history, charts, homework |
| `client/src/components/ChildCard.vue` | Child summary card — last session, needs-attention badge |
| `client/src/components/HandoverCard.vue` | AI summary card — collapsible peel, AI/fallback badge |
| `client/src/components/PeelCard.vue` | Reusable collapsible accordion (grid-template-rows animation) |
| `server/routes/handover.js` | POST /handover/:childId — calls Gemini, parses JSON, caches result, fallback |
| `server/models/Handover.js` | Mongoose schema — cached AI summary per child, `audience` field |
| `server/tests/handover.test.js` | Unit/integration tests for the handover route |
| `client/e2e/volunteer.spec.js` | E2E — handover shows, session history, recurring struggle badge |

### Ning Xuan — Session logging & homework assignment

| File | What it does |
|---|---|
| `client/src/views/volunteer/SessionFormView.vue` | Record + edit session — subject, topic, mood, struggles, scores, notes |
| `client/src/views/volunteer/HomeworkAssignView.vue` | Assign homework — title, subject, due date, points, deck picker |
| `client/src/components/SessionCard.vue` | One past session — expandable notes, edit/delete buttons, confirm modal |
| `server/routes/sessions.js` | Full CRUD for sessions — POST, GET, PUT, DELETE with role guards and validation |
| `server/routes/homework.js` *(shared — POST /homework + DELETE only)* | POST /homework (assign) + DELETE /homework/:id — Ning Xuan owns these endpoints |
| `server/models/Session.js` | Mongoose schema — childId, volunteerId, date, subject, topic, scores, struggles, mood |
| `server/models/Homework.js` | Mongoose schema — childId, title, status, points, dueDate, deckId, questions |

### Kat — Parent portal & messaging

| File | What it does |
|---|---|
| `client/src/views/parent/ParentHomeView.vue` | Parent home — child switcher, AI handover (parent-friendly), session timeline, homework status |
| `client/src/views/shared/MessagesView.vue` | Chat page — child sidebar, message thread, real-time via socket.io (marks read on open) |
| `client/src/components/ChatThread.vue` | Message list + send bar — emits `send`, auto-scrolls |
| `client/src/components/ParentSocialDay.vue` | One day entry in the parent's social/mood timeline |
| `server/routes/messages.js` | GET (with sender names), POST (emits socket event), PUT /read, GET /unread |
| `server/models/Message.js` | Mongoose schema — childId, fromId, text, sentAt, readBy array |
| `client/e2e/messages.spec.js` | E2E — child list, thread visible, switch child, send message, coordinator sees thread |
| `client/e2e/parent.spec.js` | E2E — parent greeting, child info, handover, mood timeline, child switcher |

### Yu Xuan — Coordinator dashboard & matchmaking

| File | What it does |
|---|---|
| `client/src/views/coordinator/CoordinatorDashboardView.vue` | KPI cards, alerts table, follow-up toggle, recent activity feed |
| `client/src/views/coordinator/ManageVolunteersView.vue` | Volunteer list — skills, availability, workload, edit |
| `client/src/views/coordinator/MatchmakingView.vue` | Pick a child → ranked volunteer suggestions → assign with day picker |
| `client/src/views/coordinator/ScheduleView.vue` | Weekly schedule view — which volunteer sees which child on which day |
| `server/routes/dashboard.js` | GET /dashboard/summary (KPIs), GET /dashboard/alerts, PUT /dashboard/follow-up/:childId |
| `server/routes/matchmaking.js` | GET /matchmaking/:childId (scored suggestions), PUT /matchmaking/:childId/assign |
| `server/routes/users.js` | GET /users (volunteer list), PUT /users/:id (edit skills/days) |
| `server/utils/alerts.js` | Pure alert rules — no-session-7d, recurring struggle, overdue homework, unassigned |
| `server/utils/matchmaking.js` | `scoreVolunteer`, `rankVolunteers` — pure scoring functions |
| `server/utils/schedule.js` | Schedule helper utilities |
| `server/tests/alerts.test.js` | Unit tests for each alert rule |
| `server/tests/matchmaking.test.js` | Unit tests for the scoring function |
| `server/tests/schedule.test.js` | Unit tests for schedule logic |
| `client/e2e/coordinator.spec.js` | E2E — dashboard KPI cards, alerts table + filter, follow-up toggle, matchmaking, manage children, manage volunteers |

### Jachin — Data visualisation & child gamification

| File | What it does |
|---|---|
| `client/src/views/child/ChildHomeView.vue` | 3-tab child home — Quests (submit/unsubmit, reject flow), Journal (streak, daily +5★, delete entry), Kueh Tin (badge shelf); hero with kueh lapis progress, weekly cheer count, badge-unlock animation |
| `client/src/views/child/LeaderboardView.vue` | Weekly leaderboard — podium top 3, rows 4+, anonymous 👏 cheer button (localStorage, once per day, disables self) |
| `client/src/components/charts/SkillProgressChart.vue` | Chart.js line chart — topic accuracy over sessions (used on 3 pages) |
| `client/src/components/charts/TopicSummaryChart.vue` | Chart.js horizontal bar — topics coloured needs-help/steady/strong |
| `client/src/components/HomeworkQuestCard.vue` | Quest card — "I'm done!" (child), undo, "Verify & give points" (volunteer), late-penalty label, reject flow |
| `client/src/components/ChildAvatar.vue` | Child avatar display — photo if path, emoji if text; used in leaderboard |
| `client/src/utils/gamification.js` | `levelFor(points)`, `earnedBadges(child, homework)` — 9 badges: 6 homework + 3 reflection (dear-diary, reflective, self-aware) |
| `client/src/__tests__/child/gamification.spec.js` | Unit tests for all 9 badge conditions and edge cases (31 tests) |
| `client/src/__tests__/volunteer/HomeworkQuestCard.spec.js` | Unit tests for quest card in child/volunteer mode — submit, verify, undo, busy state |
| `client/src/__tests__/child/ChildAvatar.spec.js` | Unit tests for avatar rendering (image path vs emoji vs empty) |
| `server/routes/progress.js` | GET /progress/:childId (per-topic accuracy + trend), GET /progress/overview |
| `server/routes/decks.js` | GET /decks — question banks for the homework deck picker |
| `server/routes/homework.js` *(shared — submit/verify/leaderboard only)* | PUT /homework/:id/submit (child), PUT /homework/:id/verify (awards points), GET /homework/leaderboard |
| `server/models/Deck.js` | Mongoose schema — question bank (title, subject, questions with answers) |
| `client/e2e/child.spec.js` | E2E — quest submit, volunteer verify (DB write), API failure state, badge shelf (Kueh Tin tab), leaderboard |

**Also modified (with teammates' knowledge):**

| File | Owner | What Jachin added |
|---|---|---|
| `server/models/Child.js` | Kai Sen | `interests [String]`, `journalEntries` subdocs, `cheersReceived` subdocs |
| `server/routes/children.js` | Kai Sen | `PUT /:id/interests`, `POST /:id/journal`, `DELETE /:id/journal/:entryId`, `POST /:id/cheer` |
| `server/routes/handover.js` | Yuqi | Updated `buildPrompt` to include child interests + 3 recent journal entries in the AI prompt |
| `client/src/views/shared/ProfileView.vue` | Kai Sen | Interests section — predefined category chip grid, child-safe (no free text) |
| `client/src/views/volunteer/ChildProfileView.vue` | Yuqi | "About [name]" PeelCard — interests as tag pills + 3 most recent journal quotes |
| `client/src/views/parent/ParentHomeView.vue` | Kat | Child voice row — interests list + latest journal entry shown to parent |

### Shared files — everyone can explain how it applies to their slice

| File | What it does |
|---|---|
| `client/src/utils/constants.js` | SUBJECTS, SKILL_OPTIONS, LEVELS, DAYS, MOODS, HOMEWORK_STATUS, INTEREST_OPTIONS (Jachin) |
| `client/src/utils/format.js` | `formatDate`, `accuracy`, `relativeDay`, `firstName`, `daysSince` |
| `client/src/__tests__/shared/format.spec.js` | Unit tests for format helpers |
| `server/data/seed.json` | Demo data — children with interests + journal entries (Jachin), sessions, homework, messages |

### The `homework.js` route split

Because this one file is shared, be precise about which endpoints you wrote:

```
server/routes/homework.js
├── POST   /homework              → Ning Xuan  (volunteer assigns)
├── GET    /homework              → shared     (filter by childId)
├── DELETE /homework/:id          → Ning Xuan
├── PUT    /homework/:id/submit   → Jachin     (child completes)
├── PUT    /homework/:id/verify   → Jachin     (volunteer verifies, awards berries)
└── GET    /homework/leaderboard  → Jachin
```

---

## 3. Detailed scope per member

Each section uses three priority levels:

- **Must (by Progress Pitch).** Something working end to end. The pitch rubric gives 25% to *"a functioning task – backend service / API call / CRUD"*.
- **Should (by final).** The full feature.
- **Stretch.** Only after everything else works.

Every page in the running app shows a yellow **"Owner / to build"** panel (`<TodoPanel>`) listing these items. **Delete all `<TodoPanel>` before submission.**

### 1) Yuqi — Volunteer A: Pre-session briefing & AI handover

**Files:** `views/volunteer/VolunteerHomeView.vue`, `views/volunteer/ChildProfileView.vue`, `components/ChildCard.vue`, `components/HandoverCard.vue`, `server/routes/handover.js`

| Priority | Task |
|---|---|
| ✅ Must | Gemini API call in `callLLM()` (server-side, key in `config.env`). Show the AI handover in `HandoverCard` with the "AI summary" badge. |
| ✅ Must | Safe fallback: if the API fails or there is no key, use `buildFallbackHandover()` (already written). |
| ✅ Should | Prompt design: last 5 sessions → JSON `{continueTopic, struggle, whatWorked, lastResult, nextStep}`. Parse safely. |
| ✅ Should | `audience: 'parent'` version in friendly, non-jargon wording (Kat uses this). |
| ✅ Should | Cache the summary per child until a new session is added. This saves quota, since graders test about 5–6 times a day. |
| ✅ Should | "At a glance" cards on the profile: recent topics, **recurring struggles**, best teaching methods. |
| ✅ Should | My Children: search, filter by level, sort by "longest since last session". |
| ✅ Stretch | "Today" strip showing who you are seeing today, based on volunteer availability. |

**Tests:** E2E `e2e/volunteer.spec.js` (handover shows, history shows, recurring badge). Unit: test the fallback/recurring-struggle logic.
**Q&A angle:** why the API is called from the server (key secrecy), async/await + try/catch, prompt design, fallback strategy.

### 2) Ning Xuan — Volunteer B: Session logging & homework

**Files:** `views/volunteer/SessionFormView.vue`, `views/volunteer/HomeworkAssignView.vue`, `components/SessionCard.vue`, `server/routes/sessions.js`, `POST /homework` in `server/routes/homework.js`

| Priority | Task |
|---|---|
| ✅ Must | `POST /sessions` + submit the form. After saving, go back to the child profile. The new session appears and the handover updates. |
| ✅ Should | Edit mode: `GET /sessions/:id` → pre-fill → `PUT /sessions/:id`. Delete with a confirm modal → `DELETE /sessions/:id`. |
| ✅ Should | Validation on client **and** server: topic required, `correct ≤ attempted`, date not in the future. Use Bootstrap `.is-invalid`. |
| ✅ Should | "Struggles" as tags: type + Enter to add, × to remove. Quick-pick chips from the child's previous struggles. |
| ✅ Should | `POST /homework` + Give Homework form (validation, due date, optional deck picker). |
| Stretch | Pre-fill the homework title from the latest session's "next step". |

**Tests:** E2E: record a session → it appears in history. Edit → changes. Delete → removed. Assign homework → it appears on the child's page. Unit: validation function.
**Q&A angle:** v-model modifiers (`.number`, `.trim`), computed validation, REST CRUD verbs, who is allowed to edit (server-side checks).

### 3) Kat — Parent portal & messaging

**Files:** `views/parent/ParentHomeView.vue`, `views/shared/MessagesView.vue`, `components/ChatThread.vue`, `server/routes/messages.js`

| Priority | Task |
|---|---|
| ⏳ Must | `POST /messages` + send from `ChatThread` (emit `send` → parent view posts → message appears). |
| ✅ Should | Parent home: child switcher (Ravi has 2 kids), "Today at student care" card (HandoverCard with `audience: 'parent'`), recent session timeline with mood, homework status. |
| ⏳ Should | Mark as read (`PUT /messages/read`) + unread counts (`GET /messages/unread`). Give counts to Kai Sen for the navbar badge. |
| ⏳ Should | Polling every 10 s with `setInterval`, cleared in `onUnmounted`. Auto-scroll to the newest message. |
| ⏳ Should | Mobile: show the child list **or** the chat, with a back button. |
| Stretch | Quick replies ("Thank you!", "Will remind them"), day separators ("Today", "Yesterday"). |

**Tests:** E2E: parent logs in → sees the latest session. Parent sends a message → volunteer sees it. Unit: group-messages-by-day helper.
**Q&A angle:** props/emit between `ChatThread` and the page, watchers on route params, polling vs. real-time trade-offs, privacy (children cannot see the chat).

### 4) Kai Sen — Accounts, children & deployment

**Files:** `views/HomeView.vue`, `views/auth/*`, `components/NavBar.vue`, `views/coordinator/ManageChildrenView.vue`, `views/volunteer/RequestsView.vue`, `router/index.js`, `stores/auth.js`, `server/routes/auth.js`, `server/routes/children.js`, `server/routes/requests.js`, `server/routes/notifications.js`, `server/middleware/auth.js`, `server/models/User.js`, `server/models/Child.js`, `server/models/Notification.js`, `server/utils/notify.js`, `server/utils/db.js`

| Priority | Task |
|---|---|
| ✅ Must | `POST /children` + "Add child" Bootstrap modal on Manage Children. |
| ✅ Should | `PUT` / `DELETE /children/:id`. Deleting a child also deletes their sessions, homework and messages. |
| ✅ Should | Hash passwords with `bcryptjs`. Better validation on sign up (email format, password ≥ 8, confirm password, skills/days for volunteers). |
| ✅ Should | Sign up extras: volunteers pick skills + days, parents enter a **child code** from the centre to link their child. |
| ✅ Should | Navbar unread-message badge (using Kat's endpoint). Landing page polish (sign-up / log-in button for each role). Removed the demo-account box (the accounts are in the README). |
| ✅ Must | **MongoDB Atlas setup** for the team: one free cluster, one database user, Network Access `0.0.0.0/0`. Share the connection string privately. Everyone uses their own database name for development (see README, Step 0). |
| ✅ Should | **Deployment:** API (Web Service) and Vue site (Static Site) hosted on Render, with `DB=` pointing at the shared database. |
| ✅ Stretch | **Notification bell** for every role, plus the **accept / decline** flow: the coordinator assigns a session, it stays "waiting" until the volunteer accepts it on the Requests page. Updates arrive instantly over socket.io. |
| Stretch | Swap the in-memory tokens for JWT, so logins survive server restarts on deployment. |

**Tests:** Unit `validation.spec.js` (`isValidChildCode`). Component `LoginView.spec.js`, `SignupView.spec.js`. E2E `e2e/auth.spec.js` (wrong password shows an error, a parent cannot open the coordinator dashboard, plus each role's landing page and sign-up).
**Q&A angle:** route guards with `meta.roles`, Pinia store + sessionStorage, Authorization header, why passwords are hashed, server-side role checks, child code, socket.io rooms, deploying on Render.

### 5) Yu Xuan — Coordinator dashboard & skills-based matchmaking

**Files:** `views/coordinator/CoordinatorDashboardView.vue`, `views/coordinator/ManageVolunteersView.vue`, `views/coordinator/MatchmakingView.vue`, `components/StatCard.vue`, `server/routes/dashboard.js`, `server/routes/matchmaking.js`, `server/routes/users.js`

| Priority | Task |
|---|---|
| ✅ Must | `GET /dashboard/alerts`: **no session in 7 days** (Chloe) and **unassigned child** (Sofia). Show in a "Needs attention" table. |
| ✅ Should | More alert rules: the same struggle in 3+ of the last 5 sessions (Ethan: common denominators), overdue homework. Severity colours + filter by type. Click a row to open the child. |
| ✅ Should | "Flag for follow-up" toggle per child (`child.followUp`). |
| ✅ Should | Matchmaking: `GET /matchmaking/:childId` → volunteers ranked by score (+2 per matched skill, +1 per shared day, −1 per child already assigned). Show *why* each one matches. `PUT …/assign` to assign or unassign. |
| Should | Volunteers page: edit skills/days with checkboxes → `PUT /users/:id`. Show each volunteer's workload. |
| Stretch | Recent-activity feed across the centre. Export the alert list (CSV). |

**Tests:** E2E: coordinator sees Chloe + Sofia in alerts. Assign a volunteer to Sofia → she disappears from the "unassigned" alerts. Unit: the scoring function + each alert rule (pure functions are easy to test).
**Q&A angle:** turning a business rule into code, computed filters, why scoring is on the server, how the coordinator's actions change what volunteers see.

### 6) Jachin — Data visualisation & child gamification

**Files:**
- `components/charts/SkillProgressChart.vue` — Chart.js line chart (topic accuracy over time)
- `components/charts/TopicSummaryChart.vue` — Bar chart coloured by status (needs help / steady / strong)
- `views/child/ChildHomeView.vue` — 3-tab child home: Quests, Journal, Kueh Tin; kueh lapis hero, badge-unlock overlay, toast notifications
- `views/child/LeaderboardView.vue` — Weekly leaderboard, podium, anonymous cheer button
- `components/HomeworkQuestCard.vue` — Quest card with submit, undo, verify, reject flow, late-penalty label
- `components/ChildAvatar.vue` — Avatar display (image path or emoji)
- `utils/gamification.js` — `levelFor()`, `earnedBadges()`, `badgeProgress()` — 9 badges (6 homework + 3 reflection)
- `server/models/Deck.js` — Question bank model
- `server/routes/decks.js` — `GET /decks`
- `server/routes/progress.js` — `GET /progress/:childId`, `GET /progress/overview`
- `server/routes/homework.js` — submit, verify, leaderboard endpoints
- *Also added to Kai Sen's `server/routes/children.js`*: journal CRUD, interests PUT, cheer POST
- *Also added to Kai Sen's `server/models/Child.js`*: interests, journalEntries, cheersReceived fields

| Priority | Task |
|---|---|
| ✅ Must | `SkillProgressChart`: Chart.js line chart showing topic accuracy over sessions. Used on Child Profile and Parent Home. |
| ✅ Should | `TopicSummaryChart`: bar chart coloured by trend (needs help / steady / strong). Used on Child Profile and Coordinator Dashboard. |
| ✅ Should | `GET /progress/:childId`: per-topic accuracy, trend, recurring struggles. `GET /progress/overview` for coordinator dashboard. |
| ✅ Should | Child "My Quests": `PUT /homework/:id/submit` (child), `PUT /homework/:id/verify` (volunteer awards points). Undo, reject/late-penalty flow. Toast notifications on points gained, quest returned, new quest. |
| ✅ Should | Levels + kueh lapis progress bar (`levelFor`), pending points preview, 9-badge Kueh Tin (`earnedBadges`) — locked badges greyed, badge-unlock celebration overlay, badge nudge in hero. |
| ✅ Should | Deck quiz system: `server/models/Deck.js` with 11 question banks. Homework form deck picker; questions copied into quest for interactive answering. |
| ✅ Stretch | Leaderboard — weekly stars, podium for top 3, rows for the rest, highlights logged-in child, anonymous 👏 cheer button (one per day, localStorage, no self-cheer). |
| ✅ Stretch | **Learning journal**: child writes daily reflections (`POST /children/:id/journal`), +5★ for first entry of the day (anti-spam), streak counter, delete entry. Journal tab on child home. |
| ✅ Stretch | **Interests**: predefined category chips on Profile page (`PUT /children/:id/interests`), shown on volunteer briefing page and parent home, feeds into Gemini AI prompt. |
| ✅ Stretch | **3 reflection badges**: `dear-diary` (first journal entry), `reflective` (3 different days), `self-aware` (3+ interests). |

**Tests:**
- `e2e/child.spec.js`: quest submit, volunteer verify (DB write), API failure state, Kueh Tin tab + badge names, leaderboard podium. ✅
- `src/__tests__/child/gamification.spec.js`: `levelFor()`, all 9 `earnedBadges()` conditions (31 tests). ✅
- `src/__tests__/volunteer/HomeworkQuestCard.spec.js`: child/volunteer modes, submit, verify, undo, busy state. ✅
- `src/__tests__/child/ChildAvatar.spec.js`: image path vs emoji vs empty. ✅
- `src/__tests__/shared/format.spec.js`: accuracy, daysSince, relativeDay, firstName. ✅

**Q&A angle:** computed properties to reshape data for charts, component props contract (`sessions` array in → chart rendered), deck quiz data flow, motivation design for kids (kueh lapis, badges), journal streak computed from a Set of dates, predefined interests for child safety (no free text), Handover cache invalidation when interests/journal change, localStorage for cheer state without a server round-trip.

---

## 4. Shared rules (everyone)

1. **Your own tests.** At least 2 Playwright E2E tests for your journey + 1 Vitest unit test. Use `data-test="..."` selectors, which the rubric calls "stable selectors". Testing is 10% of the grade.
2. **Your own responsive styling.** Check your pages at iPhone 6 (375 px) and Bootstrap XL in Chrome DevTools. Graders test exactly this range. Use the shared classes and colours in `assets/main.css` (`lapis-card`, `badge-soft`, `--lapis-primary`) so the app looks like one product.
3. **Loading / error / empty states** on every page that loads data: `<StateMessage>`.
4. **Don't break shared contracts.** These props are used by other people's pages:
   - `SkillProgressChart` / `TopicSummaryChart` take a `sessions` array.
   - `HandoverCard` takes a `handover` object.
   - `ChatThread` emits `send`.

   You may change the inside of a component, but not its props or emits without telling the group.
5. **Shared files** (`router/index.js`, `utils/constants.js`, `assets/main.css`, `server/data/seed.json`, `server/server.js`, `server/models/*`): keep the changes small and say in the group chat when you touch them.
6. **Individual write-up.** Each member writes up their own contribution. The panel uses it for Q&A.
7. **Video (≤ 12 min).** About 1.5 min per person demoing **their** slice in the order of the core flow: Kai Sen (log in, roles) → Yuqi (briefing + AI handover) → Ning Xuan (record session) → Jachin (charts + child quests) → Kat (parent + chat) → Yu Xuan (dashboard + matching). Then about 2 min on tech stack, API, data store and testing.

---

## 5. Timeline

| When | Milestone |
|---|---|
| **This week** | Everyone clones, runs the skeleton, logs in with each demo account and reads their own TodoPanels. Create your feature branch. |
| **Before Week 8 Sunday 22:00** | Every **Must** item works end to end on your branch and is merged into `main`. Progress report submitted. |
| **Week 9 Monday** | Progress Pitch. Each person demos their **Must** item. Rubric: problem/features, design/tech stack, task delegation (this document), a functioning task. |
| **Week 9–10** | **Should** items + your E2E/unit tests. |
| **Week 11** | Feature freeze mid-week. Styling/responsive pass, remove TodoPanels, deploy, full test run, record the video. |
| **Week 12 Friday 09:00** | Submit (zip: slides with video + app links, README, individual write-ups). **No extensions.** Aim to submit Thursday night. |

---

## 6. How the pieces depend on each other

```
Kai Sen (login, roles, children) ─┬─► everyone (you need to log in to see anything)
                                  └─► Yu Xuan (children + volunteers to match)
Ning Xuan (sessions) ─────────────┬─► Yuqi (handover is built from sessions)
                                  ├─► Jachin (charts are built from sessions)
                                  ├─► Kat (parent sees sessions)
                                  └─► Yu Xuan (alerts are built from sessions)
Ning Xuan (assign homework) ──────► Jachin (child completes) ──► Kat (parent sees status)
Yuqi (handover API) ──────────────► Kat (parent-friendly summary)
Jachin (chart components) ────────► Yuqi, Kat, Yu Xuan (drop-in on their pages)
Jachin (journal + interests) ─────► Yuqi (AI prompt includes them) ──► Kat (parent sees them)
Kat (unread counts) ──────────────► Kai Sen (navbar badge)
```

**Each member owns the Mongoose model their feature writes to.** Ning Xuan owns `Session` and `Homework` (with Jachin), Kat owns `Message`, Kai Sen owns `User` and `Child` (Jachin added interests/journal/cheer fields with Kai Sen's knowledge), and Jachin owns `Deck`. Adding a field to a model is fine. Renaming or removing one needs a heads-up in the chat.

**Nobody needs to wait.** The demo data in `server/data/seed.json` (loaded into MongoDB with `pnpm seed`) already has sessions, homework with question banks, messages, and handovers across 6 children. The `GET` endpoints work, and the handover has a working non-AI fallback. Build against the demo data now and connect to each other's `POST` endpoints when they are ready.
