import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getSurveyReport } from '../utils/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ReportPage() {
  const { id } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSurveyReport(id).then(r => setReport(r.data.data)).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-full text-gray-500">Yükleniyor...</div>
  if (!report) return <div className="p-8 text-gray-500">Rapor bulunamadı</div>

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{report.survey.title}</h2>
      <p className="text-gray-500 mb-6">{report.survey.description}</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Gönderilen', value: report.sent },
          { label: 'Açılan', value: report.opened },
          { label: 'Tamamlanan', value: report.completed },
          { label: 'Katılım Oranı', value: `${report.responseRate}%` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-2xl font-bold text-indigo-600">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-8">
        {report.questionStats.map(({ question, stats, total }, i) => (
          <div key={question.id} className="bg-white rounded-xl p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">{i + 1}. {question.text}</h3>
            <p className="text-sm text-gray-500 mb-4">{total} yanıt</p>

            {stats.type === 'chart' && (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={Object.entries(stats.data).map(([name, value]) => ({ name, value }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {stats.type === 'rating' && (
              <div>
                <p className="text-3xl font-bold text-indigo-600 mb-3">⭐ {stats.average} / 10</p>
                <div className="flex gap-1">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => {
                    const count = stats.distribution.filter(v => v === n).length
                    return (
                      <div key={n} className="flex-1 text-center">
                        <div className="bg-indigo-100 rounded text-xs text-indigo-700 py-1">{count}</div>
                        <div className="text-xs text-gray-400 mt-1">{n}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {stats.type === 'text' && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {stats.responses.length === 0 ? <p className="text-gray-400 text-sm">Yanıt yok</p> :
                  stats.responses.map((r, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg px-4 py-2 text-sm text-gray-700">{r}</div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
