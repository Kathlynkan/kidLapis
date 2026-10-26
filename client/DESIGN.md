# Kids Lapis — Design System

> One document for anyone touching the frontend. If a colour, token, or layout rule isn't here, add it.

---

## Visual language

**Kueh lapis.** Every card has 0 px corner radius and a solid border that is a darker shade of the card's fill colour. No drop shadows on cards — only on floating elements (tooltips, modals). The app should feel like stacked blocks of coloured dough, not a cloud-based SaaS tool.

---

## Colour layers

There are **three distinct colour layers**. Never mix them up — a colour should always mean the same thing everywhere it appears.

### Layer 1 — Role accents (UI chrome)

Each role has one accent colour. It governs the navbar background, the role badge, and any role-scoped card highlights.

| Role      | Token                  | Hex       | Usage |
|-----------|------------------------|-----------|-------|
| Child     | `--lapis-pink`         | `#E8A0B8` | Child-facing nav, hero card |
| Parent    | `--lapis-orange`       | `#F5B880` | Parent-facing nav |
| Volunteer | `--lapis-lime`         | `#A8CC90` | Volunteer-facing nav |
| Teacher   | `--lapis-purple`       | `#C0A8D8` | Teacher/coordinator nav |

Each role also has `--role-accent`, `--role-accent-soft`, and `--role-accent-dark` which are set per-page by wrapping the app in `.role-child`, `.role-parent`, etc.

### Layer 2 — PSLE subject colours (content / data)

Used in charts, subject tags, and any per-subject visual indicator. **These are intentionally different from the role accents** — a volunteer should not see green meaning both "Math" and "your role".

| Subject       | Token                    | Hex       | Rationale |
|---------------|--------------------------|-----------|-----------|
| English       | `--subject-english`      | `#88C0D8` | Sky blue — language, calm, reading |
| Math          | `--subject-math`         | `#D4B840` | Amber/gold — analytical, precise |
| Science       | `--subject-science`      | `#F5DF98` | Golden yellow — discovery, brightness |
| Mother Tongue | `--subject-mother-tongue`| `#E8906C` | Coral — cultural warmth, heritage |

Each subject also has a `-soft` variant (`--subject-*-soft`) for backgrounds.

**Note for Chart.js:** CSS variables cannot be read by Chart.js at runtime. Hardcode the hex values from this table directly in `TopicSummaryChart.vue` and `SkillProgressChart.vue`. If you update a subject colour here, also update it in both charts.

Both charts group sessions by **subject** (not by free-text topic), so each child gets at most 4 lines — one per PSLE subject.

### Layer 3 — Semantic UI colours (status / feedback)

| Purpose       | Token              | Hex       |
|---------------|--------------------|-----------|
| Alert / error | `--topic-alert`    | `#E8A0B8` |
| Success / academic | `--topic-academic` | `#A8CC90` |
| Homework / tasks | `--topic-homework` | `#F5DF98` |
| Messages / social | `--topic-social` | `#88C0D8` |

---

## Card variants

| Class           | Fill                  | Border                   | Used for |
|-----------------|-----------------------|--------------------------|----------|
| `.cb-card`      | `--lapis-cream`       | `--lapis-cream-dark`     | Default |
| `.cb-card-pink` | `#FAE8F0`             | `--lapis-pink-dark`      | Child-related content |
| `.cb-card-lime` | `#EAF5E0`             | `--lapis-lime-dark`      | Session history |
| `.cb-card-yellow`| `#FBF5DC`            | `--lapis-yellow-dark`    | Homework / tasks |
| `.cb-card-blue` | `#DFF0F8`             | `--lapis-blue-dark`      | Handover / AI summary |
| `.cb-card-orange`| `#FBF0E4`            | `--lapis-orange-dark`    | Parent-facing cards |
| `.cb-card-purple`| `#F0EAF8`            | `--lapis-purple-dark`    | Teacher / coordinator cards |

---

## Typography

- **Body:** Inter (400, 500, 600, 700)
- **Headings / brand:** Fraunces (500, 600) — used in navbar brand, handover card title
- **Base size:** 16 px
- **Text colour:** `--lapis-plum` (`#4A3F3A`) everywhere. Never raw black.
- **Muted text:** `--cb-muted` (`#8D7F77`)

---

## Spacing and layout

- **Card padding:** `p-3` (1 rem) or `p-4` (1.5 rem) for wider cards
- **Gap between cards:** `gap-3` or `gap-4` in flex/grid containers
- **Container width:** Bootstrap `.container` (max 1140 px)
- **Border radius:** `0 px` everywhere — including buttons, badges, form inputs

---

## Terminology (use these exact words everywhere)

| Concept | Correct term | Do not use |
|---------|-------------|------------|
| Academic difficulty the child had | "Struggled with" | "struggling topics", "weak areas" |
| Recurring academic difficulty | "Recurring struggle" | "recurring issue", "repeated struggle" |
| The pre-session AI summary | "Handover" | "briefing", "summary card" |
| The 4 PSLE subjects | English, Math, Science, Mother Tongue | "Maths", "MT", "Chinese/Malay/Tamil" |
| The person who tutors | Volunteer | "tutor", "mentor" |
| The person who manages the centre | Teacher | "coordinator", "admin" |
| Child's weekly recurring slot | Schedule | "timetable", "recurring session" |
| Homework in the child's gamified view | Quest | "task", "assignment" |

---

## Role routing

| Role      | Home path   | May access |
|-----------|-------------|------------|
| child     | `/child`    | `/child`, `/child/leaderboard`, `/profile` |
| parent    | `/parent`   | `/parent`, `/messages`, `/profile` |
| volunteer | `/volunteer`| `/volunteer`, `/children/:id`, `/children/:id/sessions/new`, `/sessions/:id/edit`, `/children/:id/homework/new`, `/profile` |
| teacher   | `/teacher`  | all `/teacher/*` routes, `/children/:id`, `/sessions/:id/edit`, `/messages`, `/profile` |
