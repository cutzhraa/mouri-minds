import { useEffect, useState } from 'react'

export default function StrokeOrderGuide({ character, completedStrokes = 0 }) {
  const characters = Array.from((character || '').normalize('NFKC'))
  const [strokeGroups, setStrokeGroups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setStrokeGroups([])

    Promise.all(characters.map(async kana => {
      const codePoint = kana.codePointAt(0).toString(16).padStart(5, '0')
      const response = await fetch(`/stroke-guides/${/[\u3040-\u30ff]/.test(kana) ? (/[\u30a0-\u30ff]/.test(kana) ? 'katakana' : 'hiragana') : 'kanji'}/${codePoint}.svg`)
      if (!response.ok) return { character: kana, strokes: [] }

      const svgText = await response.text()
      const svg = new DOMParser().parseFromString(svgText, 'image/svg+xml')
      const strokes = Array.from(svg.querySelectorAll('path[id*="-s"]'))
        .map(path => path.getAttribute('d'))
        .filter(Boolean)
      return { character: kana, strokes }
    }))
      .then(groups => {
        if (!cancelled) setStrokeGroups(groups)
      })
      .catch(() => {
        if (!cancelled) setStrokeGroups(characters.map(kana => ({ character: kana, strokes: [] })))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [character])

  if (loading) return <p className="text-[11px] text-slate-400 text-center">Memuat contoh guratan…</p>

  return (
    <div className="w-full bg-slate-800/90 border border-slate-700/80 p-3 rounded-2xl shadow-md space-y-2">
      <p className="text-[11px] text-indigo-200 font-bold text-center">Contoh urutan guratan</p>
      {strokeGroups.map(({ character: kana, strokes }) => {
        if (!strokes.length) {
          return <p key={kana} className="text-[11px] text-amber-300 text-center">Contoh untuk {kana} belum tersedia.</p>
        }

        const columns = strokes.length > 3 ? 2 : strokes.length
        const isSingleCharacter = characters.length === 1

        return (
          <div key={kana} className="space-y-1.5">
            {characters.length > 1 && <p className="text-xs font-bold text-slate-200 text-center">{kana}</p>}
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
              {strokes.map((_, strokeIndex) => {
                const isActive = isSingleCharacter
                  ? completedStrokes === strokeIndex
                  : completedStrokes === 0 && strokeIndex === 0

                return (
                  <div
                    key={`${kana}-${strokeIndex}`}
                    className={`rounded-xl border p-1.5 flex flex-col items-center gap-1 ${
                      isActive ? 'bg-indigo-950/80 border-indigo-500' : 'bg-slate-900/60 border-slate-700'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                      isActive ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-200'
                    }`}>{strokeIndex + 1}</span>
                    <svg viewBox="0 0 109 109" className="w-full h-14 bg-slate-950 rounded-lg p-1" aria-label={`Contoh guratan ${strokeIndex + 1} untuk ${kana}`}>
                      {strokes.map((path, index) => (
                        <path
                          key={index}
                          d={path}
                          fill="none"
                          stroke={index === strokeIndex ? '#f87171' : '#475569'}
                          strokeWidth={index === strokeIndex ? 5 : 3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={index === strokeIndex ? 1 : 0.65}
                        />
                      ))}
                    </svg>
                    <span className="text-[9px] font-bold text-slate-200">Guratan {strokeIndex + 1}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
