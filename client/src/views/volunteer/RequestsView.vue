<!-- =============================================================
  Session requests (volunteers)                      Owner: Kai Sen
  Route: /volunteer/requests
  -------------------------------------------------------------
  When the coordinator assigns a volunteer to a child in Matchmaking, the new day is a
  request ('pending', models/Child.js). The volunteer's bell links here, where they
  Accept (the child joins My Children) or Decline (the coordinator sees the child needs
  someone again). Uses GET /requests and PUT /requests/:childId (routes/requests.js).
============================================================= -->
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

import api, { errorMessage } from '@/services/api'
import PageHeader from '@/components/PageHeader.vue'
import StateMessage from '@/components/StateMessage.vue'
import ChildInitial from '@/components/ChildInitial.vue'
import { subjectStyle, formatDate } from '@/utils/format'
import '@/css/volunteer/volunteershared.css' // what the volunteer pages have in common
import '@/css/main/labels.css' // the capital-letter captions (the buttons, like "View all my children")
import '@/css/main/components.css' // the subject label ("MATH"), the same as on session and quest cards

const requests = ref([]) // [{ childId, childName, level, avatar, needs, day, time }]
const loading = ref(true)
const error = ref('')
const info = ref('') // what happened after Accept / Decline, e.g. 'Your session with Sofia stays every Wed at 12:00.'
const answering = ref('') 

const keyOf = (r) => `${r.childId}|${r.day}`

// today as 'YYYY-MM-DD' in our time zone, to tell "Starts" from "Started" 
const now = new Date()
const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

async function loadRequests() {
  const res = await api.get('/requests')
  requests.value = res.data.sort((a, b) => {
    const aPending = a.status === 'pending'
    const bPending = b.status === 'pending'

    if (aPending && !bPending) return -1
    if (!aPending && bPending) return 1

    const aTime = a.requestedAt ? new Date(a.requestedAt).getTime() : 0
    const bTime = b.requestedAt ? new Date(b.requestedAt).getTime() : 0

    if (bTime !== aTime) {
      return bTime - aTime
    }

    return a.childName.localeCompare(b.childName)
  })
}

// A new or changed request arrived (the NavBar sends 'bell-refresh': live from the server,
// when the volunteer clicks a request in the bell, or every 60 seconds): show it without refreshing the page.
async function reloadQuietly() {
  if (answering.value) return // in the middle of accepting / declining: that reloads by itself
  try {
    await loadRequests()
  } catch {
    // keep the list we have, it will try again next time
  }
}

