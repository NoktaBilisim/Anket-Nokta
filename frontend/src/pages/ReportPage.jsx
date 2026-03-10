import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getSurveyReport, exportSurveyExcel } from '../utils/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Download, Star, Trophy, Users, TrendingUp } from 'lucide-react'

// ── Yardımcı: Excel indir ─────────────────────────────────────────────────────
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Skor rozet rengi ──────────────────────────────────────────────────────────
function ScoreBadge({ score, max }) {
  const pct = max > 0 ? (score / max) * 100 : 0
  const cls = pct >= 75 ? 'bg-green-100 text-green-700' :
              pct >= 50 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${cls}`}>
      {score} puan
    </span>
  )
}

export default function ReportPage() {
  const { id }       = useParams()
  const [report,     setReport]     = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [exporting,  setExporting]  = useState(false)
  const [activeTab,  setActiveTab]  = useState('questions') // 'questions' | 'scores' | 'users'

  useEffect(() => {
    getSurveyReport(id).then(r => setReport(r.data.data)).finally(() => setLoading(false))
  }, [id])

  const handleExport = async () => {
    setExporting(true)
    try {
      const r = await exportSurveyExcel(id)
      const cd = r.headers['content-disposition'] || ''
      const match = cd.match(/filename\*=UTF-8''(.+)/) || cd.match(/filename="(.+)"/)
      const filename = match ? decodeURIComponent(match[1]) : `${report.survey.title}_rapor.xlsx`
      downloadBlob(r.data, filename)
    } catch (err) {
      alert('Excel oluşturulamadı: ' + (err.message || 'Hata'))
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-500">Yükleniyor...</div>
  if (!report) return <div className="p-8 text-gray-500">Rapor bulunamadı</div>

  const hasScoring = report.questionStats.some(qs => qs.stats.hasScoring)
  const maxPossible = report.questionStats.reduce((sum, qs) => {
    if (!qs.stats.hasScoring) return sum
    if (qs.stats.type === 'rating') return sum + 10
    if (qs.stats.scoreTable) {
      const maxOpt = Math.max(0, ...(qs.stats.scoreTable.map(r => r.score)))
      if (qs.question.type === 'matrix') {
        return sum + maxOpt * (qs.question.options?.rows?.length || 1)
      }
      return sum + maxOpt
    }
    return sum
  }, 0)

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* ── Başlık + Export ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{report.survey.title}</h2>
          {report.survey.description && <p className="text-gray-500 mt-1">{report.survey.description}</p>}
        </div>
        <button onClick={handleExport} disabled={exporting}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shrink-0">
          <Download size={16} />
          {exporting ? 'Hazırlanıyor...' : 'Excel\'e Aktar'}
        </button>
      </div>

      {/* ── Özet Kartlar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Gönderilen',    value: report.sent,                  icon: <Users size={18} />,      color: 'text-blue-600' },
          { label: 'Tamamlanan',    value: report.completed,             icon: <TrendingUp size={18} />,  color: 'text-green-600' },
          { label: 'Katılım Oranı', value: `${report.responseRate}%`,    icon: <TrendingUp size={18} />,  color: 'text-indigo-600' },
          { label: 'Ort. Puan',     value: hasScoring ? `${report.avgScore} / ${maxPossible}` : '—',
            icon: <Star size={18} />, color: 'text-yellow-600' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 text-center">
            <div className={`flex justify-center mb-1 ${color}`}>{icon}</div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Sekmeler ── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {[
          { key: 'questions', label: 'Soru Analizi' },
          ...(hasScoring ? [{ key: 'scores', label: '📊 Puan Özeti' }] : []),
          ...(report.userScores?.length > 0 ? [{ key: 'users', label: '🏆 Kişi Puanları' }] : []),
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════
          SEKME 1: Soru Analizi
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          {report.questionStats.map(({ question, stats, total }, i) => (
            <div key={question.id} className="bg-white rounded-xl p-6 border border-gray-100">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-semibold text-gray-900">{i + 1}. {question.text}</h3>
                {stats.totalScoreSum !== undefined && stats.totalScoreSum > 0 && (
                  <div className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-full border border-yellow-100 shrink-0 ml-3">
                    <Star size={12} /> Toplam: {stats.totalScoreSum} puan
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-4">{total} yanıt</p>

              {/* Çoktan seçmeli grafik */}
              {stats.type === 'chart' && (
                <div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={Object.entries(stats.data).map(([name, value]) => ({ name, value }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#6366f1" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  {/* Seçenek puan tablosu */}
                  {stats.scoreTable?.some(r => r.score > 0) && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                            <th className="text-left px-3 py-2">Seçenek</th>
                            <th className="text-center px-3 py-2">Puan / Seçenek</th>
                            <th className="text-center px-3 py-2">Seçilme</th>
                            <th className="text-center px-3 py-2">Toplam Puan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {stats.scoreTable.map((row, ri) => (
                            <tr key={ri} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium text-gray-800">{row.text}</td>
                              <td className="px-3 py-2 text-center">
                                <span className="text-yellow-600 font-semibold">{row.score}</span>
                              </td>
                              <td className="px-3 py-2 text-center text-gray-600">{row.count}</td>
                              <td className="px-3 py-2 text-center">
                                <span className="font-bold text-indigo-600">{row.totalScore}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Puanlama */}
              {stats.type === 'rating' && (
                <div>
                  <p className="text-3xl font-bold text-indigo-600 mb-3">
                    ⭐ {stats.average} / 10
                    <span className="text-lg text-gray-400 ml-2">— Toplam: {stats.totalScoreSum} puan</span>
                  </p>
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

              {/* Matris */}
              {stats.type === 'matrix' && (
                <div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-indigo-50 text-xs">
                          <th className="text-left px-3 py-2 text-gray-600 font-medium">Madde</th>
                          {(question.options?.columns || []).map((col, ci) => {
                            const c = typeof col === 'string' ? { text: col, score: 0 } : col
                            return (
                              <th key={ci} className="text-center px-3 py-2 text-indigo-700 font-medium">
                                {c.text}
                                {c.score > 0 && <span className="block text-yellow-500 font-normal">({c.score}p)</span>}
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(stats.rowStats || []).map((row, ri) => (
                          <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                            <td className="px-3 py-2 font-medium text-gray-800">{row.rowText}</td>
                            {Object.entries(row.colCounts).map(([col, cnt], ci) => (
                              <td key={ci} className="px-3 py-2 text-center text-gray-600">
                                {cnt > 0 ? <span className="font-semibold text-indigo-700">{cnt}</span> : <span className="text-gray-300">—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {stats.totalScoreSum > 0 && (
                    <p className="text-sm text-yellow-600 mt-3 flex items-center gap-1">
                      <Star size={14} /> Bu sorudan toplam <strong>{stats.totalScoreSum}</strong> puan toplandı
                    </p>
                  )}
                </div>
              )}

              {/* Metin yanıtlar */}
              {stats.type === 'text' && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {stats.responses.length === 0
                    ? <p className="text-gray-400 text-sm">Yanıt yok</p>
                    : stats.responses.map((r, ri) => (
                        <div key={ri} className="bg-gray-50 rounded-lg px-4 py-2 text-sm text-gray-700">{r}</div>
                      ))
                  }
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          SEKME 2: Puan Özeti
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'scores' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-100 flex items-center gap-2">
              <Star size={18} className="text-yellow-600" />
              <h3 className="font-semibold text-gray-800">Soru Bazlı Puan Dağılımı</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="text-left px-5 py-3">Soru</th>
                    <th className="text-left px-5 py-3">Tür</th>
                    <th className="text-center px-5 py-3">Yanıt</th>
                    <th className="text-center px-5 py-3">Toplam Puan</th>
                    <th className="text-center px-5 py-3">Ort. Puan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {report.questionStats.filter(qs => qs.stats.hasScoring).map(({ question, stats, total }, i) => {
                    const avg = total > 0 ? ((stats.totalScoreSum || 0) / total).toFixed(1) : '—'
                    const typeLabel = { multiple_choice: 'Çoktan Seçmeli', yes_no: 'Evet/Hayır', rating: 'Puanlama', matrix: 'Matris' }
                    return (
                      <tr key={question.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-800">{i+1}. {question.text}</td>
                        <td className="px-5 py-3 text-gray-500 text-xs">{typeLabel[question.type]}</td>
                        <td className="px-5 py-3 text-center text-gray-600">{total}</td>
                        <td className="px-5 py-3 text-center">
                          <span className="font-bold text-indigo-600 text-base">{stats.totalScoreSum || 0}</span>
                        </td>
                        <td className="px-5 py-3 text-center text-yellow-600 font-medium">{avg}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-indigo-50 font-semibold">
                  <tr>
                    <td colSpan={3} className="px-5 py-3 text-right text-indigo-700">Genel Toplam</td>
                    <td className="px-5 py-3 text-center text-indigo-700 text-lg">{report.totalScoreAll}</td>
                    <td className="px-5 py-3 text-center text-yellow-700">{report.avgScore}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Seçenek detay tabloları */}
          {report.questionStats.filter(qs => qs.stats.scoreTable?.length > 0).map(({ question, stats }, qi) => (
            <div key={question.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                <p className="font-medium text-gray-700 text-sm">{qi+1}. {question.text}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="text-left px-5 py-2">Seçenek</th>
                      <th className="text-center px-5 py-2">Puan / Seçenek</th>
                      <th className="text-center px-5 py-2">Seçilme Sayısı</th>
                      <th className="text-center px-5 py-2">Toplam Puan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stats.scoreTable.map((row, ri) => (
                      <tr key={ri} className="hover:bg-gray-50">
                        <td className="px-5 py-2 text-gray-800">{row.text}</td>
                        <td className="px-5 py-2 text-center">
                          <span className="text-yellow-600 font-semibold">{row.score}</span>
                        </td>
                        <td className="px-5 py-2 text-center text-gray-600">{row.count}</td>
                        <td className="px-5 py-2 text-center">
                          <span className="font-bold text-indigo-700">{row.totalScore}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          SEKME 3: Kişi Puanları
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-100 flex items-center gap-2">
            <Trophy size={18} className="text-yellow-600" />
            <h3 className="font-semibold text-gray-800">Katılımcı Puan Sıralaması</h3>
            <span className="ml-auto text-sm text-gray-500">Maks. puan: {maxPossible}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-center px-4 py-3 w-12">Sıra</th>
                  <th className="text-left px-4 py-3">Katılımcı</th>
                  <th className="text-center px-4 py-3">Toplam Puan</th>
                  <th className="text-center px-4 py-3">Başarı %</th>
                  <th className="text-center px-4 py-3">Süre</th>
                  {/* Soru bazlı puanlar */}
                  {report.questionStats.filter(qs => qs.stats.hasScoring).map((qs, qi) => (
                    <th key={qs.question.id} className="text-center px-3 py-3 min-w-[80px]">
                      S{qi+1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...(report.userScores || [])].sort((a, b) => b.totalScore - a.totalScore).map((us, idx) => {
                  const pct = maxPossible > 0 ? Math.round((us.totalScore / maxPossible) * 100) : 0
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ''
                  return (
                    <tr key={us.responseId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-center text-gray-500 font-medium">
                        {medal || (idx + 1)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{us.userName}</p>
                        <p className="text-xs text-gray-400">{us.userEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ScoreBadge score={us.totalScore} max={maxPossible} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`}
                              style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-600 w-8">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500 text-xs">
                        {us.duration ? `${Math.round(us.duration / 60)}'${us.duration % 60}"` : '—'}
                      </td>
                      {/* Soru bazlı puanlar */}
                      {report.questionStats.filter(qs => qs.stats.hasScoring).map(qs => {
                        const pq = us.perQuestion?.find(p => p.questionId === qs.question.id)
                        return (
                          <td key={qs.question.id} className="px-3 py-3 text-center text-xs font-medium text-indigo-600">
                            {pq?.score ?? '—'}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
