import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createSurvey } from '../utils/api'
import { useNotificationStore } from '../store/notificationStore'
import { Plus, Trash2, GripVertical, Star, Tag } from 'lucide-react'

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Çoktan Seçmeli' },
  { value: 'text',            label: 'Açık Uçlu' },
  { value: 'rating',          label: 'Puanlama (1-10)' },
  { value: 'yes_no',          label: 'Evet / Hayır' },
  { value: 'matrix',          label: 'Matris (Tablo)' },
]

function defaultQuestion(type = 'multiple_choice') {
  if (type === 'matrix') return {
    type, text: '', required: true, category: '',
    options: {
      rows:    ['1. Madde', '2. Madde'],
      columns: [
        { text: 'Çok Kötü', score: 1 }, { text: 'Kötü', score: 2 },
        { text: 'Orta', score: 3 },     { text: 'İyi', score: 4 },
        { text: 'Çok İyi', score: 5 },
      ],
    }
  }
  if (type === 'multiple_choice') return {
    type, text: '', required: true, category: '',
    options: [{ text: 'Seçenek 1', score: 0 }, { text: 'Seçenek 2', score: 0 }]
  }
  if (type === 'yes_no') return {
    type, text: '', required: true, category: '',
    options: [{ text: 'Evet', score: 1 }, { text: 'Hayır', score: 0 }]
  }
  return { type, text: '', required: true, category: '', options: [] }
}

function ScoreInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <Star size={12} className="text-yellow-400" />
      <input type="number" min="0" value={value ?? 0}
        onChange={e => onChange(Number(e.target.value))}
        className="w-14 border border-yellow-200 bg-yellow-50 rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-yellow-400"
        title="Bu seçeneğin puanı" />
    </div>
  )
}

