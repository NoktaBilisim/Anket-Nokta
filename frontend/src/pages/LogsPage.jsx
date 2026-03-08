import { useEffect, useState } from 'react'
import { getLogs } from '../utils/api'
import { fDateTime } from '../utils/dateUtils'

const ACTION_LABELS = {
  user_login: 'Giriş', user_logout: 'Çıkış', user_created: 'Kullanıcı Oluşturuldu',
  user_updated: 'Kullanıcı Güncellendi', user_deleted: 'Kullanıcı Silindi',
  survey_created: 'Anket Oluşturuldu', survey_updated: 'Anket Güncellendi',
  survey_deleted: 'Anket Silindi', survey_sent: 'Anket Gönderildi',
  survey_completed: 'Anket Tamamlandı', response_submitted: 'Yanıt Gönderildi'
}

export default function LogsPage() {
  const [logs, setLogs]       = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const [filter, setFilter]   = useState('')

  const load = () => {
    setLoading(true)
    getLogs({ page, limit: 50, action: filter || undefined })
      .then(r => { setLogs(r.data.data.rows); setTotal(r.data.data.total) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [page, filter])

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Aktivite Logları</h2>
      <div className="flex gap-3 mb-4">
        <select value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="">Tüm Aksiyonlar</option>
          {Object.entries(ACTION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <span className="text-sm text-gray-500 self-center">{total} kayıt</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Kullanıcı</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Aksiyon</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">IP</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Tarih</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">Yükleniyor...</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm font-medium text-gray-900">{log.User?.name || '-'}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{ACTION_LABELS[log.action] || log.action}</td>
                <td className="px-6 py-3 text-sm text-gray-400">{log.ip_address || '-'}</td>
                <td className="px-6 py-3 text-sm text-gray-500">
                  {fDateTime(log.createdAt ?? log.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sayfalama */}
      {total > 50 && (
        <div className="flex gap-2 mt-4 justify-center">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40">← Önceki</button>
          <span className="px-3 py-1.5 text-sm text-gray-500">{page}. sayfa</span>
          <button disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40">Sonraki →</button>
        </div>
      )}
    </div>
  )
}
