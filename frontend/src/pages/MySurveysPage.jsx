import { useEffect, useState } from 'react'
import { getMySurveys } from '../utils/api'
import { Link } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { fDate } from '../utils/dateUtils'

export default function MySurveysPage() {
  const [targets, setTargets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMySurveys().then(r => setTargets(r.data.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-full text-gray-500">Yükleniyor...</div>

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Anketlerim</h2>
      {targets.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <ClipboardList size={48} className="mx-auto mb-4 text-gray-300" />
          <p>Size gönderilmiş anket bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {targets.map(t => (
            <div key={t.id} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{t.survey?.title || 'Anket'}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Gönderildi: {fDate(t.sent_at ?? t.sentAt)}
                </p>
                {(t.completed_at ?? t.completedAt) && (
                  <p className="text-xs text-green-600 mt-0.5">
                    Tamamlandı: {fDate(t.completed_at ?? t.completedAt)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {(t.completed_at ?? t.completedAt) ? (
                  <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full">Tamamlandı</span>
                ) : (
                  <Link to={`/survey/${t.token}`}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                    Anketi Doldur
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
