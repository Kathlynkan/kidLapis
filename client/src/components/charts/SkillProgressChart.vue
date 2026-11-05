<script setup>
import { computed, ref, watch } from 'vue'
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
import { SUBJECT_COLORS, SUBJECT_LINE_COLORS } from '@/utils/constants'
import '@/css/main/components.css'

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler)
ChartJS.defaults.font.family = 'Inter, system-ui, sans-serif'

const props = defineProps({
  sessions: { type: Array, default: () => [] },
  calm: { type: Boolean, default: false },
  tone: { type: String, default: 'teal' },
  explain: { type: Boolean, default: false },
})

const FALLBACK_COLORS = ['#C0A8D8', '#A8CC90', '#F5B880', '#E8A0B8']

const subjects = computed(() => {
  const counts = {}
  for (const s of props.sessions) counts[s.subject] = (counts[s.subject] || 0) + 1
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([subject]) => subject)
})

const selectedSubject = ref('')
watch(subjects, (list) => { if (!list.includes(selectedSubject.value)) selectedSubject.value = list[0] ?? '' }, { immediate: true })

// built once per subjects change so indexOf never runs inside the render loop
const pillColors = computed(() =>
  Object.fromEntries(subjects.value.map((subj, i) => [
    subj,
    SUBJECT_COLORS[subj] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  ]))
)

// the deeper colour of the line of the subject that is open
const lineColor = computed(() => SUBJECT_LINE_COLORS[selectedSubject.value] ?? pillColors.value[selectedSubject.value] ?? FALLBACK_COLORS[0])

function pillStyle(subj) {
  const c = pillColors.value[subj]
  return { background: subj === selectedSubject.value ? c : c + '44', borderColor: c }
}

// shared by chartData, calmData and selectedSummary — filtered and sorted once
const selectedSessions = computed(() =>
  [...props.sessions]
    .filter((s) => s.subject === selectedSubject.value)
    .sort((a, b) => a.date.localeCompare(b.date))
)

const chartData = computed(() => {
  const color = lineColor.value
  return {
    labels: selectedSessions.value.map((s) => formatDate(s.date)),
    datasets: [{
      label: selectedSubject.value,
      data: selectedSessions.value.map((s) => accuracy(s)),
      borderColor: color,
      backgroundColor: color + '33',
      tension: 0.3,
      fill: true,
      pointRadius: 4,
      pointBackgroundColor: '#FFFFFF',
      pointBorderColor: color,
      pointBorderWidth: 2,
    }],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: { top: 8, right: 8 } },
  scales: {
    y: {
      min: 0,
      max: 100,
      ticks: { callback: (v) => v + '%' },
      title: { display: props.explain, text: 'Questions correct', font: { size: 12, weight: 'bold' } },
    },
    x: { grid: { display: false } },
  },
  plugins: {
    tooltip: { callbacks: { label: (ctx) => (props.explain ? questionsLabel(ctx) : `${ctx.raw}%`) } },
    legend: { display: false },
  },
}))

const TONES = {
  teal:     { text: '#6B8177', grid: '#E4E9E6' },
  lavender: { text: '#7D7690', grid: '#ECE7F5' },
}
const tone = computed(() => TONES[props.tone] ?? TONES.teal)

const calmData = computed(() => {
  const color = lineColor.value
  return {
    labels: selectedSessions.value.map((s) => formatDate(s.date)),
    datasets: [{
      label: selectedSubject.value,
      data: selectedSessions.value.map((s) => accuracy(s)),
      borderColor: color,
      backgroundColor: color + '44',
      fill: true,
      borderWidth: 4,
      tension: 0.3,
      pointBackgroundColor: '#FFFFFF',
      pointBorderColor: color,
      pointBorderWidth: 2,
      pointRadius: 4,
      clip: false,
    }],
  }
})

const calmOptions = computed(() => {
  const text = { color: tone.value.text, font: { family: ChartJS.defaults.font.family } }
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 8, right: 8 } },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { ...text, stepSize: 50, callback: (v) => v + '%' },
        grid: { color: tone.value.grid },
        border: { display: false },
        title: { display: props.explain, text: 'Questions correct', ...text, font: { family: ChartJS.defaults.font.family, size: 12, weight: 'bold' } },
      },
      x: { ticks: text, grid: { display: false }, border: { display: false } },
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => (props.explain ? questionsLabel(ctx) : `${ctx.raw}%`) } },
    },
  }
})

// "80% correct (8 of 10 questions)" for the dot that is touched
function questionsLabel(ctx) {
  const session = selectedSessions.value[ctx.dataIndex]
  return `${ctx.raw}% correct (${session.correct} of ${session.attempted} questions)`
}

const selectedSummary = computed(() => {
  const list = selectedSessions.value
  if (list.length === 0) return null
  if (list.length === 1) return `${accuracy(list[0])}% (1 session — too early to show a trend)`
  const first = accuracy(list[0])
  const last = accuracy(list[list.length - 1])
  return `${first}% → ${last}% (${list.length} sessions, ${trendLabel(list)})`
})

function trendLabel(sorted) {
  if (sorted.length < 4) return 'not enough data yet'
  const earlier = sorted.slice(0, -3)
  const last3 = sorted.slice(-3)
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
    <p v-if="explain && sessions.length > 0" class="small lapis-muted mb-3" data-test="chart-note">
      Each dot is one session: the share of the questions answered correctly.
    </p>
    <p v-if="sessions.length === 0" class="small lapis-muted mb-0">No data yet.</p>
    <template v-else>
      <div class="spc-picker mb-3" data-test="subject-picker">
        <button
          v-for="subj in subjects"
          :key="subj"
          type="button"
          class="spc-pill"
          :style="pillStyle(subj)"
          @click="selectedSubject = subj"
        >{{ subj }}</button>
      </div>
      <div class="chart-box chart-box-line">
        <Line :data="calm ? calmData : chartData" :options="calm ? calmOptions : chartOptions" />
      </div>
      <p v-if="selectedSummary" class="small lapis-muted mt-3 mb-0" data-test="chart-summary">{{ selectedSummary }}</p>
    </template>
  </div>
</template>

<style scoped>
.spc-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.spc-pill {
  padding: 3px 12px;
  border-radius: 6px;
  border: 1.5px solid transparent;
  background: transparent;
  color: #4A3F3A;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.1s;
}

.spc-pill:hover {
  filter: brightness(0.92);
}
</style>