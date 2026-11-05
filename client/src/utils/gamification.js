// Each badge is a kueh. The picture is in public/child_badges_images/<image>.webp
export const BADGES = [
  { id: 'first-quest',    kueh: 'Kueh Bingka',  image: 'kueh-bingka',  name: 'First Quest',    rule: 'Complete your first quest',           fact: 'A golden baked cake with a soft, bouncy bite. A treat for a first try!' },
  { id: 'streak-3',       kueh: 'Kueh Salat',   image: 'kueh-salat',   name: 'On Fire',        rule: 'Complete 3 quests in a row on time',  fact: 'Sticky rice with a soft green pandan layer on top. Keep the streak going!' },
  { id: 'quest-champion', kueh: 'Ondeh-Ondeh',  image: 'kueh-ondeh',   name: 'Quest Champion', rule: 'Complete 5 quests',                   fact: 'Chewy pandan balls that burst with gula melaka.' },
  { id: 'bookworm',       kueh: 'Kueh Tutu',    image: 'kueh-tutu',    name: 'Bookworm',       rule: 'Complete 2 English quests',           fact: 'Soft steamed rice cakes on a banana leaf. A cosy kueh for readers.' },
  { id: 'century',        kueh: 'Kueh Bahulu',  image: 'kueh-bahulu',  name: 'Century',        rule: 'Earn 100 stars',                      fact: 'Golden like a coin. Little sponge cakes baked in a mould.' },
  { id: 'rising-star',    kueh: 'Kueh Talam',   image: 'kueh-talam',   name: 'Rising Star',    rule: 'Submit 3 quests before the due date', fact: 'Pandan and coconut layers, stacked up neat and early.' },
]

// A badge is earned when its progress has reached its target.
// Only verified homework counts — badges unlock when the volunteer checks the quest.
export function earnedBadges(child, homework) {
  const verifiedOnly = homework.filter((h) => h.status === 'verified')
  return BADGES.filter((badge) => {
    const { current, target } = badgeProgress(badge, child, verifiedOnly)
    return current >= target
  })
}

// Progress toward a single badge (current / target) — used for "next badge" nudge and for earnedBadges
// Counts both 'submitted' and 'verified' so badges unlock as soon as the child hands in the work.
export function badgeProgress(badge, child, homework) {
  const completed = homework.filter((h) => h.status === 'verified' || h.status === 'submitted')
  switch (badge.id) {
    case 'first-quest':
      return { current: Math.min(completed.length, 1), target: 1 }

    case 'streak-3': {
      const sorted = [...completed]
        .filter((h) => h.completedAt)
        .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
      let streak = 0, best = 0
      for (const h of sorted) {
        // <= because "on time" includes the due date itself
        if (h.completedAt.slice(0, 10) <= h.dueDate) { streak++; best = Math.max(best, streak) }
        else streak = 0
      }
      return { current: Math.min(best, 3), target: 3 }
    }

    case 'quest-champion':
      return { current: Math.min(completed.length, 5), target: 5 }

    case 'bookworm':
      return { current: Math.min(completed.filter((h) => h.subject === 'English').length, 2), target: 2 }

    case 'century': {
      const pendingPoints = completed
        .filter((h) => h.status === 'submitted')
        .reduce((sum, h) => sum + h.points, 0)
      return { current: Math.min((child.points || 0) + pendingPoints, 100), target: 100 }
    }

    case 'rising-star': {
      // < (strictly before) because the rule is "before the due date", not "by the due date"
      const early = completed.filter(
        (h) => h.completedAt && h.dueDate && h.completedAt.slice(0, 10) < h.dueDate,
      ).length
      return { current: Math.min(early, 3), target: 3 }
    }

    default:
      return { current: 0, target: 1 }
  }
}

export function levelFor(points) {
  const STEP = 50
  const raw = points % STEP
  return {
    level: Math.floor(points / STEP) + 1,
    progress: Math.round((raw / STEP) * 100),  // 0–100 pct — used by progress bars and cake fill
    starsToNext: STEP - raw,                   // actual stars still needed for next level
  }
}
