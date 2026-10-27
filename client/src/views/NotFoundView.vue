<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="container py-5 text-center">
    <div class="display-1">🧭</div>
    <h1 class="h3">Page not found</h1>
    <p class="lapis-muted">The page you are looking for does not exist.</p>
    <RouterLink to="/" class="btn btn-primary">Back to home</RouterLink>
  </div>
</template>
