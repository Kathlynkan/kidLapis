<!-- TopicSummaryChart - average accuracy per subject (bar chart)  Owner: Jachin
     Used on: Child profile (Yuqi), Teacher dashboard (Yu Xuan)
     Props: sessions (Array), title (String) -->
<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from 'chart.js'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps({
  sessions: { type: Array, default: () => [] },
  title: { type: String, default: 'Accuracy by subject' },
})

// Fixed order matches PSLE subjects
const SUBJECT_ORDER = ['English', 'Math', 'Science', 'Mother Tongue']
const SUBJECT_COLOR = {
  'English':      '#88C0D8', // --subject-english  (sky blue)
  'Math':         '#D4B840', // --subject-math      (amber — not lime, avoids volunteer-role clash)
  'Science':      '#F5DF98', // --subject-science   (yellow)
  'Mother Tongue':'#E8906C', // --subject-mother-tongue (coral — not pink, avoids child-role clash)
}

const bySubject = computed(() => {
  const groups = {}
  for (const s of props.sessions) {
    const key = s.subject || 'Other'
    groups[key] ??= { subject: key, attempted: 0, correct: 0 }
    groups[key].attempted += s.attempted
    groups[key].correct += s.correct
  }
  return SUBJECT_ORDER
    .filter((k) => groups[k])
    .map((k) => ({
      ...groups[k],
      accuracy: groups[k].attempted ? Math.round((groups[k].correct / groups[k].attempted) * 100) : 0,
    }))
})

const chartData = computed(() => ({
  labels: bySubject.value.map((t) => t.subject),
  datasets: [
    {
      label: 'Accuracy %',
      data: bySubject.value.map((t) => t.accuracy),
      backgroundColor: bySubject.value.map((t) => SUBJECT_COLOR[t.subject] ?? '#C8B8A8'),
      borderColor: bySubject.value.map((t) => SUBJECT_COLOR[t.subject] ?? '#C8B8A8'),
      borderWidth: 1,
      borderRadius: 0,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  scales: {
    x: { min: 0, max: 100, ticks: { callback: (v) => v + '%' } },
  },
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (ctx) => `${ctx.raw}%` } },
  },
}
</script>

<template>
  <div class="lapis-card p-3" data-test="topic-summary-chart">
    <h2 class="h6 mb-3"><i class="bi bi-bar-chart me-2"></i>{{ title }}</h2>
    <p v-if="sessions.length === 0" class="small lapis-muted mb-0">No data yet.</p>
    <div
      v-else
      style="position: relative"
      :style="{ height: Math.max(120, bySubject.length * 52) + 'px' }"
    >
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
