<script setup>
import { computed } from 'vue'

const props = defineProps({
  person: { type: Object, required: true }, // { name, avatar? }
  size: { type: Number, default: 22 }, // px
})

const isPhoto = computed(() => typeof props.person.avatar === 'string' && /^(\/|https?:)/.test(props.person.avatar))
const initial = computed(() => (props.person.name || '?').trim().charAt(0).toUpperCase())
</script>

<template>
  <span
    class="mini-avatar"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.55)}px` }"
    aria-hidden="true"
  >
    <img v-if="isPhoto" :src="person.avatar" alt="" />
    <template v-else>{{ person.avatar || initial }}</template>
  </span>
</template>

<style scoped>
.mini-avatar {
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  background: #f0eaf8;
  color: #6b5ca5;
  font-weight: 700;
  line-height: 1;
}
.mini-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>