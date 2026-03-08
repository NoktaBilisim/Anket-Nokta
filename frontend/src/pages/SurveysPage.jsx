import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSurveys, deleteSurvey, changeSurveyStatus } from '../utils/api'
import { useNotificationStore } from '../store/notificationStore'
import SendModal from '../components/surveys/SendModal'
import { PlusCircle, BarChart2, Edit2, Trash2, Send, ClipboardList } from 'lucide-react'
import { fDate } from '../utils/dateUtils'

const STATUS_COLORS = { draft: 'bg-gray-100 text-gray-600', active: 'bg-green-100 text-green-700', closed: 'bg-red-100 text-red-700', archived: 'bg-yellow-100 text-yellow-700' }
const STATUS_LABELS = { draft: 'Taslak', active: 'Aktif', closed: 'Kapalı', archived: 'Arşiv' }

export default function SurveysPage() {
  const [surveys, setSurveys] = useState([])
  const [loading, setLoading] = useState(true)
  const [sendModal, setSendModal] = useState(null)
  const { add } = useNotificationStore()

  const load = () => getSurveys().then(r => setSurveys(r.data.data)).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Anketi silmek istediğinize emin misiniz?')) return
    try { await deleteSurvey(id); add('Anket silindi'); load() }
    catch (err) { add(err.response?.data?.message || 'Hata', 'error') }
  }

  const handleStatus = async (id, status) => {
    try { await changeSurveyStatus(id, status); add('Durum güncellendi'); load() }
    catch (err) { add(err.response?.data?.message || 'Hata', 'error') }
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-500">Yükleniyor...</div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Anketler</h2>
        <Link to="/surveys/create" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <PlusCircle size={16} /> Yeni Anket
        </Link>
      </div>

      {surveys.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <ClipboardList size={48} className="mx-auto mb-4 text-gray-300" />
          <p>Henüz anket yok.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Anket</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Oluşturan</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Tarih</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {surveys.map(survey => (
                <tr key={survey.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{survey.title}</p>
                    <p className="text-sm text-gray-500 truncate max-w-xs">{survey.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    <select value={survey.status} onChange={e => handleStatus(survey.id, e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[survey.status]}`}>
                      {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{survey.creator?.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {fDate(survey.createdAt ?? survey.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <Link to={`/surveys/${survey.id}/report`} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors" title="Rapor"><BarChart2 size={16} /></Link>
                      <button onClick={() => setSendModal(survey)} className="p-1.5 text-gray-400 hover:text-green-600 transition-colors" title="Gönder"><Send size={16} /></button>
                      <Link to={`/surveys/${survey.id}/edit`} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="Düzenle"><Edit2 size={16} /></Link>
                      <button onClick={() => handleDelete(survey.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Sil"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sendModal && <SendModal survey={sendModal} onClose={() => setSendModal(null)} onSent={() => { setSendModal(null); add('Anket gönderildi!') }} />}
    </div>
  )
}
