const DAILY_KEY = 'mouri_daily_learning_v1'
const LAST_MODULE_KEY = 'mouri_last_module_v1'

function todayKey() {
  return new Date().toLocaleDateString('en-CA')
}

export function recordLearning(count = 1) {
  const today = todayKey()
  let history = {}
  try { history = JSON.parse(localStorage.getItem(DAILY_KEY) || '{}') } catch { /* reset malformed local data */ }
  history[today] = (history[today] || 0) + count
  localStorage.setItem(DAILY_KEY, JSON.stringify(history))
}

export function recordLastModule(module) {
  localStorage.setItem(LAST_MODULE_KEY, module)
}

export function readLearningOverview() {
  let history = {}
  try { history = JSON.parse(localStorage.getItem(DAILY_KEY) || '{}') } catch { /* reset malformed local data */ }
  const today = todayKey()
  const target = 5
  let streak = 0
  const cursor = new Date()
  if (!history[today]) cursor.setDate(cursor.getDate() - 1)
  while (history[cursor.toLocaleDateString('en-CA')]) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return {
    streak,
    practicedToday: history[today] || 0,
    target,
    lastModule: localStorage.getItem(LAST_MODULE_KEY) || 'hiragana'
  }
}
