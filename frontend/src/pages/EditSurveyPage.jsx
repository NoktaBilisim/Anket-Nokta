import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSurvey, updateSurvey } from '../utils/api'
import { useNotificationStore } from '../store/notificationStore'
import { Plus, Trash2 } from 'lucide-react'

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Çoktan Seçmeli' },
  { value: 'text', label: 'Açık Uçlu' },
  { value: 'rating', label: 'Puanlama' },
  { value: 'yes_no', label: 'Evet/Hayır' },
  { value: 'matrix', label: 'Matris' },
]

// API bazen camelCase, bazen snake_case döndürür — her ikisini kabul et
function pickDate(obj) {
  const v = obj?.expires_at ?? obj?.expiresAt
  return v ? v.slice(0, 16) : ''
}

export default function EditSurveyPage() {
  const { id } = useParams()
  const [form, setForm]       = useState({ title: '', description: '', anonymous: false, expires_at: '' })
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const { add }               = useNotificationStore()
  const navigate              = useNavigate()

  useEffect(() => {
    getSurvey(id).then(r => {
      const s = r.data.data
      setForm({
        title:       s.title,
        description: s.description || '',
        anonymous:   s.anonymous,
        expires_at:  pickDate(s)
      })
      setQuestions(s.questions || [])
    }).finally(() => setLoading(false))
  }, [id])

  const addQuestion = () => setQuestions(q => [...q, { type: 'multiple_choice', text: '', required: true, options: ['', ''] }])
  const updateQ     = (i, q) => setQuestions(qs => qs.map((item, idx) => idx === i ? q : item))
  const removeQ     = (i) => setQuestions(qs => qs.filter((_, idx) => idx !== i))

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      const payload = {
        ...form,
        expires_at: form.expires_at?.trim() ? form.expires_at : null,
        questions
      }
      await updateSurvey(id, payload)
      add('Anket güncellendi!')
      navigate('/surveys')
    } catch (err) {
      add(err.response?.data?.message || 'Hata', 'error')
    } finally { setLoading(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-500">Yükleniyor...</div>

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Anketi Düzenle</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-4">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Anket başlığı" required
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Açıklama" rows={2}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none resize-none" />
          <div className="flex gap-6 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={form.anonymous} onChange={e => setForm(f => ({ ...f, anonymous: e.target.checked }))} />
              Anonim
            </label>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Son Tarih:</label>
              <input type="datetime-local" value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
              {form.expires_at && (
                <button type="button" onClick={() => setForm(f => ({ ...f, expires_at: '' }))}
                  className="text-xs text-red-400 hover:text-red-600">Temizle</button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <div className="flex gap-3">
                <input value={q.text} onChange={e => updateQ(i, { ...q, text: e.target.value })} placeholder={`Soru ${i + 1}`}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                <select value={q.type} onChange={e => updateQ(i, { ...q, type: e.target.value })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <button type="button" onClick={() => removeQ(i)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
              {q.type === 'multiple_choice' && (
                <div className="space-y-2 ml-4">
                  {(q.options || []).map((opt, oi) => (
                    <div key={oi} className="flex gap-2">
                      <input value={opt} onChange={e => { const opts = [...q.options]; opts[oi] = e.target.value; updateQ(i, { ...q, options: opts }) }}
                        placeholder={`Seçenek ${oi + 1}`} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                      <button type="button" onClick={() => updateQ(i, { ...q, options: q.options.filter((_, idx) => idx !== oi) })} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => updateQ(i, { ...q, options: [...(q.options || []), ''] })} className="text-sm text-indigo-600 flex items-center gap-1">
                    <Plus size={14} /> Seçenek Ekle
                  </button>
                </div>
              )}
            </div>
          ))}
          <button type="button" onClick={addQuestion}
            className="w-full border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-xl py-4 text-gray-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 text-sm">
            <Plus size={20} /> Soru Ekle
          </button>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/surveys')} className="px-6 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">İptal</button>
          <button type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">Kaydet</button>
        </div>
      </form>
    </div>
  )
}
