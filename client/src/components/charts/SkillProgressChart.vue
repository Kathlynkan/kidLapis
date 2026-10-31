<!-- SkillProgressChart - accuracy over time, one line per PSLE subject.   Owner: Jachin
     Props: sessions (Array) - from GET /sessions?childId=...
            calm (Boolean) - the quiet look for a volunteer or teacher: one line for the score of each session
            tone ('teal' | 'lavender') - the colour of the quiet look: teal for a volunteer, lavender for a teacher
     Used on: Child profile (Yuqi), Parent page (Kat) -->
<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { accuracy, formatDate } from '@/utils/format'
import '@/css/main/components.css' // the look of the small parts

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler)
ChartJS.defaults.font.family = 'Inter, system-ui, sans-serif' // the same font as the rest of the app

const props = defineProps({
  sessions: { type: Array, default: () => [] },
  calm: { type: Boolean, default: false },
  tone: { type: String, default: 'teal' },
})

const SUBJECT_COLORS = {
  'English':       '#88C0D8',
  'Math':          '#D4B840',
  'Science':       '#F5DF98',
  'Mother Tongue': '#E8906C',
}
const FALLBACK_COLORS = ['#C0A8D8', '#A8CC90', '#F5B880', '#E8A0B8']

const chartData = computed(() => {
  const bySubject = {}
  const sorted = [...props.sessions].sort((a, b) => a.date.localeCompare(b.date))
  for (const s of sorted) {
    bySubject[s.subject] ??= []
    bySubject[s.subject].push(s)
  }
  const allDates = [...new Set(sorted.map((s) => s.date))]
  const datasets = Object.entries(bySubject).map(([subject, list], i) => {
    const color = SUBJECT_COLORS[subject] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]
    const byDate = Object.fromEntries(list.map((s) => [s.date, accuracy(s)]))
    return {
      label: subject,
      data: allDates.map((d) => byDate[d] ?? null),
      borderColor: color,
      backgroundColor: color + '33',
      tension: 0.3,
      spanGaps: true,
    }
  })
  return { labels: allDates.map(formatDate), datasets }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: { min: 0, max: 100, ticks: { callback: (v) => v + '%' } },
  },
  plugins: {
    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}%` } },
    legend: { position: 'bottom' },
  },
}

// the colours of the quiet look: the line, its dots, the small text and the grid
const TONES = {
  teal: { line: '#B7D8D7', fill: 'rgba(183, 216, 215, 0.35)', dot: '#3E6B6A', text: '#6B8177', grid: '#E4E9E6' },
  lavender: { line: '#B8A9DD', fill: 'rgba(184, 169, 221, 0.3)', dot: '#6B5CA5', text: '#7D7690', grid: '#ECE7F5' },
}
const tone = computed(() => TONES[props.tone] ?? TONES.teal)

// the quiet look: one line for the score of each session, oldest to newest
const calmData = computed(() => {
  const sorted = [...props.sessions].sort((a, b) => a.date.localeCompare(b.date))
  return {
    labels: sorted.map((s) => formatDate(s.date)),
    datasets: [
      {
        label: 'Score',
        data: sorted.map((s) => accuracy(s)),
        borderColor: tone.value.line,
        backgroundColor: tone.value.fill,
        fill: true,
        borderWidth: 4,
        tension: 0.3,
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: tone.value.dot,
        pointBorderWidth: 2,
        pointRadius: 4,
        clip: false, // a dot on the edge of the chart (100%) is drawn whole, not cut in half
      },
    ],
  }
})

const calmOptions = computed(() => {
  const text = { color: tone.value.text, font: { family: ChartJS.defaults.font.family } }
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 8, right: 8 } }, // room for the dots on the edge
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { ...text, stepSize: 50, callback: (v) => v + '%' },
        grid: { color: tone.value.grid },
        border: { display: false },
      },
      x: { ticks: text, grid: { display: false }, border: { display: false } },
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `${ctx.raw}%` } },
    },
  }
})

const summaries = computed(() => {
  const bySubject = {}
  for (const s of props.sessions) {
    bySubject[s.subject] ??= []
    bySubject[s.subject].push(s)
  }
  return Object.entries(bySubject).map(([subject, list]) => {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date))
    const n = sorted.length
    if (n === 1) {
      return { topic: subject, text: `${accuracy(sorted[0])}% (1 session — too early to show a trend)` }
    }
    const first = accuracy(sorted[0])
    const last = accuracy(sorted[n - 1])
    const trend = trendLabel(sorted)
    return { topic: subject, text: `${first}% → ${last}% (${n} sessions, ${trend})` }
  })
})

function trendLabel(sorted) {
  if (sorted.length < 2) return 'steady'
  const earlier = sorted.slice(0, -3)
  const last3 = sorted.slice(-3)
  if (earlier.length === 0) return 'not enough data yet'
  const avg = (list) =>
    list.reduce((s, x) => s + (x.attempted ? x.correct / x.attempted : 0), 0) / list.length
  const diff = avg(last3) - avg(earlier)
  if (diff > 0.1) return 'improving ↑'
  if (diff < -0.1) return 'needs attention ↓'
  return 'steady →'
}
</script>

<template>
  <div class="lapis-card p-3" data-test="skill-progress-chart">
    <h2 class="h6 mb-3"><i class="bi bi-graph-up-arrow me-2"></i>Progress over time</h2>
    <p v-if="sessions.length === 0" class="small lapis-muted mb-0">No data yet.</p>
    <template v-else>
      <div class="chart-box chart-box-line">
        <Line :data="calm ? calmData : chartData" :options="calm ? calmOptions : chartOptions" />
      </div>
      <ul class="list-unstyled small mt-3 mb-0" data-test="chart-summary">
        <li v-for="s in summaries" :key="s.topic" class="lapis-muted">
          <strong>{{ s.topic }}:</strong> {{ s.text }}
        </li>
      </ul>
    </template>
  </div>
</template>
