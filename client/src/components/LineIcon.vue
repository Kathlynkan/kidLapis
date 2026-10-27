<!-- =============================================================
  LineIcon - a small drawn icon, used instead of emoji.   Owner: Kat
  The icons are image files in client/public/icons (face-happy.svg, face-okay.svg, face-tired.svg,
  face-hard.svg, people.svg, star.svg, bowl.svg).
  Props:  name (String)  the name of the file, without .svg
          small (Boolean)  true = a smaller icon, for inside a line of text
  Its size is in css/parentpage.css
============================================================= -->
<script setup>
defineProps({
  name: { type: String, required: true },
  small: { type: Boolean, default: false },
})
</script>

<template>
  <img class="line-icon" :class="{ small }" :src="`/icons/${name}.svg`" alt="" />
</template>
