import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createSurvey } from '../utils/api'
import { useNotificationStore } from '../store/notificationStore'
import { Plus, Trash2, GripVertical } from 'lucide-react'

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Çoktan Seçmeli' },
  { value: 'text', label: 'Açık Uçlu' },
  { value: 'rating', label: 'Puanlama (1-10)' },
  { value: 'yes_no', label: 'Evet / Hayır' },
  { value: 'matrix', label: 'Matris' },
]

function QuestionEditor({ question, index, onChange, onRemove }) {
  const update = (field, value) => onChange({ ...question, [field]: value })
  const addOption = () => update('options', [...(question.options || []), ''])
  const updateOption = (i, val) => { const opts = [...question.options]; opts[i] = val; update('options', opts) }
  const removeOption = (i) => update('options', question.options.filter((_, idx) => idx !== i))

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <GripVertical size={20} className="text-gray-300 mt-2 flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="flex gap-3">
            <input value={question.text} onChange={e => update('text', e.target.value)}
              placeholder={`Soru ${index + 1}`}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <select value={question.type} onChange={e => update('type', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
              {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <label className="flex items-center gap-1 text-sm text-gray-500">
              <input type="checkbox" checked={question.required} onChange={e => update('required', e.target.checked)} />
              Zorunlu
            </label>
          </div>

          {question.type === 'multiple_choice' && (
            <div className="space-y-2">
              {(question.options || []).map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input value={opt} onChange={e => updateOption(i, e.target.value)}
                    placeholder={`Seçenek ${i + 1}`}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  <button onClick={() => removeOption(i)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              ))}
              <button onClick={addOption} className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                <Plus size={14} /> Seçenek Ekle
              </button>
            </div>
          )}
        </div>
        <button onClick={onRemove} className="text-gray-400 hover:text-red-500 flex-shrink-0"><Trash2 size={18} /></button>
      </div>
    </div>
  )
}

export default function CreateSurveyPage() {
  const [form, setForm] = useState({ title: '', description: '', anonymous: false, expires_at: '' })
  const [questions, setQuestions] = useState([{ type: 'multiple_choice', text: '', required: true, options: ['', ''] }])
  const [loading, setLoading] = useState(false)
  const { add } = useNotificationStore()
  const navigate = useNavigate()

  const addQuestion = () => setQuestions(q => [...q, { type: 'multiple_choice', text: '', required: true, options: ['', ''] }])
  const updateQuestion = (i, q) => setQuestions(qs => qs.map((item, idx) => idx === i ? q : item))
  const removeQuestion = (i) => setQuestions(qs => qs.filter((_, idx) => idx !== i))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return add('Anket başlığı gerekli', 'error')
    setLoading(true)
    try {
      // expires_at boşsa null gönder
      const payload = {
        ...form,
        expires_at: form.expires_at && form.expires_at.trim() !== '' ? form.expires_at : null,
        questions
      }
      await createSurvey(payload)
      add('Anket oluşturuldu!')
      navigate('/surveys')
    } catch (err) {
      add(err.response?.data?.message || 'Hata', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Yeni Anket Oluştur</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-4">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Anket başlığı" required
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Açıklama (opsiyonel)" rows={2}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none resize-none" />
          <div className="flex gap-6 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={form.anonymous} onChange={e => setForm(f => ({ ...f, anonymous: e.target.checked }))} />
              Anonim Anket
            </label>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Son Tarih (opsiyonel):</label>
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
            <QuestionEditor key={i} question={q} index={i}
              onChange={updated => updateQuestion(i, updated)}
              onRemove={() => removeQuestion(i)} />
          ))}
          <button type="button" onClick={addQuestion}
            className="w-full border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-xl py-4 text-gray-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 text-sm">
            <Plus size={20} /> Soru Ekle
          </button>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/surveys')}
            className="px-6 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">İptal</button>
          <button type="submit" disabled={loading}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            {loading ? 'Kaydediliyor...' : 'Anketi Kaydet'}
          </button>
        </div>
      </form>
    </div>
  )
}
