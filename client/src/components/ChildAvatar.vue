<script setup>
import '@/css/main/components.css' // the look of the small parts

defineProps({
  avatar: { type: String, default: '' },
})
</script>

<template>
  <img v-if="avatar.startsWith('/')" class="child-avatar" :src="avatar" alt="" />
  <template v-else>{{ avatar }}</template>
</template>
