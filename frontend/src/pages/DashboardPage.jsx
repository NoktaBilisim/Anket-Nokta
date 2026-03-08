import { useEffect, useState } from 'react'
import { getStats } from '../utils/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ClipboardList, Users, CheckCircle, Activity } from 'lucide-react'
import { fTime, fDate } from '../utils/dateUtils'

export default function DashboardPage() {
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStats().then(r => setStats(r.data.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-full text-gray-500">Yükleniyor...</div>

  const cards = [
    { label: 'Toplam Anket',   value: stats?.totalSurveys   || 0, icon: ClipboardList, color: 'text-blue-600 bg-blue-50'   },
    { label: 'Aktif Anket',    value: stats?.activeSurveys  || 0, icon: Activity,      color: 'text-green-600 bg-green-50'  },
    { label: 'Toplam Yanıt',   value: stats?.totalResponses || 0, icon: CheckCircle,   color: 'text-purple-600 bg-purple-50'},
    { label: 'Kullanıcı Sayısı', value: stats?.totalUsers   || 0, icon: Users,         color: 'text-orange-600 bg-orange-50'},
  ]

  const chartData = stats?.dailyResponses?.map(d => ({
    date: fDate(d.date),   // "12.03.2025"
    yanıt: Number(d.count)
  })) || []

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
              <Icon size={24} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Son 7 Gün Yanıt Sayısı</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="yanıt" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Son Aktiviteler</h3>
          <div className="space-y-3">
            {stats?.recentActivity?.slice(0, 6).map(log => (
              <div key={log.id} className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-semibold text-xs">
                  {log.User?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <span className="font-medium">{log.User?.name}</span>
                  <span className="text-gray-500 ml-1">{log.action?.replace(/_/g, ' ')}</span>
                </div>
                <span className="text-gray-400 text-xs">
                  {fTime(log.createdAt ?? log.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