onMounted(async () => {
  try {
    await loadRequests()
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
  window.addEventListener('bell-refresh', reloadQuietly)
})

onUnmounted(() => {
  window.removeEventListener('bell-refresh', reloadQuietly)
})

async function answer(r, action) {
  answering.value = keyOf(r)
  error.value = ''
  info.value = ''
  try {
    const res = await api.put(`/requests/${r.childId}`, { day: r.day, action })
    info.value = res.data.message // e.g. 'You said no to the change. Your session with Sofia stays every Wed at 12:00.'
    // load the list again: saying no to a change moves the session back to its old day and time
    await loadRequests()
    window.dispatchEvent(new Event('bell-refresh')) // the NavBar bell updates straight away
  } catch (err) {
    error.value = errorMessage(err) // e.g. the coordinator cancelled it meanwhile
    await loadRequests()
  } finally {
    answering.value = ''
  }
}
</script>

<template>
  <div class="container py-4 volunteerpage">
    <PageHeader title="Assignment Requests" subtitle="The coordinator would like you to tutor these children. Accept or decline each day." />

    <StateMessage v-if="loading" type="loading" />

    <template v-else>
      <div v-if="error" class="alert alert-danger" role="alert" data-test="requests-error">{{ error }}</div>
      <div v-if="info" class="alert alert-success" role="status" data-test="requests-info">{{ info }}</div>

      

      <StateMessage
        v-if="!requests.length"
        type="empty"
        message="No session requests right now. New ones appear on your bell."
      />

      <div v-else class="request-list">
        <div v-for="r in requests" :key="keyOf(r)" class="request-card" data-test="request-card">
          <ChildInitial :child="{ name: r.childName, avatar: r.avatar }" class="request-photo" />
          <div class="request-info">
            <div class="request-name">{{ r.childName }} <span class="request-level">({{ r.level }})</span></div>
            <template v-if="r.changedFrom && r.status === 'pending'">
              <div class="request-when">
                <i class="bi bi-calendar-event"></i> Every <b>{{ r.prevDay }}</b>
                <template v-if="r.prevTime"> at <b>{{ r.prevTime }}</b></template>
              </div>
              <div class="request-changed" data-test="request-changed">
                <i class="bi bi-arrow-repeat"></i> The coordinator asked to change this to every <b>{{ r.day }}</b>
                <template v-if="r.time"> at <b>{{ r.time }}</b></template>
              </div>
            </template>
            <div v-else class="request-when">
              <i class="bi bi-calendar-event"></i> Every <b>{{ r.day }}</b>
              <template v-if="r.time"> at <b>{{ r.time }}</b></template>
            </div>
            <!-- when the sessions start  -->
            <div v-if="r.status === 'pending' && r.startsOn" class="request-start" data-test="request-start">
              <i class="bi bi-flag"></i> First session <b>{{ formatDate(r.startsOn) }}</b> if you accept<template v-if="r.changedFrom"> the change</template> now
            </div>
            <div v-else-if="r.status === 'accepted' && r.startDate" class="request-start" data-test="request-start">
              <i class="bi bi-flag"></i> {{ r.startDate > todayDate ? 'Starts' : 'Started' }} <b>{{ formatDate(r.startDate) }}</b>
            </div>
            <div v-if="r.needs?.length" class="request-needs">
              Needs help with
              <span v-for="n in r.needs" :key="n" class="session-subject" :style="subjectStyle(n)">{{ n }}</span>
            </div>
          </div>
          
          <div class="request-actions">

            <template v-if="r.status === 'pending'">
              <button
                type="button"
                class="btn btn-outline-primary quest-edit"
                :disabled="answering !== ''"
                @click="answer(r, 'accept')"
              >
                  <span
                    v-if="answering === keyOf(r)"
                    class="spinner-border spinner-border-sm me-1"
                  ></span>

                  <i v-else class="bi bi-check-circle me-1"></i>
                {{ r.changedFrom ? 'Accept change' : 'Accept' }}
              </button>

              <button
                type="button"
                class="btn btn-outline-danger quest-delete"
                :disabled="answering !== ''"
                @click="answer(r, 'decline')"
              >
                <template v-if="r.changedFrom"><i class="bi bi-arrow-counterclockwise"></i> Keep current time</template>
                <template v-else><i class="bi bi-x-circle"></i> Decline</template>
              </button>
            </template>

            <span
              v-else-if="r.status === 'accepted'"
              class="request-status request-status-accepted"
            >
              <i class="bi bi-check-circle-fill me-1"></i>Accepted
            </span>

            <span
              v-else
              class="request-status request-status-declined"
            >
              <i class="bi bi-x-circle-fill me-1"></i>Declined
            </span>

          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style>
/* INTERNAL CSS: only this page uses these styles. */

/* the start date and "Changed from" lines under the day */
.volunteerpage .request-start,
.volunteerpage .request-changed{
  margin-top: 2px;
  font-size: 14px;
}

.volunteerpage .request-changed {
  align-self: flex-start; /* only as wide as its words, not the whole card */
  max-width: 100%;
  padding: 2px 12px;
  border-radius: 12px; /* still looks neat if the words wrap onto two lines */
  background: #FBE7A1; /* the same yellow as "waiting" */
}

/* The mint pill buttons of the volunteer pages (same as "View all my children" on My Children).
   Repeated here because that page's styles only load when it is opened. */
.volunteerpage .btn {
  border: 0;
  border-radius: 5px;
  box-shadow: none;
  font-size: 14px;
  font-weight: 700;
  text-transform: none;
}

.volunteerpage .btn-outline-primary {
  background: var(--cp-soft);
  color: var(--cp-text);
}

.volunteerpage .btn-outline-primary:hover {
  background: var(--cp-letter);
  color: var(--cp-text);
}

.volunteerpage .btn-outline-danger {
  background: #EE9F96;
  color: var(--cp-text);
}

.volunteerpage .btn-outline-danger:hover {
  background: #E68C81;
  color: var(--cp-text);
}

.volunteerpage .quest-edit,
.volunteerpage .quest-delete {
  padding: 3px 9px;
}





/* "You'll see Sofia every Mon at 11:00.  [OPEN PROFILE]" */
.volunteerpage .request-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.volunteerpage .request-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 14px;
  background: #FFFFFF;
  box-shadow: 0 1px 6px rgba(74, 63, 58, 0.1);
}

.volunteerpage .request-photo {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
}

.volunteerpage .request-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.volunteerpage .request-name {
  font-size: 17px;
  font-weight: 700;
}

.volunteerpage .request-level {
  color: #5E6C80;
  font-weight: 500;
}

.volunteerpage .request-needs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: #5E6C80;
  font-size: 14px;
}

/* the subject labels sit in a row here, so the gap does the spacing */
.volunteerpage .request-needs .session-subject {
  margin-right: 0;
}

.volunteerpage .request-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* a tablet or a narrow window: the buttons go under the child's details, lined up with the text */
@media (max-width: 991px) {
  .volunteerpage .request-card {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .volunteerpage .request-actions {
    width: 100%;
    padding-left: 72px; /* the photo (56px) + the gap (16px), so the buttons start under the name */
  }
}

/* a phone: the buttons are full width and share the row */
@media (max-width: 575px) {
  .volunteerpage .request-actions {
    padding-left: 0;
  }

  .volunteerpage .request-actions .btn {
    flex: 1;
  }
}

.volunteerpage .request-status {
  padding: 7px 16px;
  border-radius: 999px;
  font-weight: 700;
  white-space: nowrap;
}

.volunteerpage .request-status-accepted {
  background: #CDE9D8;
  color: #213C31;
}

.volunteerpage .request-status-declined {
  background: #EDEDED;
  color: #555;
}
</style>