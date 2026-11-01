<!-- =============================================================
  Landing page (public).                              Owner: Kai Sen
  Done: the title, "One app, four views" (a card for each role with its own log in button)
        and "How it works" (record -> summarise -> share -> continue).
        It is made of the same parts as the other pages: the page title, a sandy board with white cards,
        and the four layer colours (purple, green, aqua, pink) for the four roles.
============================================================= -->
<script setup>
/* eslint-disable */
import { RouterLink } from "vue-router"
import { useAuthStore } from "@/stores/auth"

const auth = useAuthStore()

// One card for each role. colour: the layer colour of that role (see main.css).
const roles = [
  {
    icon: "bi-person-heart",
    name: "Volunteers",
    short: "Record and hand over",
    text: "Get a briefing before each session, record it after, and set homework quests.",
    button: "Volunteer log in",
    colour: "green",
  },
  {
    icon: "bi-speedometer2",
    name: "Teachers",
    short: "Run the centre",
    text: "Spot children who need attention and match them with the right volunteer. Teacher accounts are set up by the centre.",
    button: "Teacher log in",
    colour: "purple",
  },
  {
    icon: "bi-house-heart",
    name: "Parents",
    short: "Follow progress",
    text: "Get a clear, regular picture of your child's progress and mood, even when you work late.",
    button: "Parent log in",
    colour: "aqua",
  },
  {
    icon: "bi-trophy",
    name: "Children",
    short: "Earn stars",
    text: "Answer homework quests to earn stars, level up, collect badges and climb the leaderboard.",
    button: "Child log in",
    colour: "pink",
  },
]

// The core flow, one row for each step
const steps = [
  {
    name: "Record",
    text: "A volunteer logs the session after it ends: what they covered, how the child felt, and what to try next time.",
    colour: "green",
  },
  {
    name: "Quest",
    text: "The child comes home to new homework quests and earns stars and kueh badges for every one they complete.",
    colour: "pink",
  },
  {
    name: "Share",
    text: "Parents get a plain-English update on their child's session, mood and progress - without having to chase anyone.",
    colour: "aqua",
  },
  {
    name: "Continue",
    text: "The coordinator matches children with the right volunteer. Every new volunteer gets a full handover - the child never starts from zero.",
    colour: "purple",
  },
]
</script>

<template>
  <div class="container py-4 homepage">
    <header class="home-header">
      <span class="note-tag">For student care centres</span>
      <h1 class="page-title">Every session builds on the last. Every child stays on track.</h1>
      <p class="page-subtitle">
        Kids Lapis connects volunteers, teachers, parents and children — session notes become parent updates, homework becomes quests, and no child ever starts from zero.
      </p>
      <RouterLink v-if="auth.isLoggedIn" :to="auth.homePath" class="home-button colour-pink" data-test="go-dashboard">
        Go to my dashboard
      </RouterLink>
    </header>

    <!-- the sandy board with a white card for each role -->
    <section class="board" aria-labelledby="roles-title">
      <h2 id="roles-title">One app, four views</h2>
      <div class="role-grid">
        <article v-for="r in roles" :key="r.name" class="role-card" data-test="role-card">
          <div class="role-top">
            <span class="role-icon" :class="`colour-${r.colour}`"><i class="bi" :class="r.icon"></i></span>
            <div>
              <h3>{{ r.name }}</h3>
              <div class="role-short">{{ r.short }}</div>
            </div>
          </div>
          <p>{{ r.text }}</p>
          <div v-if="!auth.isLoggedIn" class="role-foot">
            <RouterLink to="/login" class="home-button" :class="`colour-${r.colour}`">{{ r.button }}</RouterLink>
          </div>
        </article>
      </div>
    </section>

    <!-- the four steps, as white rows -->
    <section class="board" aria-labelledby="steps-title">
      <h2 id="steps-title">How it works</h2>
      <div class="step-grid">
        <div v-for="(s, i) in steps" :key="s.name" class="step-row" data-test="how-step">
          <span class="step-num" :class="`colour-${s.colour}`">{{ i + 1 }}</span>
          <div>
            <h3>{{ s.name }}</h3>
            <p>{{ s.text }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style>
/* INTERNAL CSS: only this page uses these styles, so they live here in the .vue file. (CSS shared by several pages is in src/css/.) */

/* The public home page that people see before they log in (HomeView.vue).
   The title and the sentence under it are .page-title and .page-subtitle (main.css), the sandy box is .board (main.css).
   The four colours are the layer colours of the roles: purple teacher, green volunteer, aqua parent, pink child. */

/* ---------- the colours of the roles ---------- */

.homepage .colour-green  { background: #9BD3B2; }
.homepage .colour-purple { background: #D5CBEA; }
.homepage .colour-aqua   { background: #AED9D8; }
.homepage .colour-pink   { background: #E8A0B8; }

/* ---------- the title ---------- */

.homepage .home-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 20px 0 22px;
}

.homepage .page-title {
  max-width: 520px;
  margin: 0;
}

.homepage .page-subtitle {
  max-width: 560px;
  margin: 0;
}

/* the small yellow tag above the title (the same quiet look as the warning tags on the teacher pages) */
.homepage .note-tag {
  padding: 3px 11px;
  border-radius: 999px;
  background: #FAF4D8;
  box-shadow: inset 0 0 0 1.5px #EEDFA6;
  color: #7A6420;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

/* ---------- the boards ---------- */

.homepage .board {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 22px;
}

.homepage .board h2 {
  margin: 0 4px;
  font-size: 18px;
  font-weight: 600;
}

/* ---------- a button: small, with 5px corners, in the colour of the role ---------- */

.homepage .home-button {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 5px;
  color: #4A3F3A;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.homepage .home-button:hover {
  color: #4A3F3A;
  filter: brightness(0.95);
}

/* ---------- the role cards ---------- */

.homepage .role-grid,
.homepage .step-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.homepage .role-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: 18px;
  background: #FFFFFF;
  box-shadow: 0 1px 6px rgba(74, 63, 58, 0.1);
}

.homepage .role-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.homepage .role-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  font-size: 20px;
}

.homepage .role-card h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.2;
}

.homepage .role-short {
  color: #8D7F77;
  font-size: 13px;
}

.homepage .role-card p,
.homepage .step-row p {
  margin: 0;
  color: #8D7F77;
  font-size: 14px;
}

.homepage .role-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
}

/* ---------- the steps: white rows, like the rows on the parent page ---------- */

.homepage .step-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #FFFFFF;
  box-shadow: 0 1px 6px rgba(74, 63, 58, 0.1);
}

.homepage .step-num {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 50%;
  font-size: 17px;
  font-weight: 700;
}

.homepage .step-row h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

/* ---------- a phone ---------- */

@media (max-width: 560px) {
  .homepage .role-grid,
  .homepage .step-grid {
    grid-template-columns: 1fr;
  }
}
</style>
