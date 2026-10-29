<!-- A child's avatar: an emoji, or a photo when the avatar is a picture file like /photos/mia.webp.
     It is as big as the text round it, so it works wherever an emoji was. -->
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
