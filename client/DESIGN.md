# Kids Lapis — Design System

> One document for anyone touching the frontend. If a colour, token, or layout rule isn't here, add it.

---

## Visual language

**Kueh lapis.** The app should feel like layers of a cake, one layer for each role.

- **Parent and volunteer pages (the soft look):** no dark outlines, soft corners (14 px to 22 px, round pills for tags, tabs and buttons), a very light shadow, Inter text, and small line icons (`LineIcon.vue`) instead of emoji. Every parent page shares one look and every volunteer page shares another.
- **Child, parent, volunteer and teacher pages (the soft look):** the same, in each role's colour. A few older parts (the login and sign-up pages, the 404 page and the public home page) still have the original look: 0 px corner radius and a solid border that is a darker shade of the card's fill colour.

### Layer stripes

Under the navbar there is a stack of thin stripes, one stripe for each layer. A role shows the layers up to its own, so a parent has one stripe and a volunteer has two (the parent colour first, then its own). Every page of a role shows the same stripes, because they are drawn by `NavBar.vue`. The other roles show one stripe in their own accent colour for now. To add a layer, add its `--layer-*` colour in `main/main.css` and its name to `LAYERS` in `NavBar.vue`.

### The kueh lapis and the kueh tin (child home)

The child home shows the layers as a **kueh lapis**: every level adds a layer, from the bottom up in this order: teacher (`--layer-teacher`), parent (`--layer-parent`), volunteer (`--layer-volunteer`), child (`--lapis-pink`). Four layers is a finished cake. Every badge is a **kueh** in the **kueh tin**; its name, picture and fun fact are in `BADGES` in `utils/gamification.js`, and the pictures are transparent `.webp` files in `public/child_badges_images/`.

### Where the CSS lives

There are two kinds of CSS in this project, and one rule decides which one to use:

> **Only one page (or component) uses it → INTERNAL CSS**: a `<style>` block at the bottom of that `.vue` file.
> **Several pages use it → EXTERNAL CSS**: a `.css` file in `src/css/`, imported at the top of each `.vue` file that needs it.

