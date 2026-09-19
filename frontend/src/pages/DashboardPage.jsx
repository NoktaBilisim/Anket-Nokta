import { useEffect, useState, useCallback } from 'react'
import { getStats } from '../utils/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ClipboardList, Users, CheckCircle, Activity, RefreshCw, AlertCircle } from 'lucide-react'
import { fTime, fDate } from '../utils/dateUtils'

export default function DashboardPage() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const loadStats = useCallback(() => {
    setLoading(true)
    setError(null)
    getStats()
      .then(r => setStats(r.data.data))
      .catch(err => {
        setError(err.response?.data?.message || 'Dashboard verisi yüklenirken hata oluştu.')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  // ── 1. LOADING SKELETON ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
        <div className="h-8 w-40 bg-gray-200 rounded-lg" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="bg-white rounded-xl p-6 border border-gray-100 space-y-3 shadow-xs">
              <div className="w-12 h-12 bg-gray-200 rounded-xl" />
              <div className="h-8 w-16 bg-gray-200 rounded" />
              <div className="h-4 w-28 bg-gray-100 rounded" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-100 space-y-4 shadow-xs">
            <div className="h-6 w-48 bg-gray-200 rounded" />
            <div className="h-48 bg-gray-100 rounded-lg" />
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-100 space-y-4 shadow-xs">
            <div className="h-6 w-36 bg-gray-200 rounded" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 bg-gray-50 rounded-lg" />
              ))}
            </div>
          </div>
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
          <h3 className="text-lg font-bold text-gray-900 mb-2">Veriler Alınamadı</h3>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            type="button"
            onClick={loadStats}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2 mx-auto"
          >
            <RefreshCw size={15} /> Yeniden Dene
          </button>
        </div>
      </div>
    )
  }

  const cards = [
    { label: 'Toplam Anket',     value: stats?.totalSurveys   || 0, icon: ClipboardList, color: 'text-blue-600 bg-blue-50'   },
    { label: 'Aktif Anket',      value: stats?.activeSurveys  || 0, icon: Activity,      color: 'text-green-600 bg-green-50'  },
    { label: 'Toplam Yanıt',     value: stats?.totalResponses || 0, icon: CheckCircle,   color: 'text-purple-600 bg-purple-50'},
    { label: 'Kullanıcı Sayısı', value: stats?.totalUsers     || 0, icon: Users,         color: 'text-orange-600 bg-orange-50'},
  ]

  const chartData = stats?.dailyResponses?.map(d => ({
    date: fDate(d.date),
    yanıt: Number(d.count)
  })) || []

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Genel Bakış</h2>
        <p className="text-sm text-gray-500 mt-0.5">Sistem metrikleri, yanıt hareketleri ve son aktiviteler</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-6 shadow-xs border border-gray-100">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
              <Icon size={24} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-xs font-medium text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Yanıt Grafiği */}
        <div className="bg-white rounded-xl p-6 shadow-xs border border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Son 7 Gün Yanıt Sayısı</h3>
          {chartData.length === 0 || chartData.every(d => d.yanıt === 0) ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400 bg-gray-50/50 rounded-xl">
              Son 7 gün içinde henüz yanıt hareketi bulunmuyor.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="yanıt" fill="#6366f1" radius={[4, 4, 0, 0]} name="Yanıt Sayısı" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Son Aktiviteler */}
        <div className="bg-white rounded-xl p-6 shadow-xs border border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Son Aktiviteler</h3>
          {(!stats?.recentActivity || stats.recentActivity.length === 0) ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400 bg-gray-50/50 rounded-xl">
              Henüz kayıtlı bir aktivite bulunmuyor.
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentActivity.slice(0, 6).map(log => (
                <div key={log.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-semibold text-xs shrink-0">
                    {log.User?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{log.User?.name || 'Sistem'}</p>
                    <p className="text-xs text-gray-500 capitalize">{log.action?.replace(/_/g, ' ')}</p>
                  </div>
                  <span className="text-gray-400 text-xs shrink-0">
                    {fTime(log.createdAt ?? log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
