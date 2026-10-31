<!-- Leaderboard                                          Owner: Jachin
     A podium for the first three places, then a white row for everyone else, on the sandy board.
     Children with the same stars share a place (1, 2, 2, 4). -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import api, { errorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import ChildAvatar from '@/components/ChildAvatar.vue'
import StateMessage from '@/components/StateMessage.vue'
import { firstName } from '@/utils/format'

const auth = useAuthStore()
const entries = ref([])
const loading = ref(true)
const error   = ref('')

const myId = computed(() => auth.user?.childId)

// every child with the place they share, and the child just ahead of them (the next one with more stars)
const ranked = computed(() =>
  entries.value.map((entry, i) => {
    const place = entries.value.findIndex((other) => other.points === entry.points) + 1
    const ahead = entries.value.slice(0, i).reverse().find((other) => other.points > entry.points) || null
    return { ...entry, place, ahead }
  }),
)

// the three steps: second place on the left, first in the middle, third on the right.
// When fewer than three children have stars, the empty steps are free places.
const slots = computed(() =>
  [1, 0, 2].map((i) => {
    const entry = ranked.value[i] || null
    const place = entry ? entry.place : i + 1
    let note = 'Do a quest to join'
    if (entry) {
      note = place === 1 ? 'Top of the week' : `${entry.ahead.points - entry.points} behind ${firstName(entry.ahead.name)}`
    }
    return { entry, place, note }
  }),
)

const rest   = computed(() => ranked.value.slice(3))
const hasMe  = computed(() => entries.value.some((entry) => entry.childId === myId.value))

// what the child needs to move up a place
function passNote(entry) {
  return entry.ahead ? `${entry.ahead.points - entry.points + 1} more stars to pass ${firstName(entry.ahead.name)}` : ''
}

onMounted(async () => {
  try {
    const res = await api.get('/homework/leaderboard', { params: { period: 'week' } })
    entries.value = res.data
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container py-4 leaderboardpage">
    <PageHeader title="Leaderboard" subtitle="Stars earned this week — resets every Monday!" />

    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />

    <div v-else class="board">
      <template v-if="entries.length === 0">
        <StateMessage message="No quests verified this week yet — complete one to appear!" />
        <div class="lb-foot">
          <RouterLink :to="{ name: 'child-home' }" class="lb-go"><i class="bi bi-map"></i>Go do a quest</RouterLink>
        </div>
      </template>

      <template v-else>
        <!-- the podium: a white card with the first three places -->
        <div class="lb-card podium-card">
          <div class="podium">
            <div
              v-for="slot in slots"
              :key="slot.place"
              class="pcol"
              :class="{ free: !slot.entry }"
              :data-rank="slot.place"
              :data-test="slot.entry ? `podium-${slot.place}` : null"
            >
              <div class="pavatar-wrap">
                <svg v-if="slot.entry && slot.place === 1" class="crown" viewBox="0 0 30 22" aria-hidden="true">
                  <path fill="#F2CB5C" d="M2 6l7 6 6-10 6 10 7-6-3 15H5z" />
                  <circle cx="2" cy="6" r="2" fill="#F2CB5C" />
                  <circle cx="15" cy="2" r="2" fill="#F2CB5C" />
                  <circle cx="28" cy="6" r="2" fill="#F2CB5C" />
                </svg>
                <div class="pavatar">
                  <ChildAvatar v-if="slot.entry" :avatar="slot.entry.avatar" />
                  <template v-else>?</template>
                </div>
              </div>

              <div class="pname">
                <span class="pname-text">{{ slot.entry ? firstName(slot.entry.name) : 'Free place' }}</span>
                <span v-if="slot.entry && slot.entry.childId === myId" class="lb-you">You</span>
              </div>

              <div class="step">
                <span class="step-rank">{{ slot.place }}</span>
                <span v-if="slot.entry" class="lb-stars"><i class="bi bi-star-fill"></i>{{ slot.entry.points }}</span>
              </div>

              <div class="pnote">{{ slot.note }}</div>
            </div>
          </div>
        </div>

        <!-- 4th place onwards: one white row for each child -->
        <div v-if="rest.length" class="lb-list">
          <div
            v-for="entry in rest"
            :key="entry.childId"
            class="lb-card lb-row"
            :class="{ 'lb-me': entry.childId === myId }"
            data-test="leaderboard-row"
          >
            <span class="lb-rank">{{ entry.place }}</span>
            <span class="row-avatar"><ChildAvatar :avatar="entry.avatar" /></span>
            <span class="row-name">{{ firstName(entry.name) }}</span>
            <span v-if="entry.childId === myId" class="lb-you">You</span>
            <span v-if="entry.childId === myId && passNote(entry)" class="row-hint">{{ passNote(entry) }}</span>
            <span class="lb-stars"><i class="bi bi-star-fill"></i>{{ entry.points }}</span>
          </div>
        </div>

        <p v-if="!hasMe" class="lb-hint">You are not on the board yet. Do a quest to earn stars and join!</p>

        <div class="lb-foot">
          <RouterLink :to="{ name: 'child-home' }" class="lb-go"><i class="bi bi-map"></i>Go do a quest</RouterLink>
        </div>
      </template>
    </div>
  </div>
</template>

<style>
/* INTERNAL CSS: only this page uses these styles, so they live here in the .vue file. (CSS shared by several pages is in src/css/.) */

/* The leaderboard (LeaderboardView.vue): a sandy board with a podium card and white rows, like the rest of the child pages.
   Colours: the pink, aqua and lavender of the layers of the app are the three steps. */

/* ── The board ──────────────────────────────────────────────── */

.leaderboardpage .board {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* a white card: no outline, soft corners, a very light shadow */
.leaderboardpage .lb-card {
  min-width: 0;
  border-radius: 18px;
  background: #FFFFFF;
  box-shadow: 0 1px 6px rgba(74, 63, 58, 0.10);
}

/* the small tags */
.leaderboardpage .lb-stars,
.leaderboardpage .lb-you,
.leaderboardpage .lb-rank {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.leaderboardpage .lb-stars { background: #FBE7A1; color: var(--lapis-plum); }
.leaderboardpage .lb-you   { background: #F3C1D3; color: var(--lapis-plum); }
.leaderboardpage .lb-rank  { justify-content: center; min-width: 30px; background: var(--role-accent-soft, #FAE8F0); color: var(--lapis-plum); }
.leaderboardpage .lb-stars .bi { font-size: 11px; }

/* ── The podium ─────────────────────────────────────────────── */

.leaderboardpage .podium-card {
  padding: 30px 16px 16px;
}

.leaderboardpage .podium {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.leaderboardpage .pcol {
  flex: 1 1 0;
  max-width: 210px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;   /* the notes under the steps line up */
  align-items: center;
  gap: 4px;
  text-align: center;
}

.leaderboardpage .pavatar-wrap { position: relative; margin-bottom: 2px; }

/* the round picture: a photo fills it, an emoji sits in the middle of a pale pink circle */
.leaderboardpage .pavatar {
  display: grid;
  place-items: center;
  width: 66px;
  height: 66px;
  overflow: hidden;
  border-radius: 50%;
  background: var(--role-accent-soft, #FAE8F0);
  font-size: 36px;
  line-height: 1;
}

.leaderboardpage .pavatar .child-avatar,
.leaderboardpage .row-avatar .child-avatar {
  width: 100%;
  height: 100%;
  vertical-align: top;
}

/* first place is bigger, with a pink ring and a crown */
.leaderboardpage .pcol[data-rank='1'] .pavatar {
  width: 84px;
  height: 84px;
  font-size: 46px;
  box-shadow: 0 0 0 3px var(--layer-child);
}

.leaderboardpage .crown {
  position: absolute;
  top: -20px;
  left: 50%;
  width: 30px;
  height: 22px;
  transform: translateX(-50%) rotate(-6deg);
}

.leaderboardpage .pname {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
  max-width: 100%;
  font-weight: 600;
}

.leaderboardpage .pname-text {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* a step is one solid colour: pink for first, aqua for second, lavender for third */
.leaderboardpage .step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
  height: 72px;
  margin-top: 6px;
  padding-top: 8px;
  border-radius: 14px 14px 0 0;
  background: var(--layer-teacher);
}

.leaderboardpage .pcol[data-rank='1'] .step { height: 120px; background: var(--layer-child); }
.leaderboardpage .pcol[data-rank='2'] .step { height: 96px;  background: var(--layer-parent); }

.leaderboardpage .step-rank {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--lapis-plum);
}

.leaderboardpage .pnote {
  min-height: 26px;
  padding-top: 6px;
  font-size: 12.5px;
  color: var(--lapis-muted);
}

/* a free place: a faint dashed step */
.leaderboardpage .pcol.free .pavatar {
  border: 2px dashed #E3C3D1;
  background: transparent;
  color: #CDAAB9;
  font-weight: 700;
}

.leaderboardpage .pcol.free .pname { color: var(--lapis-muted); font-weight: 500; }

.leaderboardpage .pcol.free .step {
  border: 2px dashed #E9D6DD;
  border-bottom: 0;
  background: none;
}

.leaderboardpage .pcol.free .step-rank { color: #CDAAB9; }

/* ── The rows from 4th place ────────────────────────────────── */

.leaderboardpage .lb-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.leaderboardpage .lb-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
}

/* your own row has a pink outline */
.leaderboardpage .lb-row.lb-me {
  box-shadow: 0 0 0 2px var(--layer-child), 0 1px 6px rgba(74, 63, 58, 0.10);
}

.leaderboardpage .row-avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: 44px;
  height: 44px;
  overflow: hidden;
  border-radius: 50%;
  background: var(--role-accent-soft, #FAE8F0);
  font-size: 24px;
  line-height: 1;
}

.leaderboardpage .row-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.leaderboardpage .row-hint,
.leaderboardpage .lb-hint {
  font-size: 13px;
  color: var(--lapis-muted);
}

.leaderboardpage .lb-hint { margin: 0; text-align: center; }

/* ── The button: the shape of the Edit and Delete buttons, in pale pink ── */

.leaderboardpage .lb-foot { display: flex; justify-content: flex-end; }

.leaderboardpage .lb-go {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 0;
  border-radius: 5px;
  background: #F3C1D3;
  color: var(--lapis-plum);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.leaderboardpage .lb-go:hover { background: #EBAAC2; color: var(--lapis-plum); }

/* ── A small phone: three narrow steps ──────────────────────── */

@media (max-width: 480px) {
  .leaderboardpage .podium-card { padding: 28px 10px 12px; }
  .leaderboardpage .podium { gap: 6px; }
  .leaderboardpage .pavatar { width: 54px; height: 54px; font-size: 30px; }
  .leaderboardpage .pcol[data-rank='1'] .pavatar { width: 68px; height: 68px; font-size: 38px; }
  .leaderboardpage .row-hint { display: none; }
}
</style>