function QuestionEditor({ question, index, onChange, onRemove, allCategories }) {
  const update = (field, value) => onChange({ ...question, [field]: value })

  const changeType = (newType) => {
    const base = defaultQuestion(newType)
    onChange({ ...base, text: question.text, required: question.required, category: question.category || '' })
  }

  const opts = Array.isArray(question.options)
    ? question.options.map(o => typeof o === 'string' ? { text: o, score: 0 } : o)
    : []
  const addOption    = ()        => update('options', [...opts, { text: '', score: 0 }])
  const updateOption = (i, k, v) => update('options', opts.map((o, idx) => idx === i ? { ...o, [k]: v } : o))
  const removeOption = (i)       => update('options', opts.filter((_, idx) => idx !== i))

  const matrixRows = question.options?.rows    || []
  const matrixCols = (question.options?.columns || []).map(c => typeof c === 'string' ? { text: c, score: 0 } : c)
  const updateMatrix = (part, arr) => update('options', { ...question.options, [part]: arr })
  const addRow    = () => updateMatrix('rows', [...matrixRows, `${matrixRows.length + 1}. Madde`])
  const addCol    = () => updateMatrix('columns', [...matrixCols, { text: `Seçenek ${matrixCols.length + 1}`, score: 0 }])
  const updateRow = (i, v) => { const r = [...matrixRows]; r[i] = v; updateMatrix('rows', r) }
  const updateCol = (i, k, v) => updateMatrix('columns', matrixCols.map((c, idx) => idx === i ? { ...c, [k]: v } : c))
  const removeRow = (i) => updateMatrix('rows',    matrixRows.filter((_, idx) => idx !== i))
  const removeCol = (i) => updateMatrix('columns', matrixCols.filter((_, idx) => idx !== i))

  const hasScoring = ['multiple_choice', 'yes_no', 'matrix'].includes(question.type)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <GripVertical size={20} className="text-gray-300 mt-2 flex-shrink-0" />
        <div className="flex-1 space-y-3">

          {/* Satır 1: Soru metni + tür + zorunlu */}
          <div className="flex gap-3 flex-wrap items-center">
            <input value={question.text} onChange={e => update('text', e.target.value)}
              placeholder={`Soru ${index + 1}`}
              className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <select value={question.type} onChange={e => changeType(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
              {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <label className="flex items-center gap-1 text-sm text-gray-500 whitespace-nowrap">
              <input type="checkbox" checked={question.required} onChange={e => update('required', e.target.checked)} />
              Zorunlu
            </label>
          </div>

          {/* Satır 2: Kategori */}
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-indigo-400 shrink-0" />
            <input
              list={`cat-list-${index}`}
              value={question.category || ''}
              onChange={e => update('category', e.target.value)}
              placeholder="Kategori (opsiyonel, örn: Teknik Bilgi)"
              className="flex-1 border border-indigo-100 bg-indigo-50/40 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-400"
            />
            <datalist id={`cat-list-${index}`}>
              {allCategories.filter(Boolean).map(c => <option key={c} value={c} />)}
            </datalist>
            {question.category && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full whitespace-nowrap">
                {question.category}
              </span>
            )}
          </div>

          {/* Puan bilgisi bandı */}
          {hasScoring && (
            <div className="flex items-center gap-2 bg-yellow-50 rounded-lg px-3 py-2 text-xs text-yellow-700 border border-yellow-100">
              <Star size={13} className="text-yellow-500" />
              Her seçeneğe puan verebilirsiniz — puan alanı seçeneğin sağında görünür
            </div>
          )}

          {/* Çoktan Seçmeli & Evet/Hayır seçenekleri */}
          {(question.type === 'multiple_choice' || question.type === 'yes_no') && (
            <div className="space-y-2 pl-1">
              {opts.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input value={opt.text} onChange={e => updateOption(i, 'text', e.target.value)}
                    placeholder={`Seçenek ${i + 1}`}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  <ScoreInput value={opt.score} onChange={v => updateOption(i, 'score', v)} />
                  <button onClick={() => removeOption(i)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              ))}
              {question.type === 'multiple_choice' && (
                <button onClick={addOption} className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  <Plus size={14} /> Seçenek Ekle
                </button>
              )}
            </div>
          )}

          {/* Matris */}
          {question.type === 'matrix' && (
            <div className="space-y-4 pl-1">
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="bg-indigo-50">
                      <th className="px-3 py-2 text-left text-gray-500 font-medium w-40">Maddeler ↓ / Ölçek →</th>
                      {matrixCols.map((col, ci) => (
                        <th key={ci} className="px-3 py-2 text-center text-indigo-700 font-medium min-w-[100px]">
                          {col.text || `Sütun ${ci+1}`}
                          <span className="block text-yellow-500 font-normal">({col.score ?? 0} puan)</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixRows.map((row, ri) => (
                      <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 text-gray-700 font-medium">{row || `Madde ${ri+1}`}</td>
                        {matrixCols.map((_, ci) => (
                          <td key={ci} className="px-3 py-2 text-center">
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300 mx-auto" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Satırlar</p>
                  <div className="space-y-1.5">
                    {matrixRows.map((row, i) => (
                      <div key={i} className="flex gap-2">
                        <input value={row} onChange={e => updateRow(i, e.target.value)} placeholder={`Madde ${i + 1}`}
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                        <button onClick={() => removeRow(i)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    ))}
                    <button onClick={addRow} className="text-xs text-indigo-600 flex items-center gap-1 mt-1"><Plus size={12} /> Satır Ekle</button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Sütunlar <span className="text-yellow-500">(+ Puan)</span>
                  </p>
                  <div className="space-y-1.5">
                    {matrixCols.map((col, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input value={col.text} onChange={e => updateCol(i, 'text', e.target.value)} placeholder={`Seçenek ${i + 1}`}
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                        <ScoreInput value={col.score} onChange={v => updateCol(i, 'score', v)} />
                        <button onClick={() => removeCol(i)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    ))}
                    <button onClick={addCol} className="text-xs text-indigo-600 flex items-center gap-1 mt-1"><Plus size={12} /> Sütun Ekle</button>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1.5">Hızlı ölçek:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '5\'li Likert',   cols: [{text:'Kesinlikle Katılmıyorum',score:1},{text:'Katılmıyorum',score:2},{text:'Kararsızım',score:3},{text:'Katılıyorum',score:4},{text:'Kesinlikle Katılıyorum',score:5}] },
                    { label: 'Memnuniyet',     cols: [{text:'Çok Kötü',score:1},{text:'Kötü',score:2},{text:'Orta',score:3},{text:'İyi',score:4},{text:'Çok İyi',score:5}] },
                    { label: 'Sıklık',         cols: [{text:'Hiçbir Zaman',score:1},{text:'Nadiren',score:2},{text:'Bazen',score:3},{text:'Genellikle',score:4},{text:'Her Zaman',score:5}] },
                    { label: 'Evet/Hayır',     cols: [{text:'Evet',score:1},{text:'Hayır',score:0}] },
                  ].map(t => (
                    <button key={t.label} type="button" onClick={() => updateMatrix('columns', t.cols)}
                      className="text-xs px-3 py-1 rounded-full border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors">
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {question.type === 'rating' && (
            <div className="bg-yellow-50 rounded-lg px-3 py-2 text-xs text-yellow-700 border border-yellow-100">
              <Star size={12} className="inline mr-1 text-yellow-500" />
              Seçilen sayı (1-10) doğrudan puan olarak sayılır.
            </div>
          )}
        </div>
        <button onClick={onRemove} className="text-gray-400 hover:text-red-500 flex-shrink-0 mt-1"><Trash2 size={18} /></button>
      </div>
    </div>
  )
}

export default function CreateSurveyPage() {
  const [form, setForm]           = useState({ title: '', description: '', anonymous: false, expires_at: '' })
  const [questions, setQuestions] = useState([defaultQuestion('multiple_choice')])
  const [loading, setLoading]     = useState(false)
  const { add }                   = useNotificationStore()
  const navigate                  = useNavigate()

  const addQuestion    = ()     => setQuestions(q => [...q, defaultQuestion('multiple_choice')])
  const updateQuestion = (i, q) => setQuestions(qs => qs.map((item, idx) => idx === i ? q : item))
  const removeQuestion = (i)    => setQuestions(qs => qs.filter((_, idx) => idx !== i))

  // Mevcut kategorileri topla (datalist için)
  const allCategories = [...new Set(questions.map(q => q.category).filter(Boolean))]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return add('Anket başlığı gerekli', 'error')
    setLoading(true)
    try {
      await createSurvey({ ...form, expires_at: form.expires_at?.trim() ? form.expires_at : null, questions })
      add('Anket oluşturuldu!')
      navigate('/surveys')
    } catch (err) {
      add(err.response?.data?.message || 'Hata', 'error')
    } finally { setLoading(false) }
  }

  const totalMaxScore = questions.reduce((sum, q) => {
    if (q.type === 'rating') return sum + 10
    if (q.type === 'multiple_choice' || q.type === 'yes_no') {
      const opts = Array.isArray(q.options) ? q.options : []
      return sum + Math.max(0, ...opts.map(o => typeof o === 'string' ? 0 : (o.score ?? 0)))
    }
    if (q.type === 'matrix') {
      const cols = q.options?.columns || []
      const rows = q.options?.rows    || []
      const maxCol = Math.max(0, ...cols.map(c => typeof c === 'string' ? 0 : (c.score ?? 0)))
      return sum + maxCol * rows.length
    }
    return sum
  }, 0)

  // Kategori özeti
  const categoryGroups = {}
  questions.forEach(q => {
    const cat = q.category?.trim() || ''
    if (cat) { if (!categoryGroups[cat]) categoryGroups[cat] = 0; categoryGroups[cat]++ }
  })

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Yeni Anket Oluştur</h2>
        <div className="flex items-center gap-3">
          {Object.keys(categoryGroups).length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {Object.entries(categoryGroups).map(([cat, cnt]) => (
                <span key={cat} className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                  <Tag size={11} className="inline mr-1" />{cat} ({cnt})
                </span>
              ))}
            </div>
          )}
          {totalMaxScore > 0 && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2">
              <Star size={16} className="text-yellow-500" />
              <span className="text-sm font-semibold text-yellow-700">Maks. puan: {totalMaxScore}</span>
            </div>
          )}
        </div>
      </div>

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
              onRemove={() => removeQuestion(i)}
              allCategories={allCategories} />
          ))}
          <button type="button" onClick={addQuestion}
            className="w-full border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-xl py-4 text-gray-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 text-sm">
            <Plus size={20} /> Soru Ekle
          </button>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/surveys')}
            className="px-6 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">İptal</button>
          <button type="submit" disabled={loading}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {loading ? 'Kaydediliyor...' : 'Anketi Kaydet'}
          </button>
        </div>
      </form>
    </div>
  )
}
