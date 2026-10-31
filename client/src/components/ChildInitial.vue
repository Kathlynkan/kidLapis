<!-- The round picture of a child: their photo when they have one (an avatar like /photos/ethan.webp),
     or else the first letter of their name. The size and colour of the circle come from the page that uses it (.child-initial). -->
<script setup>
import { computed } from 'vue'
import '@/css/main/components.css' // the look of the small parts

const props = defineProps({
  child: { type: Object, required: true },
})

const hasPhoto = computed(() => (props.child.avatar || '').startsWith('/'))
const letter = computed(() => props.child.name.charAt(0).toUpperCase())
</script>

<template>
  <span class="child-initial">
    <img v-if="hasPhoto" :src="child.avatar" alt="" />
    <template v-else>{{ letter }}</template>
  </span>
</template>
