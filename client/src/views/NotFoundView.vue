<!-- Page not found: a white card on the sandy board, in the middle (css/main/authpage.css is shared with the log in page) -->
<script setup>
import { RouterLink } from 'vue-router'
import '@/css/main/authpage.css' // the card on the board, the title and the sentence under it
</script>

<template>
  <div class="container py-4 authpage notfoundpage">
    <div class="auth-box">
      <div class="board">
        <div class="auth-card">
          <span class="notfound-icon"><i class="bi bi-compass"></i></span>
          <header>
            <h1 class="page-title">Page not found</h1>
            <p class="page-subtitle">The page you are looking for does not exist.</p>
          </header>
          <RouterLink to="/" class="notfound-button">Back to Home</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* INTERNAL CSS: only this page uses these styles, so they live here in the .vue file. (CSS shared by several pages is in src/css/.) */

/* The page not found page (NotFoundView.vue). The card, the title and the sentence are shared with the log in page
   (css/main/authpage.css). Here are only the middle alignment, the round icon and the button. */

.notfoundpage .auth-card {
  align-items: center;
  gap: 14px;
  text-align: center;
}

/* the round compass, in the pale colour of the coordinator layer */
.notfoundpage .notfound-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #F0EAF8;
  color: #6B5CA5;
  font-size: 32px;
}

/* a small button with 5px corners, in the pink of the child layer */
.notfoundpage .notfound-button {
  padding: 9px 18px;
  border-radius: 5px;
  background: #E8A0B8;
  color: #4A3F3A;
  font-size: 15px;
  font-weight: 700;
  text-decoration: none;
}

.notfoundpage .notfound-button:hover {
  color: #4A3F3A;
  filter: brightness(0.95);
}
</style>
