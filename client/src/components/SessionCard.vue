<!-- =============================================================
  SessionCard - one past session in the history list.   Owner: Ning Xuan
============================================================= -->
<script setup>
import { ref } from 'vue'
import { formatDate, accuracy } from '@/utils/format'
import { MOODS } from '@/utils/constants'

const props = defineProps({
  session: { type: Object, required: true },
  canEdit: { type: Boolean, default: false },
})
const emit = defineEmits(['edit', 'delete'])

const mood = MOODS.find((m) => m.value === props.session.mood)
const showDeleteModal = ref(false)
const showFullNotes = ref(false)

function handleDelete() { showDeleteModal.value = true }
function confirmDelete() { emit('delete', props.session.id); showDeleteModal.value = false }
function cancelDelete()  { showDeleteModal.value = false }
</script>

<template>
  <div class="lapis-card lapis-card-lime lapis-card-top p-3" data-test="session-card">
    <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
      <div>
        <strong style="color:var(--lapis-plum)">{{ session.subject }} - {{ session.topic }}</strong>
        <div class="small" style="color:var(--lapis-muted)">
          {{ formatDate(session.date) }} &middot; by {{ session.volunteerName }}
          <span v-if="mood" class="chip chip-social ms-1">{{ mood.emoji }} {{ mood.label }}</span>
        </div>
      </div>
      <span
        class="badge align-self-start fs-6"
        style="background:var(--topic-academic);color:var(--lapis-plum)"
      >
        {{ session.correct }}/{{ session.attempted }} &middot; {{ accuracy(session) }}%
      </span>
    </div>

    <div class="small" style="color:var(--lapis-plum)">
      <div v-if="session.struggles.length">
        <i class="bi bi-exclamation-circle me-1" style="color:var(--lapis-pink)"></i>Struggled with:
        <span
          v-for="s in session.struggles"
          :key="s"
          class="badge me-1"
          style="background:var(--topic-academic-soft);color:var(--lapis-plum)"
        >{{ s }}</span>
      </div>
      <div>
        <i class="bi bi-lightbulb me-1" style="color:var(--lapis-yellow)"></i>
        What worked: {{ session.whatWorked || '-' }}
      </div>
      <div>
        <i class="bi bi-flag me-1" style="color:var(--lapis-purple)"></i>
        Next step: {{ session.nextStep || '-' }}
      </div>

      <div v-if="session.notes" class="mt-1 fst-italic text-break">
        <template v-if="showFullNotes">"{{ session.notes }}"</template>
        <template v-else>
          "{{ session.notes.slice(0, 100) }}<span v-if="session.notes.length > 100">..."</span>
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
    </div>

    <div v-if="canEdit" class="mt-2 d-flex gap-2">
      <button class="btn btn-sm btn-outline-primary" @click="emit('edit', session.id)">
        <i class="bi bi-pencil"></i> Edit
      </button>
      <button class="btn btn-sm btn-outline-danger" @click="handleDelete">
        <i class="bi bi-trash"></i> Delete
      </button>
    </div>
  </div>

  <!-- Delete confirm modal -->
  <div v-if="showDeleteModal" class="modal fade show d-block" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Delete Session</h5>
        </div>
        <div class="modal-body" style="color:var(--lapis-plum);font-weight:500">
          <p>Are you sure you want to delete this session?</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-sm" @click="cancelDelete">Cancel</button>
          <button type="button" class="btn btn-danger btn-sm" @click="confirmDelete">Delete</button>
        </div>
      </div>
    </div>
  </div>
  <div v-if="showDeleteModal" class="modal-backdrop fade show"></div>
</template>
