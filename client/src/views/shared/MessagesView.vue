<!-- =============================================================
  Messages: parent <-> teacher, one conversation per child.   Owner: Kat
  Route: /messages/:childId?   (used by parents and teachers)
  Its styles are in the style block at the bottom of this file
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
import '@/css/parent/parentshared.css' // what the parent pages have in common
import '@/css/main/labels.css' // the capital-letter captions

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

<style>
/* INTERNAL CSS: only this page uses these styles, so they live here in the .vue file. (CSS shared by several pages is in src/css/.) */

/* Styles for the messages page (MessagesView.vue) and the chat (ChatThread.vue).
   Every rule starts with .messagespage so it only affects that page.
   Colours:
     #414F67 navy       text
     #DDF0EF pale aqua  my messages (the same pale aqua as the tiles and tags of the parent page)
     #F5DF98 yellow     the line round the typing box and the send button
     #FBF5DC pale yellow the send button when it is off
     #F6D1AA peach      unread messages
     #F9F1E6 cream      the chat
     #5E6C80 grey       small text
     #CFE0DE            thin borders
   Look: no dark outlines, soft corners and round pills, like the parent page. */

/* ---------- the whole page ---------- */

/* the sentence under the title (PageHeader.vue is shared, so only the colour and the size are set here) */
.messagespage .lapis-page-header .page-subtitle {
  color: #5E6C80;
  font-size: 14px;
  font-weight: 400;
}

/* ---------- the child buttons ---------- */

.messagespage .child-buttons {
  margin-bottom: 12px;
}

.messagespage .unread-badge {
  display: inline-block;
  min-width: 18px;
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 999px;
  background: #F6D1AA;
  font-size: 12px;
  line-height: 18px;
  text-align: center;
}

/* ---------- the chat ---------- */

/* the messages grow and scroll, the typing box stays at the bottom */
.messagespage .chat {
  display: flex;
  flex-direction: column;
  height: 500px;
  border-radius: 22px;
  background: #F9F1E6;
  box-shadow: 0 1px 6px rgba(65, 79, 103, 0.1);
}

.messagespage .chat-messages {
  flex-grow: 1;
  overflow: auto;
  padding: 16px;
}

.messagespage .empty-chat {
  margin-top: 24px;
  text-align: center;
  color: #5E6C80;
}

/* the date in the middle of the chat, like Telegram */
.messagespage .date-pill {
  width: fit-content;
  margin: 8px auto 12px;
  padding: 2px 12px;
  border-radius: 999px;
  background: #414F67;
  color: #F9F1E6;
  font-size: 12px;
  font-weight: 700;
}

/* one line of the chat: on the left, unless the message is mine */
.messagespage .message-row {
  display: flex;
  margin-bottom: 8px;
}

.messagespage .message-row.from-me {
  justify-content: flex-end;
}

/* the bubble: white for the other person, pale aqua for me */
.messagespage .bubble {
  max-width: 78%;
  padding: 9px 15px;
  border-radius: 18px;
  border-bottom-left-radius: 6px;
  background: #FFFFFF;
  box-shadow: 0 1px 3px rgba(65, 79, 103, 0.08);
}

.messagespage .from-me .bubble {
  border-bottom-left-radius: 18px;
  border-bottom-right-radius: 6px;
  background: #DDF0EF;
}

.messagespage .bubble-name,
.messagespage .bubble-time {
  color: #5E6C80;
}

.messagespage .from-me .bubble-name,
.messagespage .from-me .bubble-time {
  color: #414F67;
}

.messagespage .bubble-name {
  margin-bottom: 2px;
  font-size: 12px;
  font-weight: 700;
}

.messagespage .bubble-time {
  margin-top: 3px;
  text-align: right;
  font-size: 11px;
}

/* ---------- the typing box ---------- */

.messagespage .chat-input-row {
  display: flex;
  gap: 8px;
  padding: 12px;
}

.messagespage .chat-input {
  flex: 1;
  min-width: 0;
  padding: 9px 16px;
  border: 1px solid #CFE0DE;
  border-radius: 999px;
  background: #FFFFFF;
  color: #414F67;
  font: inherit;
}

.messagespage .chat-input:focus {
  outline: none;
  border-color: #F5DF98;
  box-shadow: 0 0 0 3px #F5DF98;
}

.messagespage .chat-input::placeholder {
  color: #5E6C80;
}

.messagespage .send-button {
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: #F5DF98;
  color: #414F67;
  font-size: 18px;
}

.messagespage .send-button:disabled {
  background: #FBF5DC;
  color: #5E6C80;
}

/* ===== The same page for a teacher: the messages page and the chat in the teacher's colours.
   The page is shared with the parent, so these rules only apply under .role-teacher and win over messagespage.css.
   Colours (the same as teacherpage.css):
     #3D3454 deep plum        text
     #5B4B8A plum             the page title
     #7D7690 grey plum        small text
     #D5CBEA lavender         the chosen child, the send button
     #F0EAF8 pale lavender    the send button when it is off
     #DED5F0 soft lavender    my messages
     #FBE7A1 yellow           unread messages (the same yellow as the dot in the menu)
     #F9F1E6 sand             the chat (the same as on the other pages)
     #E3DBF0                  thin borders
   Look: the same as the other teacher pages: a sandy board, white cards, round pills, a very light shadow. */

/* ---------- the whole page ---------- */

.role-teacher .messagespage {
  color: #3D3454;
}

.role-teacher .messagespage .lapis-page-header .page-title {
  color: #5B4B8A;
}

.role-teacher .messagespage .lapis-page-header .page-subtitle {
  color: #7D7690;
}

/* ---------- the child buttons: white chips, lavender when chosen (like the filters on the other teacher pages) ---------- */

body .role-teacher .messagespage .child-button {
  background: #FFFFFF;
  box-shadow: 0 1px 6px rgba(61, 52, 84, 0.1);
  color: #3D3454;
}

body .role-teacher .messagespage .child-button.selected {
  background: #D5CBEA;
}

body .role-teacher .messagespage .unread-badge {
  background: #FBE7A1;
}

/* ---------- the chat ---------- */

.role-teacher .messagespage .chat {
  box-shadow: 0 1px 6px rgba(61, 52, 84, 0.1);
}

.role-teacher .messagespage .empty-chat,
.role-teacher .messagespage .bubble-name,
.role-teacher .messagespage .bubble-time {
  color: #7D7690;
}

body .role-teacher .messagespage .date-pill {
  background: #5B4B8A;
}

.role-teacher .messagespage .bubble {
  box-shadow: 0 1px 3px rgba(61, 52, 84, 0.08);
}

.role-teacher .messagespage .from-me .bubble {
  background: #DED5F0;
}

.role-teacher .messagespage .from-me .bubble-name,
.role-teacher .messagespage .from-me .bubble-time {
  color: #3D3454;
}

/* ---------- the typing box ---------- */

.role-teacher .messagespage .chat-input {
  border-color: #E3DBF0;
  color: #3D3454;
}

.role-teacher .messagespage .chat-input:focus {
  border-color: #6B5CA5;
  box-shadow: 0 0 0 3px #D5CBEA;
}

.role-teacher .messagespage .chat-input::placeholder {
  color: #7D7690;
}

.role-teacher .messagespage .send-button {
  background: #D5CBEA;
  color: #3D3454;
}

.role-teacher .messagespage .send-button:hover {
  background: #C7BBE0;
}

.role-teacher .messagespage .send-button:disabled {
  background: #F0EAF8;
  color: #7D7690;
}
</style>
