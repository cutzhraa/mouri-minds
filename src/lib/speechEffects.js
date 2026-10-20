export function playSugoiEffect() {
  if (typeof window === 'undefined') return

  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance('すごい！')
  utterance.lang = 'ja-JP'
  utterance.rate = 1.05
  utterance.pitch = 1.18
  utterance.volume = 1
  const japaneseVoice = window.speechSynthesis.getVoices()
    .find(voice => voice.lang?.toLowerCase().startsWith('ja'))
  if (japaneseVoice) utterance.voice = japaneseVoice
  window.speechSynthesis.speak(utterance)
}

export function playFailureEffect() {
  if (typeof window === 'undefined') return
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return

  const context = new AudioContextClass()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const now = context.currentTime

  oscillator.type = 'triangle'
  oscillator.frequency.setValueAtTime(420, now)
  oscillator.frequency.exponentialRampToValueAtTime(180, now + 0.22)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.025)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(now)
  oscillator.stop(now + 0.25)
  oscillator.onended = () => context.close()
}
