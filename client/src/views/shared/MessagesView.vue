<!-- =============================================================
  Messages: parent <-> teacher, one conversation per child.   Owner: Kat
  Route: /messages/:childId?   (used by parents and teachers)
  Its styles are in css/messagespage.css
============================================================= -->
<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { io } from 'socket.io-client'
import api, { errorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/PageHeader.vue'
import StateMessage from '@/components/StateMessage.vue'
import ChatThread from '@/components/ChatThread.vue'
import '@/css/parentshared.css' // what the parent pages have in common
import '@/css/messagespage.css' // the styles of this page and of the chat

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// the sentence under the title, for each kind of user
const subtitle = computed(() => {
  if (auth.role === 'parent') return "Chat with your child's teachers."
  return 'Chat with parents about their child.'
})

// ---------- the things this page remembers ----------
const children = ref([]) // the children this user can chat about
const messages = ref([]) // the messages of the child we are showing
const unread = ref({}) // how many unread messages each child has, like { c_1: 2 }
const loading = ref(true) // true while the page is first loading
const sending = ref(false) // true while a message is on its way to the server
const error = ref('') // the error sentence, empty if there is no error

// ---------- live messages (socket.io) ----------
// the live connection, and the "room" of the child we are showing (the server only sends us that child's messages)
let socket = null
let currentRoom = null

function joinRoom(childId) {
  if (!socket || !childId || childId === currentRoom) return
  if (currentRoom) socket.emit('leave', currentRoom)
  currentRoom = childId
  socket.emit('join', childId)
}

// add a message to the chat, unless it is already there.
// Our own message can arrive twice (live and as the answer to our request), so we check first.
function addMessage(message) {
  if (!messages.value.find((item) => item.id === message.id)) {
    messages.value.push(message)
  }
}

// ---------- talking to the server ----------
async function loadUnread() {
  try {
    const response = await api.get('/messages/unread')
    unread.value = response.data
  } catch {
    unread.value = {} // the badges are not important, the page works without them
  }
}

async function loadMessages(childId) {
  if (!childId) return
  try {
    const response = await api.get('/messages', { params: { childId } })
    messages.value = response.data
    unread.value[childId] = 0
    // tell the server these messages are read (this also clears the badge in the top bar)
    api.put('/messages/read', { childId }).catch(() => {})
  } catch (err) {
    error.value = errorMessage(err)
  }
}

async function onSend(text) {
  if (!route.params.childId) return // no child is open, so there is nobody to message
  sending.value = true
  try {
    const response = await api.post('/messages', { childId: route.params.childId, text })
    addMessage(response.data)
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    sending.value = false
  }
}

// open the chat of a child: the child goes into the address, like /messages/c_1
function selectChild(childId) {
  router.push({ name: 'messages', params: { childId } })
}

// when the address changes (/messages/c_1 -> /messages/c_7), load that child and join its room
watch(
  () => route.params.childId,
  (childId) => {
    loadMessages(childId)
    joinRoom(childId)
  },
)

onMounted(async () => {
  // connect for live messages. The server refuses a connection without a valid login (auth.token).
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  socket = io(apiBase, { auth: { token: auth.token }, transports: ['websocket', 'polling'] })
  socket.on('new-message', addMessage)

  try {
    const response = await api.get('/children')
    children.value = response.data
    await loadUnread()
    if (!route.params.childId && children.value.length > 0) {
      selectChild(children.value[0].id) // no child in the address yet: open the first one
    } else {
      await loadMessages(route.params.childId)
      joinRoom(route.params.childId)
    }
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (socket) socket.disconnect()
})
</script>

<template>
  <div class="container py-4 messagespage">
    <PageHeader title="Messages" :subtitle="subtitle" />

    <StateMessage v-if="loading" type="loading" />
    <StateMessage v-else-if="error" type="error" :message="error" />

    <template v-else>
      <!-- one button for each child -->
      <div class="child-buttons" data-test="child-list">
        <button
          v-for="child in children"
          :key="child.id"
          type="button"
          class="child-button"
          :class="{ selected: child.id === route.params.childId }"
          data-test="child-item"
          @click="selectChild(child.id)"
        >
          {{ child.name }}
          <span v-if="unread[child.id] > 0" class="unread-badge">{{ unread[child.id] }}</span>
        </button>
      </div>

      <ChatThread :messages="messages" :current-user-id="auth.user.id" :sending="sending" @send="onSend" />
    </template>
  </div>
</template>
