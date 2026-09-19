import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getSurveys, deleteSurvey, changeSurveyStatus } from '../utils/api'
import { useNotificationStore } from '../store/notificationStore'
import SendModal from '../components/surveys/SendModal'
import { PlusCircle, BarChart2, Edit2, Trash2, Send, ClipboardList, AlertCircle, RefreshCw } from 'lucide-react'
import { fDate } from '../utils/dateUtils'

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  closed: 'bg-red-100 text-red-700',
  archived: 'bg-yellow-100 text-yellow-800'
}
const STATUS_LABELS = { draft: 'Taslak', active: 'Aktif', closed: 'Kapalı', archived: 'Arşiv' }

export default function SurveysPage() {
  const [surveys,   setSurveys]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [sendModal, setSendModal] = useState(null)
  const { add }                   = useNotificationStore()

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    getSurveys()
      .then(r => setSurveys(r.data.data))
      .catch(err => {
        setError(err.response?.data?.message || 'Anketler yüklenirken bir sorun oluştu.')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async (id, title) => {
    if (!window.confirm(`"${title || 'Bu anket'}" silinecek. Emin misiniz?`)) return
    try {
      await deleteSurvey(id)
      add('Anket başarıyla silindi')
      load()
    } catch (err) {
      add(err.response?.data?.message || 'Silme işlemi başarısız', 'error')
    }
  }

  const handleStatus = async (id, status) => {
    try {
      await changeSurveyStatus(id, status)
      add('Anket durumu güncellendi')
      load()
    } catch (err) {
      add(err.response?.data?.message || 'Durum değiştirilemedi', 'error')
    }
  }

  // ── 1. LOADING SKELETON ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 w-36 bg-gray-200 rounded-lg" />
          <div className="h-10 w-32 bg-gray-200 rounded-xl" />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4 shadow-xs">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <div className="space-y-1.5 w-1/3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
              <div className="h-6 w-16 bg-gray-200 rounded-full" />
              <div className="h-4 w-24 bg-gray-100 rounded" />
              <div className="h-8 w-28 bg-gray-200 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── 2. ERROR STATE ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <div className="bg-white rounded-2xl p-8 border border-red-100 shadow-sm">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Anketler Yüklenemedi</h3>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            type="button"
            onClick={load}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2 mx-auto"
          >
            <RefreshCw size={15} /> Yeniden Dene
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Anketler</h2>
          <p className="text-sm text-gray-500 mt-0.5">Oluşturulan tüm anketler ve dağıtım durumları</p>
        </div>
        <Link
          to="/surveys/create"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-xs"
        >
          <PlusCircle size={16} /> Yeni Anket
        </Link>
      </div>

      {/* ── 3. EMPTY STATE ───────────────────────────────────────────────────── */}
      {surveys.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-xs">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Henüz Anket Oluşturulmamış</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            İlk anketinizi oluşturarak çoktan seçmeli, likert matris veya puanlama soruları ekleyin.
          </p>
          <Link
            to="/surveys/create"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-xs"
          >
            <PlusCircle size={16} /> İlk Anketi Oluştur
          </Link>
        </div>
      ) : (
        /* ── 4. SUCCESS / TABLE ───────────────────────────────────────────────── */
        <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Anket</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Oluşturan</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tarih</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {surveys.map(survey => (
                  <tr key={survey.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{survey.title}</p>
                      <p className="text-xs text-gray-500 truncate max-w-xs">{survey.description || 'Açıklama yok'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={survey.status}
                        onChange={e => handleStatus(survey.id, e.target.value)}
                        aria-label={`Durum: ${survey.title}`}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-indigo-500 ${STATUS_COLORS[survey.status] || 'bg-gray-100 text-gray-700'}`}
                      >
                        {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{survey.creator?.name || '—'}</td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {fDate(survey.createdAt ?? survey.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Link
                          to={`/surveys/${survey.id}/report`}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Sonuç Raporu"
                          aria-label={`Rapor: ${survey.title}`}
                        >
                          <BarChart2 size={16} />
                        </Link>
                        <button
                          onClick={() => setSendModal(survey)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Anketi Gönder (Email / WhatsApp / SMS)"
                          aria-label={`Gönder: ${survey.title}`}
                        >
                          <Send size={16} />
                        </button>
                        <Link
                          to={`/surveys/${survey.id}/edit`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Düzenle"
                          aria-label={`Düzenle: ${survey.title}`}
                        >
                          <Edit2 size={16} />
                        </Link>
                        <button
                          onClick={() => handleDelete(survey.id, survey.title)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Sil"
                          aria-label={`Sil: ${survey.title}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sendModal && (
        <SendModal
          survey={sendModal}
          onClose={() => setSendModal(null)}
          onSent={() => { setSendModal(null); add('Anket başarıyla gönderildi!') }}
        />
      )}
    </div>
  )
}
