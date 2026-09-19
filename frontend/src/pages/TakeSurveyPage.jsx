import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getSurveyByToken, submitSurvey } from '../utils/api'
import truguardLogo from '../assets/Truguard_logo.png'
import { AlertCircle, RefreshCw, CheckCircle2, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react'

const PAGE_SIZE = 20

export default function TakeSurveyPage() {
  const { token } = useParams()
  const [data,       setData]       = useState(null)
  const [answers,    setAnswers]     = useState({})
  const [loading,    setLoading]     = useState(true)
  const [submitting, setSubmitting]  = useState(false)
  const [submitted,  setSubmitted]   = useState(false)
  const [submitError,setSubmitError] = useState(null)
  const [error,      setError]       = useState(null)
  const [page,       setPage]        = useState(0)
  const [startTime]                  = useState(Date.now())

  const loadSurvey = useCallback(() => {
    setLoading(true)
    setError(null)
    getSurveyByToken(token)
      .then(r => setData(r.data.data))
      .catch(err => {
        const msg = err.response?.data?.message || err.message || 'Anket yüklenirken bir hata oluştu.'
        setError(msg)
      })
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    loadSurvey()
  }, [loadSurvey])

  const questions  = data?.survey?.questions || []
  const totalPages = Math.ceil(questions.length / PAGE_SIZE) || 1
  const pageStart  = page * PAGE_SIZE
  const pageEnd    = Math.min(pageStart + PAGE_SIZE, questions.length)
  const pageQs     = questions.slice(pageStart, pageEnd)

  const setAnswer = (qId, value) =>
    setAnswers(a => ({ ...a, [qId]: value }))

  const setMatrixAnswer = (qId, rowIdx, colVal) =>
    setAnswers(a => ({ ...a, [qId]: { ...(a[qId] || {}), [rowIdx]: colVal } }))

  const isPageComplete = () =>
    pageQs.every(q => {
      if (!q.required) return true
      if (q.type === 'matrix') {
        const rows = q.options?.rows || []
        const ans  = answers[q.id] || {}
        return rows.every((_, i) => ans[i] !== undefined && ans[i] !== null && ans[i] !== '')
      }
      return answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== ''
    })

  const isMissing = (q) => {
    if (!q.required) return false
    if (q.type === 'matrix') {
      const rows = q.options?.rows || []
      const ans  = answers[q.id] || {}
      return !rows.every((_, i) => ans[i] !== undefined && ans[i] !== null && ans[i] !== '')
    }
    return answers[q.id] === undefined || answers[q.id] === null || answers[q.id] === ''
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const answerList = Object.entries(answers).map(([question_id, value]) => ({ question_id, value }))
      await submitSurvey(token, {
        answers: answerList,
        duration_seconds: Math.max(1, Math.round((Date.now() - startTime) / 1000))
      })
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Yanıtlar iletilirken bir sorun oluştu. Lütfen tekrar deneyin.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Logo bileşeni ────────────────────────────────────────────────────────────
  const Logo = () => (
    <div className="flex justify-center mb-5">
      <img src={truguardLogo} alt="Truguard" className="h-12 w-auto object-contain" />
    </div>
  )

  // ── 1. LOADING DURUMU (Skeleton UI) ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4">
        <div className="w-full max-w-2xl mx-auto space-y-6 animate-pulse">
          {/* Üst Kart Skeleton */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="h-10 w-32 bg-gray-200 rounded-lg mx-auto mb-4" />
            <div className="h-7 w-3/4 bg-gray-200 rounded-lg mx-auto mb-2" />
            <div className="h-4 w-1/2 bg-gray-100 rounded mx-auto mb-5" />
            <div className="h-2 w-full bg-gray-200 rounded-full" />
          </div>

          {/* Soru Kartları Skeleton */}
          {[1, 2, 3].map(n => (
            <div key={n} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0" />
                <div className="h-5 w-4/5 bg-gray-200 rounded" />
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-12 bg-gray-100 rounded-xl" />
                <div className="h-12 bg-gray-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── 2. ERROR DURUMU (Tekrar dene aksiyonlu) ──────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-xl border border-red-100 text-center">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Anket Yüklenemedi</h2>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={loadSurvey}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors w-full"
          >
            <RefreshCw size={16} /> Yeniden Dene
          </button>
        </div>
      </div>
    )
  }

  // ── 3. SUCCESS DURUMU (Teşekkür & Tamamlanma Bildirimi) ──────────────────────
  if (submitted) {
    const elapsedMinutes = Math.floor((Date.now() - startTime) / 60000)
    const elapsedSeconds = Math.round(((Date.now() - startTime) % 60000) / 1000)
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-xl border border-gray-100 text-center">
          <Logo />
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Teşekkürler!</h2>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            Yanıtlarınız başarıyla kaydedildi. Değerli katkılarınız için teşekkür ederiz.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
            <p><strong>Anket:</strong> {data?.survey?.title}</p>
            <p><strong>Geçen Süre:</strong> {elapsedMinutes > 0 ? `${elapsedMinutes} dk ` : ''}{elapsedSeconds} sn</p>
          </div>
        </div>
      </div>
    )
  }

  // ── 4. EMPTY DURUMU (Soru Bulunmuyor) ─────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-xl border border-gray-100 text-center">
          <Logo />
          <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <HelpCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Henüz Soru Eklenmemiş</h2>
          <p className="text-sm text-gray-500 mb-4">Bu ankette doldurulacak aktif soru bulunmuyor.</p>
        </div>
      </div>
    )
  }

  // ── Soru Bileşeni Oluşturucu ──────────────────────────────────────────────────
  const renderQuestion = (q) => {
    const val  = answers[q.id]
    const opts = q.options || []
    const optText = (o) => (typeof o === 'string' ? o : o?.text ?? '')

    if (q.type === 'multiple_choice') return (
      <div className="space-y-2.5" role="radiogroup" aria-label={q.text}>
        {opts.map((opt, i) => {
          const t = optText(opt)
          const isSelected = val === t
          return (
            <label
              key={i}
              className={`flex items-center gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-all min-h-[48px] ${
                isSelected ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-xs' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50/60'
              }`}
            >
              <input
                type="radio"
                name={`question-${q.id}`}
                value={t}
                checked={isSelected}
                onChange={() => setAnswer(q.id, t)}
                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-gray-800">{t}</span>
            </label>
          )
        })}
      </div>
    )

    if (q.type === 'yes_no') return (
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={q.text}>
        {opts.map((opt, i) => {
          const t = optText(opt)
          const isSelected = val === t
          return (
            <label
              key={i}
              className={`flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer text-center font-medium transition-all min-h-[52px] ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-xs'
                  : 'border-gray-200 hover:border-indigo-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name={`question-${q.id}`}
                value={t}
                checked={isSelected}
                onChange={() => setAnswer(q.id, t)}
                className="sr-only"
              />
              {t}
            </label>
          )
        })}
      </div>
    )

    if (q.type === 'text') return (
      <div className="relative">
        <textarea
          value={val || ''}
          onChange={e => setAnswer(q.id, e.target.value)}
          rows={4}
          placeholder="Yanıtınızı buraya yazabilirsiniz..."
          aria-label={q.text}
          className="w-full border-2 border-gray-200 rounded-xl p-3.5 text-sm text-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none transition-all placeholder:text-gray-400"
        />
      </div>
    )

    if (q.type === 'rating') return (
      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap items-center justify-between" role="group" aria-label={q.text}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setAnswer(q.id, n)}
              aria-label={`Puan ${n}`}
              className={`min-w-[44px] min-h-[44px] flex-1 rounded-xl font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                val === n
                  ? 'bg-indigo-600 text-white shadow-md scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-indigo-100 hover:text-indigo-700'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-400 px-1 pt-1">
          <span>1 (En Düşük)</span>
          <span>10 (En Yüksek)</span>
        </div>
      </div>
    )

    if (q.type === 'matrix') {
      const rows   = q.options?.rows    || []
      const cols   = q.options?.columns || []
      const matAns = val || {}
      return (
        <div className="overflow-x-auto -mx-2 border border-gray-100 rounded-xl bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-indigo-50/70 border-b border-indigo-100">
                <th className="px-4 py-3 text-left text-gray-600 font-semibold w-48 min-w-[140px]">Maddeler</th>
                {cols.map((col, ci) => (
                  <th key={ci} className="px-3 py-3 text-center text-indigo-900 font-semibold min-w-[80px]">
                    {optText(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-4 py-3.5 text-gray-800 font-medium text-xs sm:text-sm">{row}</td>
                  {cols.map((col, ci) => {
                    const colVal   = optText(col)
                    const selected = matAns[ri] === colVal
                    return (
                      <td key={ci} className="px-2 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setMatrixAnswer(q.id, ri, colVal)}
                          aria-label={`${row}: ${colVal}`}
                          className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-full border-2 mx-auto flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            selected ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs' : 'border-gray-300 bg-white hover:border-indigo-400'
                          }`}
                        >
                          {selected && (
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {q.required && (() => {
            const unanswered = rows.filter((_, i) => matAns[i] === undefined || matAns[i] === null || matAns[i] === '').length
            return unanswered > 0
              ? <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-b-xl">⚠ {unanswered} madde henüz yanıtlanmadı</p>
              : <p className="text-xs text-green-700 bg-green-50 p-2.5 rounded-b-xl font-medium">✓ Tüm maddeler yanıtlandı</p>
          })()}
        </div>
      )
    }
    return null
  }

  const answeredCount = questions.filter(q => {
    if (q.type === 'matrix') {
      const rows = q.options?.rows || []
      const ans  = answers[q.id] || {}
      return rows.length > 0 && rows.every((_, i) => ans[i] !== undefined && ans[i] !== null && ans[i] !== '')
    }
    return answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== ''
  }).length

  const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4">
      <div className="w-full max-w-2xl mx-auto">

        {/* ── Üst bilgi kartı ── */}
        <header className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 mb-6">
          <Logo />
          <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">{data?.survey?.title}</h1>
          {data?.survey?.description && <p className="text-gray-600 text-sm mb-4 text-center">{data.survey.description}</p>}

          <div className="flex items-center justify-between text-xs text-gray-500 mb-2 mt-4 font-medium">
            <span>{answeredCount} / {questions.length} soru yanıtlandı ({progressPercent}%)</span>
            {totalPages > 1 && <span>Sayfa {page + 1} / {totalPages}</span>}
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </header>

        {/* ── Gönderim Hatası Bildirimi ── */}
        {submitError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
            <AlertCircle size={18} className="shrink-0" />
            <p className="flex-1">{submitError}</p>
          </div>
        )}

        {/* ── Soru listesi ── */}
        <main className="space-y-5" aria-label="Anket Soruları">
          {pageQs.map((q, i) => {
            const globalIdx = pageStart + i
            const missing   = isMissing(q)
            return (
              <article
                key={q.id}
                className={`bg-white rounded-2xl p-6 shadow-md border-2 transition-all ${
                  missing ? 'border-amber-300' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1 shrink-0 mt-0.5">
                    {globalIdx + 1}
                  </span>
                  <div className="flex-1">
                    <h2 className="text-base font-semibold text-gray-900 leading-snug">
                      {q.text}
                      {q.required && <span className="text-red-500 ml-1" title="Zorunlu alan">*</span>}
                    </h2>
                    {q.category && (
                      <span className="inline-block mt-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {q.category}
                      </span>
                    )}
                  </div>
                </div>

                {renderQuestion(q)}

                {missing && (
                  <p className="text-xs text-amber-600 mt-3 font-medium flex items-center gap-1">
                    <AlertCircle size={13} /> Bu soru zorunludur, lütfen yanıtlayın.
                  </p>
                )}
              </article>
            )
          })}
        </main>

        {/* ── Alt navigasyon ── */}
        <footer className="mt-8 flex gap-3">
          {page > 0 && (
            <button
              type="button"
              onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              className="px-5 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
            >
              <ChevronLeft size={18} /> Önceki
            </button>
          )}

          {page < totalPages - 1 ? (
            <button
              type="button"
              onClick={() => {
                if (!isPageComplete()) {
                  setAnswers(a => ({ ...a }))
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                  return
                }
                setPage(p => p + 1)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                isPageComplete()
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                  : 'bg-indigo-200 text-indigo-500 cursor-not-allowed'
              }`}
            >
              Sonraki Sayfa <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!isPageComplete()) {
                  setAnswers(a => ({ ...a }))
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                  return
                }
                handleSubmit()
              }}
              disabled={submitting}
              className={`flex-1 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                isPageComplete() && !submitting
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-md'
                  : 'bg-green-200 text-green-500 cursor-not-allowed'
              }`}
            >
              {submitting ? 'Gönderiliyor...' : '✓ Anketi Tamamla'}
            </button>
          )}
        </footer>

        {totalPages > 2 && (
          <div className="flex justify-center gap-2 mt-4" aria-label="Sayfa Navigasyonu">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Sayfa ${i + 1}`}
                aria-current={i === page ? 'page' : undefined}
                onClick={() => { setPage(i); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className={`w-8 h-8 rounded-full text-xs font-semibold transition-colors ${
                  i === page ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-gray-600 hover:bg-indigo-50 border border-gray-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}

        {/* Alt logo */}
        <div className="flex justify-center mt-8 opacity-40">
          <img src={truguardLogo} alt="Truguard" className="h-6 w-auto object-contain" />
        </div>

      </div>
    </div>
  )
}
