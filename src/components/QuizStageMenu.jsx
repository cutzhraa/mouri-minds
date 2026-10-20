export default function QuizStageMenu({
  session,
  sessionCount,
  progress,
  onSelectSession,
  onStartMode,
  visualLabel,
  audioLabel
}) {
  return (
    <div className="w-full bg-slate-800 border border-slate-700 p-6 rounded-2xl text-center space-y-4 shadow-xl">
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span className="font-bold text-white">Sesi Pembelajaran {session + 1}</span>
          <span>{sessionCount} sesi</span>
        </div>
        <div className="flex flex-wrap justify-center gap-2" aria-label="Pilih sesi kuis">
          {Array.from({ length: sessionCount }, (_, index) => {
            const completed = progress[index]?.visual || progress[index]?.audio
            return (
              <button
                key={index}
                type="button"
                onClick={() => onSelectSession(index)}
                aria-pressed={session === index}
                className={`min-w-10 rounded-lg px-3 py-2 text-xs font-bold transition ${
                  session === index
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                    : completed
                      ? 'bg-emerald-700/70 text-emerald-100 hover:bg-emerald-600'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {index + 1}{completed ? ' ✓' : ''}
              </button>
            )
          })}
        </div>
      </div>

      <h2 className="text-base font-bold text-white">🎯 Pilih Tahap Kuis Sesi {session + 1}</h2>

      <div className="grid grid-cols-1 gap-3 pt-1">
        <button
          type="button"
          onClick={() => onStartMode('visual')}
          className={`py-3.5 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-between gap-2 shadow-md transition-all active:scale-95 ${
            progress[session]?.visual ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-slate-700 hover:bg-indigo-600'
          }`}
        >
          <span>👁️ {visualLabel}</span>
          {progress[session]?.visual ? <span className="text-xs bg-emerald-500/40 px-2 py-0.5 rounded-full">Selesai 5/5 ✓</span> : <span className="text-xs bg-indigo-500/40 px-2 py-0.5 rounded-full">Mulai</span>}
        </button>

        <button
          type="button"
          onClick={() => onStartMode('audio')}
          className={`py-3.5 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-between gap-2 shadow-md transition-all active:scale-95 ${
            progress[session]?.audio ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-slate-700 hover:bg-indigo-600'
          }`}
        >
          <span>🎧 {audioLabel}</span>
          {progress[session]?.audio ? <span className="text-xs bg-emerald-500/40 px-2 py-0.5 rounded-full">Selesai 5/5 ✓</span> : <span className="text-xs bg-indigo-500/40 px-2 py-0.5 rounded-full">Mulai</span>}
        </button>
      </div>
    </div>
  )
}
