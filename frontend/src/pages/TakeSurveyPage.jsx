import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getSurveyByToken, submitSurvey } from '../utils/api'

export default function TakeSurveyPage() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)
  const [step, setStep] = useState(0)
  const [startTime] = useState(Date.now())

  useEffect(() => {
    getSurveyByToken(token)
      .then(r => setData(r.data.data))
      .catch(err => setError(err.response?.data?.message || 'Hata'))
      .finally(() => setLoading(false))
  }, [token])

  const questions = data?.survey?.questions || []
  const currentQ = questions[step]

  const setAnswer = (qId, value) => setAnswers(a => ({ ...a, [qId]: value }))

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const answerList = Object.entries(answers).map(([question_id, value]) => ({ question_id, value }))
      await submitSurvey(token, { answers: answerList, duration_seconds: Math.round((Date.now() - startTime) / 1000) })
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Gönderim başarısız')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Yükleniyor...</div>
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-2xl font-bold text-red-500 mb-2">Hata</p>
        <p className="text-gray-600">{error}</p>
      </div>
    </div>
  )
  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Teşekkürler!</h2>
        <p className="text-gray-500">Yanıtlarınız kaydedildi.</p>
      </div>
    </div>
  )

  const renderQuestion = (q) => {
    const val = answers[q.id]
    if (q.type === 'multiple_choice') return (
      <div className="space-y-3">
        {(q.options || []).map((opt, i) => (
          <label key={i} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${val === opt ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}>
            <input type="radio" name={q.id} value={opt} checked={val === opt} onChange={() => setAnswer(q.id, opt)} className="text-indigo-600" />
            <span className="text-gray-800">{opt}</span>
          </label>
        ))}
      </div>
    )
    if (q.type === 'yes_no') return (
      <div className="flex gap-4">
        {['Evet', 'Hayır'].map(opt => (
          <label key={opt} className={`flex-1 text-center p-4 rounded-xl border-2 cursor-pointer transition-colors ${val === opt ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium' : 'border-gray-200 hover:border-indigo-300'}`}>
            <input type="radio" name={q.id} value={opt} checked={val === opt} onChange={() => setAnswer(q.id, opt)} className="hidden" />
            {opt}
          </label>
        ))}
      </div>
    )
    if (q.type === 'text') return (
      <textarea value={val || ''} onChange={e => setAnswer(q.id, e.target.value)} rows={4}
        placeholder="Yanıtınızı yazın..."
        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 resize-none" />
    )
    if (q.type === 'rating') return (
      <div className="flex gap-3 flex-wrap">
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <button key={n} type="button" onClick={() => setAnswer(q.id, n)}
            className={`w-12 h-12 rounded-xl font-semibold text-sm transition-colors ${val === n ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-indigo-100'}`}>
            {n}
          </button>
        ))}
      </div>
    )
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {step === 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-lg mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{data?.survey?.title}</h1>
            {data?.survey?.description && <p className="text-gray-500">{data.survey.description}</p>}
            <p className="text-sm text-gray-400 mt-3">{questions.length} soru</p>
          </div>
        )}

        {currentQ && (
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm text-gray-400">Soru {step + 1} / {questions.length}</span>
              <div className="w-32 h-1.5 bg-gray-200 rounded-full">
                <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              {currentQ.text}
              {currentQ.required && <span className="text-red-500 ml-1">*</span>}
            </h3>
            {renderQuestion(currentQ)}
            <div className="flex gap-3 mt-8">
              {step > 0 && <button onClick={() => setStep(s => s - 1)} className="px-6 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">Geri</button>}
              {step < questions.length - 1 ? (
                <button onClick={() => setStep(s => s + 1)} disabled={currentQ.required && !answers[currentQ.id]}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded-xl font-medium transition-colors">
                  Sonraki
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting || (currentQ.required && !answers[currentQ.id])}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-xl font-medium transition-colors">
                  {submitting ? 'Gönderiliyor...' : 'Anketi Tamamla'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
