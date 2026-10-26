<!-- =============================================================
  ChatThread - the chat bubbles and the box to type a message.   Owner: Kat
  It only shows things. The page that uses it (MessagesView.vue)
  loads the messages and sends the new ones to the server.
============================================================= -->
<script setup>
import { ref } from 'vue'

// The page gives the chat box the messages, who is logged in and whether it’s busy sending, and the chat box only displays them and tells the page when you press send
const props = defineProps({
  messages: { type: Array, default: () => [] }, // all the messages of the chat
  currentUserId: { type: String, required: true }, // the id of the person who is logged in
  sending: { type: Boolean, default: false }, // true while a message is being sent
})

// doesn’t send anything to the server itself. It tells the page “send this text"
const emit = defineEmits(['send'])

// what the user is typing right now
const draft = ref('')

// true when the message was written by the person who is logged in, deciding if the speech bubble appears on the left or right 
function isMine(message) {
  return message.fromId === props.currentUserId
}

// when the user presses the send button (or Enter)
function submit() {
  const text = draft.value.trim() // remove spaces at the start and the end
  if (text === '') return // do not send an empty message
  emit('send', text)
  draft.value = '' // clear the box
}

// dayOf takes the date text that the server saved with a message, turns it into a real date, and writes out only the day and month in Singapore style, like “21 October”.
function dayOf(isDate) {
  const date = new Date(isDate)
  return date.toLocaleDateString('en-SG', { day: 'numeric', month: 'long' })
  //month: 'long' tells the date-writing function to spell the month out in full, like “October”
}

// For each message, check if it was sent on a different day from the message above it. If yes, show the date. If not, don’t
function startsNewDay(index) {
  if (index === 0) return true // the very first message always gets a date
  const day = dayOf(props.messages[index].sentAt) // the loop will go through every message, once the date of the messages are different, start a new date 
  const dayBefore = dayOf(props.messages[index - 1].sentAt)
  return day !== dayBefore // true when it is a different day from the message before
}

// the time of a message, like "9:40 am"
function time(isDate) {
  const date = new Date(isDate) // turn the saved text into a real date
  const options = { hour: 'numeric', minute: '2-digit' } // show the hour and the minutes only
  return date.toLocaleTimeString('en-SG', options) // The browser gets the time and timezone from the computer’s operating system, toLocaleTimeString is a built-in JavaScript function that takes a date and writes out its time as text, 
  // where 'en-SG' picks the Singapore English style (like “9:40 am”) and the options object { hour: 'numeric', minute: '2-digit' } picks which parts to show, so we get just the hour and the minutes without the seconds.
}
</script>

<template>
  <div class="cb-card cb-card-blue chat">
    <!-- the messages -->
    <div class="chat-messages" data-test="chat-messages"> <!-- data test is for the testing -->
      <p v-if="messages.length === 0" class="empty-chat">No messages yet. Say hello!</p>

      <!-- A loop draws one bubble for each message. It checks whether the logged-in person wrote that message, to put it on the right or the left, and fills the bubble with the sender’s name, the text and the time -->
      <template v-for="(message, index) in messages" :key="message.id">
        <!-- the date in the middle, only above the first message of each day -->
        <div v-if="startsNewDay(index)" class="date-pill">{{ dayOf(message.sentAt) }}</div>

        <div class="message-row" :class="{ 'from-me': isMine(message) }">
          <div class="bubble">
            <div class="bubble-name">{{ message.fromName }}</div>
            <div class="bubble-text">{{ message.text }}</div>
            <div class="bubble-time">{{ time(message.sentAt) }}</div>
          </div>
        </div>
      </template>
    </div>

    <!-- the box to type a new message -->
    <form class="chat-input-row" @submit.prevent="submit"> <!--runs the submit button and prevents the page frm reloading-->

      <input v-model="draft" class="form-control" placeholder="Type a message..." data-test="chat-input" /> <!-- saves a draft of whatever user types -->
      <button class="btn btn-primary" type="submit" aria-label="Send" :disabled="sending || draft.trim() === ''" data-test="chat-send"> <!-- the button is disabkles whenit is sending a message or when the message is empty after white spaces are trimmed -->
        ➤
      </button>
    </form>
  </div>
</template>

<style scoped>
/* the whole chat: the messages grow, the typing box stays at the bottom */
.chat {
  display: flex; 
  flex-direction: column;
  height: 500px; 
  padding-top: 8px;
}

.chat-messages {
  flex-grow: 1; /* tells the messages area to take up all the leftover space, so the typing box is pushed to the bottom */
  overflow: auto; /* adds a scroll bar when there are too many msgs */
  padding: 16px;
}

.empty-chat {
  margin-top: 24px; 
  text-align: center;
  color: #8D7F77; 
}

/* the date in the middle of the chat, like Telegram */
.date-pill {
  width: fit-content;
  margin: 12px auto;
  padding: 2px 12px;
  border-radius: 12px;
  background: rgba(74, 63, 58, 0.55);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

/* one line of the chat: on the left, unless the message is mine */
.message-row {
  display: flex;
  margin-bottom: 8px;
}
.message-row.from-me {
  justify-content: flex-end;
}

/* the bubble: light blue for the other person */
.bubble {
  max-width: 78%;
  padding: 8px 14px;
  border: 1px solid #4890B8;
  border-radius: 14px;
  border-bottom-left-radius: 4px;
  background: #DFF0F8;
  font-weight: 500;
}

/* my bubble: darker blue, with the small corner on the right */
.from-me .bubble {
  background: #88C0D8;
  border-bottom-left-radius: 14px;
  border-bottom-right-radius: 4px;
}

.bubble-name {
  margin-bottom: 2px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.bubble-text {
  font-size: 15px;
}

.bubble-time {
  margin-top: 3px;
  text-align: right;
  font-size: 11px;
}

/* the typing box */
.chat-input-row {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-top: 3px solid #4890B8;
}
</style>
