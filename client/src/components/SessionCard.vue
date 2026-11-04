<!-- =============================================================
  SessionCard - one past session in the history list.   Owner: Ning Xuan
  Shows the learning part first, then the social part (lunch, play, friends) under a thin line,
  so a volunteer can see everything they wrote before editing it (social part added by Yuqi).
  The look for a volunteer is in the style block of views/volunteer/ChildProfileView.vue
============================================================= -->
<script setup>
import { ref, computed } from 'vue'
import { formatDate, accuracy, subjectStyle, activitiesOf } from '@/utils/format'
import { MOODS } from '@/utils/constants'
import '@/css/main/components.css' // the look of the small parts

const props = defineProps({
  session: { type: Object, required: true },
  canEdit: { type: Boolean, default: false },
})
const emit = defineEmits(['edit', 'delete'])

const mood = MOODS.find((m) => m.value === props.session.mood)
const showDeleteModal = ref(false)
const showFullNotes = ref(false)
const activities = computed(() => activitiesOf(props.session)) // e.g. ['Chess', 'Drawing']

const PORTION_WORDS = { All: 'ate it all', Most: 'ate most of it', Half: 'ate half', Little: 'ate a little', None: "didn't eat" }

// true if the volunteer filled in anything social
const hasSocial = computed(() => {
  const s = props.session
  return Boolean(s.meal || s.portion || activities.value.length || s.interaction || s.behaviour || s.socialNotes)
})

function handleDelete() { showDeleteModal.value = true }
function confirmDelete() { emit('delete', props.session.id); showDeleteModal.value = false }
function cancelDelete()  { showDeleteModal.value = false }
</script>

<template>
  <div class="lapis-card lapis-card-lime lapis-card-top session-card p-3" data-test="session-card">
    <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
      <div>
        <span class="session-subject" :style="subjectStyle(session.subject)">{{ session.subject }}</span><strong class="session-title">{{ session.topic }}</strong>
        <div class="small session-meta">
          {{ formatDate(session.date) }} &middot; by {{ session.volunteerName }}
          <span v-if="mood" class="chip chip-social session-mood ms-1">
            <i class="bi" :class="mood.face"></i>{{ mood.label }}
          </span>
        </div>
      </div>
      <span class="badge session-score align-self-start">
        {{ session.correct }}/{{ session.attempted }} &middot; {{ accuracy(session) }}%
      </span>
    </div>

    <div class="small session-lines">
      <div v-if="session.struggles.length">
        <i class="bi bi-exclamation-circle me-1 session-icon icon-struggle"></i>Struggled with:
        <span v-for="s in session.struggles" :key="s" class="badge session-tag me-1">{{ s }}</span>
      </div>
      <div>
        <i class="bi bi-lightbulb me-1 session-icon icon-worked"></i>
        What worked: {{ session.whatWorked || '-' }}
      </div>
      <div>
        <i class="bi bi-flag me-1 session-icon icon-next"></i>
        Next step: {{ session.nextStep || '-' }}
      </div>

      <div v-if="session.notes" class="mt-1 fst-italic text-break">
        <template v-if="showFullNotes">"{{ session.notes }}"</template>
        <template v-else>
          "{{ session.notes.slice(0, 100) }}"<span v-if="session.notes.length > 100">..."</span>
        </template>
        <br />
        <button
          v-if="session.notes.length > 100"
          class="btn btn-link btn-sm p-0 ms-1"
          @click="showFullNotes = !showFullNotes"
        >
          {{ showFullNotes ? 'Show less' : 'Show more' }}
        </button>
      </div>

      <!-- social side: what the volunteer wrote about lunch, play and friends -->
      <div v-if="hasSocial" class="session-social" data-test="session-social">
        <div v-if="session.meal || session.portion">
          <i class="bi bi-egg-fried me-1 session-icon"></i>Lunch:
          {{ session.meal || 'Not noted' }}<template v-if="PORTION_WORDS[session.portion]">, {{ PORTION_WORDS[session.portion] }}</template>
        </div>
        <div v-if="activities.length">
          <i class="bi bi-controller me-1 session-icon"></i>Played: {{ activities.join(', ') }}
        </div>
        <div v-if="session.interaction">
          <i class="bi bi-people me-1 session-icon"></i>With others: {{ session.interaction }}
        </div>
        <div v-if="session.behaviour">
          <i class="bi bi-star me-1 session-icon"></i>Good moment: {{ session.behaviour }}
        </div>
        <div v-if="session.socialNotes" class="fst-italic text-break">"{{ session.socialNotes }}"</div>
      </div>
    </div>

    <template v-if="canEdit">
      <div v-if="!session.parentViewed" class="mt-2 d-flex gap-2">
        <button class="btn btn-sm btn-outline-primary quest-edit" @click="emit('edit', session.id)">
          <i class="bi bi-pencil"></i> Edit
        </button>

        <button class="btn btn-sm btn-outline-danger quest-delete" @click="handleDelete">
          <i class="bi bi-trash"></i> Delete
        </button>
      </div>

      <div v-else class="session-locked">
        <div class="session-locked-title">
          <i class="bi bi-eye me-2"></i>
          Seen by parent · {{ formatDate(session.parentViewed) }}
        </div>

        <div class="session-locked-text">
          The parent has read this session, so it can no longer be edited or deleted.
        </div>
      </div>
    </template>
  </div>

  <Teleport to="body">
    <!-- Delete confirm modal -->
    <div v-if="showDeleteModal" class="modal fade show d-block" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Delete Session</h5>
          </div>
          <div class="modal-body session-delete-text">
            <p>Are you sure you want to delete this session?</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary btn-sm" @click="cancelDelete">
              <i class="bi bi-x-circle"></i> Cancel</button>
            <button type="button" class="btn btn-danger btn-sm" @click="confirmDelete">
              <i class="bi bi-trash"></i> Delete</button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showDeleteModal" class="modal-backdrop fade show"></div>
  </Teleport>
</template>

<style>
.session-card .session-social {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(33, 60, 49, 0.12);
}
</style>