Every block and file starts with a comment that says which kind it is. There are no fixed `style=""` attributes in the `.vue` files (only values that change, such as a bar's width, stay in `:style`).

**External CSS** (`src/css/`, shared by several pages):

| File | Used by | What is in it |
|------|---------|---------------|
| `main/main.css` | the whole app (loaded once in `main.js`) | The colours and fonts (`--variables`), the Bootstrap overrides, the classes every page shares (such as `.board`), the colours of the volunteer's and the teacher's pages (`--cp-...`) |
| `main/components.css` | the small components (`PageHeader`, `PeelCard`, `SessionCard`, ...) | The look of those parts; each section says which component |
| `main/labels.css` | parent home, Messages, volunteer home, a child's page, the teacher pages | The capital-letter captions |
| `parent/parentshared.css` | parent home, Messages | Base text, page title, the child buttons |
| `volunteer/volunteershared.css` | volunteer home, a child's page, the two forms | Base text and page title |
| `volunteer/volunteerform.css` | Record / Edit a session, Give homework | The form look (volunteer and teacher) |
| `teacher/teacherpage.css` | the five teacher pages (Dashboard, Children, Volunteers, Matchmaking, Schedule) | Everything for those pages |

**Internal CSS** (the `<style>` block at the bottom of the `.vue` file):

| File | What is in the block |
|------|----------------------|
| `components/NavBar.vue` | The navbar and the layer stripes under it |
| `views/HomeView.vue` | The public home page |
| `views/child/ChildHomeView.vue` | The child home (hero, kueh lapis, quests, kueh tin) |
| `views/child/LeaderboardView.vue` | The leaderboard and the podium |
| `views/parent/ParentHomeView.vue` | The parent home (also styles `ParentSocialDay.vue`) |
| `views/shared/MessagesView.vue` | Messages and the chat (also styles `ChatThread.vue`), for the parent, and the same page in the teacher's colours at the bottom |
| `views/shared/ProfileView.vue` | The profile page for every role (a block of colour variables `--pf-*` for each role at the top) |
| `views/volunteer/VolunteerHomeView.vue` | The volunteer home (also styles `ChildCard.vue`) |
| `views/volunteer/ChildProfileView.vue` | One child's page for a volunteer or a teacher (also styles `SessionCard`, `HandoverCard`, `HomeworkQuestCard`, `PeelCard` on that page, and the delete pop-ups) |

The `<style>` blocks are not `scoped`, so every rule starts with the page's root class (for example `.parentpage`) to keep it from affecting other pages.

**Keep the CSS simple.** Sizes are in `px` (and `%` and `fr`). The one `em` is the photo avatar in `components.css`, which has to grow and shrink with the text next to it. There is no `calc()`, `min()`, `max()`, `clamp()`, `:is()`, `:has()` or `color-mix()`. Pages that change a lot between phone and desktop use a `@media` rule. `:not()` is used only in `volunteerform.css` to beat a Bootstrap rule. `!important` is used only to beat Bootstrap's own `!important` classes.

**Specificity:** a plain class is weaker than Bootstrap rules on the same element (for example the cells of a table). If Bootstrap wins, start the selector with the page's class, as `teacherpage.css` does.

---

## Colour layers

There are **three distinct colour layers**. Never mix them up — a colour should always mean the same thing everywhere it appears.

### Layer 1 — Role accents (UI chrome)

Each role has one accent colour. It governs the navbar background, the role badge, and any role-scoped card highlights.

| Role      | Token                  | Hex       | Usage |
|-----------|------------------------|-----------|-------|
| Child     | `--lapis-pink`         | `#E8A0B8` | Child-facing nav, hero card |
| Parent    | `--layer-parent`       | `#AED9D8` | Parent-facing nav stripe, selected states |
| Volunteer | `--layer-volunteer`    | `#9BD3B2` | Volunteer-facing nav stripe, selected states |
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

**Note for Chart.js:** CSS variables cannot be read by Chart.js at runtime. Hardcode the hex values from this table directly in `TopicSummaryChart.vue` and `SkillProgressChart.vue`. If you update a subject colour here, also update it in both charts.

Both charts group sessions by **subject** (not by free-text topic), so each child gets at most 4 lines — one per PSLE subject.

### Layer 3 — Semantic UI colours (status / feedback)

| Purpose       | Token              | Hex       |
|---------------|--------------------|-----------|
| Alert / error | `--topic-alert`    | `#E8A0B8` |
| Success / academic | `--topic-academic` | `#A8CC90` |
| Messages / social | `--topic-social` | `#88C0D8` |

---

## Card variants

| Class           | Fill                  | Border                   | Used for |
|-----------------|-----------------------|--------------------------|----------|
| `.lapis-card`      | `--lapis-cream`       | `--lapis-cream-dark`     | Default |
| `.lapis-card-pink` | `#FAE8F0`             | `--lapis-pink-dark`      | Child-related content |
| `.lapis-card-lime` | `#EAF5E0`             | `--lapis-lime-dark`      | Session history |
| `.lapis-card-yellow`| `#FBF5DC`            | `--lapis-yellow-dark`    | Homework / tasks |
| `.lapis-card-blue` | `#DFF0F8`             | `--lapis-blue-dark`      | Handover / AI summary |
| `.lapis-card-orange`| `#FBF0E4`            | `--lapis-orange-dark`    | Parent-facing cards |
| `.lapis-card-purple`| `#F0EAF8`            | `#7850B8`                | Teacher / coordinator cards |

---

## Typography

- **One font for the whole app:** Inter (400, 500, 600, 700), set once as `--lapis-font` in `main/main.css`. Headings, buttons, the navbar and the chart labels all use it.
- **Small captions** (form labels, tags, tab names, group headings): capital letters with a little space between the letters (`letter-spacing: 0.06em`). `main/main.css` does this for `.form-label`, `.badge` and `.btn`, and `main/labels.css` does it for the captions on the parent, Messages, volunteer and child pages.
- **Base size:** 16 px
- **Text colour:** `--lapis-plum` (`#4A3F3A`) everywhere. Never raw black.
- **Muted text:** `--lapis-muted` (`#8D7F77`)

---

## Spacing and layout

- **Card padding:** `p-3` (1 rem) or `p-4` (1.5 rem) for wider cards
- **Gap between cards:** `gap-3` or `gap-4` in flex/grid containers
- **Container width:** Bootstrap `.container` (max 1140 px)
- **Border radius:** `0 px` everywhere — including buttons, badges, form inputs — except the parent and volunteer pages (soft look, see above)

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
