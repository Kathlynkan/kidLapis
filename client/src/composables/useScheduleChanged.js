import { onMounted, onUnmounted } from 'vue'

export function useScheduleChanged(reload, { isLoading } = {}) {
  async function reloadSilently() {
    if (isLoading?.value) return // the page is still doing its first load
    try {
      await reload()
    } catch {
      // keep showing the old data; the next change (or a refresh) will try again
    }
  }

  onMounted(() => window.addEventListener('schedule-changed', reloadSilently))
  onUnmounted(() => window.removeEventListener('schedule-changed', reloadSilently))

  return reloadSilently // in case a page wants to call it itself
}