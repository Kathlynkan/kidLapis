<!-- =============================================================
  Landing page (public).                              Owner: Kai Sen
  Done: hero with an example parent update (built from lapis-cards, so it
        matches the app and needs no image files)
        "How it works" follows the core flow: record -> summarise -> share -> continue
        layout checked from iPhone 6 (375px) to Bootstrap XL: cards stack on phones
============================================================= -->
<script setup>
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ChildAvatar from '@/components/ChildAvatar.vue'

const auth = useAuthStore()

// The core flow from WORKLOAD.md, one card per step
const steps = [
  {
    icon: 'bi-pencil-square',
    title: 'Record',
    text: 'Volunteers log each session in a minute: topic, score, mood, struggles and what worked.',
    color: 'lime',
  },
  {
    icon: 'bi-stars',
    title: 'Summarise',
    text: "AI turns the child's session history into a short, plain-language update.",
    color: 'yellow',
  },
  {
    icon: 'bi-house-heart',
    title: 'Share',
    text: 'Parents see today’s update, progress charts and a mood timeline, and can message teachers.',
    color: 'blue',
  },
  {
    icon: 'bi-arrow-left-right',
    title: 'Continue',
    text: 'The next volunteer gets a handover, so the child never starts again from zero.',
    color: 'pink',
  },
]

const roles = [
  {
    icon: 'bi-person-heart',
    name: 'Volunteers',
    text: 'Get a briefing before each session, record it after, and set homework quests.',
    color: 'lime',
  },
  {
    icon: 'bi-speedometer2',
    name: 'Teachers',
    text: 'Spot children who need attention and match them with the right volunteer. Teacher accounts are set up by the centre.',
    color: 'purple',
  },
  {
    icon: 'bi-house-heart',
    name: 'Parents',
    text: "Get a clear, regular picture of your child's progress and mood, even when you work late.",
    color: 'orange',
  },
  {
    icon: 'bi-trophy',
    name: 'Children',
    text: 'Answer homework quests to earn berries, level up, collect badges and climb the leaderboard.',
    color: 'pink',
  },
]
</script>

<template>
  <section class="hero py-5">
    <div class="container py-md-4">
      <div class="row align-items-center g-4 g-lg-5">
        <div class="col-lg-7">
          <span class="badge badge-accent mb-3">For student care centres</span>
          <h1 class="display-5 fw-heavy mb-3">
            When the volunteer changes, the child's progress shouldn't reset.
          </h1>
          <p class="lead lapis-muted mb-4">
            Kids Lapis turns volunteer session notes into a clear, regularly updated picture for
            parents: learning progress, mood, recurring struggles and what is helping.
          </p>
          <div class="d-flex flex-wrap gap-2">
            <RouterLink v-if="auth.isLoggedIn" :to="auth.homePath" class="btn btn-primary btn-lg">
              Go to my dashboard
            </RouterLink>
            <template v-else>
              <RouterLink to="/login" class="btn btn-primary btn-lg">Log in</RouterLink>
              <RouterLink to="/signup" class="btn btn-outline-primary btn-lg">
                Volunteer / parent sign up
              </RouterLink>
            </template>
          </div>
        </div>

        <!-- Hero picture: an example of what a parent sees (made of normal cards, not an image) -->
        <div class="col-lg-5">
          <figure class="hero-preview mb-0" data-test="hero-preview">
            <figcaption class="visually-hidden">Example of a parent's daily update</figcaption>

            <div class="lapis-card lapis-card-blue p-3 p-sm-4 handover-demo">
              <div class="d-flex align-items-center gap-2 mb-3">
                <span class="preview-avatar" aria-hidden="true"><ChildAvatar avatar="/photos/ethan.webp" /></span>
                <div>
                  <div class="fw-heavy">Ethan · P4</div>
                  <div class="small lapis-muted">Today at student care</div>
                </div>
                <span class="badge badge-accent ms-auto">AI summary</span>
              </div>

              <dl class="row small mb-3">
                <dt class="col-5">Worked on</dt>
                <dd class="col-7">Fractions</dd>
                <dt class="col-5">Mood</dt>
                <dd class="col-7">Focused</dd>
                <dt class="col-5">What helped</dt>
                <dd class="col-7 mb-0">Drawing the fractions as pizza slices</dd>
              </dl>

              <div class="small mb-1 d-flex justify-content-between">
                <span>This week's accuracy</span><strong>4 / 5</strong>
              </div>
              <div
                class="progress preview-progress"
                role="progressbar"
                aria-label="Example accuracy"
                aria-valuenow="80"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <div class="progress-bar"></div>
              </div>
            </div>

            <div class="lapis-card p-2 px-3 mt-2 ms-4 ms-sm-5 small preview-message">
              <i class="bi bi-chat-dots me-1"></i>
              <strong>Ms Grace:</strong> Ethan explained it to a friend today!
            </div>
          </figure>
        </div>
      </div>
    </div>
  </section>

  <section class="container py-5">
    <h2 class="h3 text-center mb-4">How it works</h2>
    <div class="row g-3">
      <div v-for="(step, i) in steps" :key="step.title" class="col-sm-6 col-lg-3">
        <div class="lapis-card p-3 h-100" :class="`lapis-card-${step.color}`" data-test="how-step">
          <div class="d-flex align-items-center gap-2 mb-2">
            <div class="step-num">{{ i + 1 }}</div>
            <h3 class="h6 mb-0"><i class="bi me-1" :class="step.icon"></i>{{ step.title }}</h3>
          </div>
          <p class="small lapis-muted mb-0">{{ step.text }}</p>
        </div>
      </div>
    </div>
  </section>

  <section class="container pb-5">
    <h2 class="h3 text-center mb-4">One app, four views</h2>
    <div class="row g-3">
      <div v-for="r in roles" :key="r.name" class="col-sm-6 col-lg-3">
        <div class="lapis-card p-3 h-100 text-center" :class="`lapis-card-${r.color}`">
          <i class="bi fs-2 text-primary" :class="r.icon"></i>
          <h3 class="h6 mt-2">{{ r.name }}</h3>
          <p class="small lapis-muted mb-0">{{ r.text }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style>
/* INTERNAL CSS: only this page uses these styles, so they live here in the .vue file. (CSS shared by several pages is in src/css/.) */

/* The public home page that people see before they log in (HomeView.vue). */

.hero {
  background: transparent; /* lapis bands show through from body */
}

.handover-demo {
  border-left: 6px solid var(--lapis-orange);
}

/* The example update is tilted a little, so it reads as a picture rather than part of the page */
.hero-preview {
  max-width: 420px;
  margin-inline: auto;
}
@media (min-width: 992px) {
  .hero-preview {
    transform: rotate(1.5deg);
  }
}

.preview-avatar {
  font-size: 28px;
  line-height: 1;
}

.preview-progress {
  height: 10px;
  background: var(--lapis-cream);
}
.preview-progress .progress-bar {
  width: 80%; /* the example accuracy */
  background: var(--lapis-lime-dark);
}

.preview-message {
  background: var(--lapis-cream);
  border-left: 4px solid var(--lapis-blue-dark);
}

.step-num {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--lapis-pink);
  color: var(--lapis-cream);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--lapis-pink-dark);
  box-shadow: 0 1px 3px rgba(74, 63, 58, 0.1);
  flex-shrink: 0;
}
</style>
