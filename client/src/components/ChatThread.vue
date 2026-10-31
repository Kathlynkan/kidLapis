<!-- =============================================================
  ChatThread - the chat bubbles and the box to type a message.   Owner: Kat
  It only shows things. The page that uses it (MessagesView.vue)
  loads the messages and sends the new ones to the server.
  Its styles are in the style block of views/shared/MessagesView.vue
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
  <div class="chat">
    <!-- the messages -->
    <div class="chat-messages" data-test="chat-messages">
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
    <!-- pressing send (or Enter) runs submit, and the page does not reload -->
    <form class="chat-input-row" @submit.prevent="submit">
      <!-- v-model keeps what the user types in draft -->
      <input v-model="draft" class="chat-input" placeholder="Type a message..." data-test="chat-input" />
      <!-- the button is off while a message is being sent, or when the box is empty (spaces do not count) -->
      <button class="send-button" type="submit" aria-label="Send" :disabled="sending || draft.trim() === ''" data-test="chat-send"><i class="bi bi-send-fill"></i></button>
    </form>
  </div>
</template>
