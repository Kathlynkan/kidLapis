// =============================================================
// Gamification rules                          Owner: Jachin
// =============================================================

export const BADGES = [
  { id: 'first-quest', icon: '🌱', name: 'First Quest', rule: 'Complete your first homework' },
  { id: 'streak-3', icon: '🔥', name: 'On Fire', rule: 'Complete 3 homework in a row on time' },
  { id: 'fraction-hero', icon: '🍕', name: 'Fraction Hero', rule: 'Score 4/5 or more on Fractions in 2 sessions' },
  { id: 'bookworm', icon: '📚', name: 'Bookworm', rule: 'Complete 2 English homework' },
  { id: 'century', icon: '💯', name: 'Century', rule: 'Earn 100 points' },
  { id: 'rising-star', icon: '📈', name: 'Rising Star', rule: 'Improve by 15% in any subject (3+ sessions)' },
]

export function earnedBadges(child, homework, sessions) {
  const verified = homework.filter((h) => h.status === 'verified')

  return BADGES.filter((badge) => {
    switch (badge.id) {
      case 'first-quest':
        return verified.length >= 1

      case 'streak-3': {
        const sorted = [...verified]
          .filter((h) => h.completedAt)
          .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
        let streak = 0
        for (const h of sorted) {
          if (h.completedAt.slice(0, 10) <= h.dueDate) {
            streak++
            if (streak >= 3) return true
          } else {
            streak = 0
          }
        }
        return false
      }

      case 'fraction-hero': {
        const fractionSessions = sessions.filter(
          (s) =>
            s.topic.toLowerCase().includes('fraction') &&
            s.attempted > 0 &&
            s.correct / s.attempted >= 0.8,
        )
        return fractionSessions.length >= 2
      }

      case 'bookworm':
        return verified.filter((h) => h.subject === 'English').length >= 2

      case 'century':
        return (child.points || 0) >= 100

      case 'rising-star': {
        // Group by subject (not topic) so free-text volunteer notes don't fragment progress
        const bySubject = {}
        for (const s of sessions) {
          if (!s.attempted) continue
          bySubject[s.subject] = bySubject[s.subject] || []
          bySubject[s.subject].push(s)
        }
        return Object.values(bySubject).some((list) => {
          if (list.length < 3) return false
          const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date))
          const first = sorted[0].correct / sorted[0].attempted
          const last = sorted[sorted.length - 1].correct / sorted[sorted.length - 1].attempted
          return last - first >= 0.15
        })
      }

      default:
        return false
    }
  })
}

export function levelFor(points) {
  return { level: Math.floor(points / 100) + 1, progress: points % 100 }
}
