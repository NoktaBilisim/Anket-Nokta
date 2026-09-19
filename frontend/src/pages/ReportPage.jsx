import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getSurveyReport, exportSurveyExcel } from '../utils/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Download, Star, Trophy, Users, TrendingUp, Tag, ArrowLeft, RefreshCw, AlertCircle, Inbox } from 'lucide-react'

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

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
  const [error,      setError]      = useState(null)
  const [exporting,  setExporting]  = useState(false)
  const [activeTab,  setActiveTab]  = useState('questions')

  const loadReport = useCallback(() => {
    setLoading(true)
    setError(null)
    getSurveyReport(id)
      .then(r => setReport(r.data.data))
      .catch(err => {
        setError(err.response?.data?.message || 'Rapor verisi alınırken bir hata oluştu.')
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const handleExport = async () => {
    setExporting(true)
    try {
      const r = await exportSurveyExcel(id)
      const cd = r.headers['content-disposition'] || ''
      const match = cd.match(/filename\*=UTF-8''(.+)/) || cd.match(/filename="(.+)"/)
      const filename = match ? decodeURIComponent(match[1]) : `${report?.survey?.title || 'Anket'}_rapor.xlsx`
      downloadBlob(r.data, filename)
    } catch (err) {
      alert('Excel oluşturulamadı: ' + (err.response?.data?.message || err.message || 'Hata'))
    } finally {
      setExporting(false)
    }
  }

  // ── 1. LOADING SKELETON ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-64 bg-gray-200 rounded-lg mb-2" />
            <div className="h-4 w-48 bg-gray-100 rounded" />
          </div>
          <div className="h-10 w-36 bg-gray-200 rounded-xl" />
        </div>

        {/* 4 Özet Kart */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="bg-white rounded-xl p-4 border border-gray-100 text-center space-y-2">
              <div className="h-4 w-8 bg-gray-200 rounded mx-auto" />
              <div className="h-7 w-16 bg-gray-200 rounded mx-auto" />
              <div className="h-3 w-20 bg-gray-100 rounded mx-auto" />
            </div>
          ))}
        </div>

        {/* Sekme ve Grafik Placeholder */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 space-y-4">
          <div className="h-6 w-1/3 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-100 rounded-lg" />
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
          <h3 className="text-lg font-bold text-gray-900 mb-2">Rapor Yüklenemedi</h3>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/surveys"
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Anket Listesi
            </Link>
            <button
              type="button"
              onClick={loadReport}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-1.5"
            >
              <RefreshCw size={14} /> Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!report) return null

  const hasScoring = report.questionStats?.some(qs => qs.stats.hasScoring)

  const maxPossible = (report.questionStats || []).reduce((sum, qs) => {
    if (!qs.stats.hasScoring) return sum
    if (qs.stats.type === 'rating') return sum + 10
    if (qs.stats.scoreTable) {
      const maxOpt = Math.max(0, ...(qs.stats.scoreTable.map(r => r.score)))
      if (qs.question.type === 'matrix') return sum + maxOpt * (qs.question.options?.rows?.length || 1)
      return sum + maxOpt
    }
    return sum
  }, 0)

  // ── Kategori hesapla ──────────────────────────────────────────────────────
  const categoryMap = report.categoryMap || {}
  const hasCategories = Object.keys(categoryMap).filter(k => k !== 'Kategorisiz').length > 0

  // Kategori maks puanı
  const catMaxScore = {}
  Object.entries(categoryMap).forEach(([cat, info]) => {
    let mx = 0
    ;(report.questionStats || [])
      .filter(qs => (info.questions || []).includes(qs.question.id))
      .forEach(qs => {
        if (!qs.stats.hasScoring) return
        if (qs.stats.type === 'rating') { mx += 10; return }
        if (qs.stats.scoreTable) {
          const maxOpt = Math.max(0, ...qs.stats.scoreTable.map(r => r.score))
          if (qs.question.type === 'matrix') mx += maxOpt * (qs.question.options?.rows?.length || 1)
          else mx += maxOpt
        }
      })
    catMaxScore[cat] = mx
  })

  const tabs = [
    { key: 'questions', label: 'Soru Analizi' },
    ...(hasScoring       ? [{ key: 'scores',     label: '📊 Puan Özeti' }]      : []),
    ...(hasCategories    ? [{ key: 'categories', label: '📂 Kategori Analizi' }] : []),
    ...(report.userScores?.length > 0 ? [{ key: 'users', label: '🏆 Kişi Puanları' }] : []),
  ]

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">

      {/* ── Başlık + Export ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/surveys"
            aria-label="Anketler Listesine Dön"
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{report.survey.title}</h2>
            {report.survey.description && <p className="text-gray-500 text-sm mt-0.5">{report.survey.description}</p>}
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting || report.completed === 0}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-xs"
        >
          <Download size={16} />
          {exporting ? 'Hazırlanıyor...' : 'Excel\'e Aktar'}
        </button>
      </div>

      {/* ── Özet Kartlar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Gönderilen',    value: report.sent,               icon: <Users size={18} />,      color: 'text-blue-600' },
          { label: 'Tamamlanan',    value: report.completed,          icon: <TrendingUp size={18} />,  color: 'text-green-600' },
          { label: 'Katılım Oranı', value: `${report.responseRate}%`, icon: <TrendingUp size={18} />,  color: 'text-indigo-600' },
          { label: 'Ort. Puan',     value: hasScoring ? `${report.avgScore} / ${maxPossible}` : '—',
            icon: <Star size={18} />, color: 'text-yellow-600' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 text-center shadow-xs">
            <div className={`flex justify-center mb-1 ${color}`}>{icon}</div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* ── 3. EMPTY STATE (Hiç Yanıt Yoksa) ───────────────────────── */}
      {report.completed === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-xs">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Inbox size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Henüz Yanıt Gelmedi</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
            Bu anket henüz katılımcılar tarafından tamamlanmamış. Yanıtlar gelmeye başladığında detaylı grafikler ve puan dağılımları burada listelenecektir.
          </p>
          <Link
            to="/surveys"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            Anket Yönetimine Dön
          </Link>
        </div>
      ) : (
        <>
          {/* ── Sekmeler ── */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit flex-wrap" role="tablist" aria-label="Rapor Sekmeleri">
            {tabs.map(tab => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ═══════════════════════════════════════════════════════
              SEKME 1: Soru Analizi
          ═══════════════════════════════════════════════════════ */}
          {activeTab === 'questions' && (
            <div className="space-y-6">
              {report.questionStats?.map(({ question, stats, total }, i) => (
                <div key={question.id} className="bg-white rounded-xl p-6 border border-gray-100 shadow-xs">
                  <div className="flex items-start justify-between mb-1 flex-wrap gap-2">
                    <h3 className="font-semibold text-gray-900">{i + 1}. {question.text}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {question.category && (
                        <span className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                          <Tag size={11} /> {question.category}
                        </span>
                      )}
                      {stats.totalScoreSum !== undefined && stats.totalScoreSum > 0 && (
                        <div className="flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 px-2.5 py-1 rounded-full border border-yellow-200 font-medium">
                          <Star size={12} className="text-yellow-500" /> Toplam: {stats.totalScoreSum} puan
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-4">{total} yanıt kaydedildi</p>

                  {stats.type === 'chart' && (
                    <div>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={Object.entries(stats.data).map(([name, value]) => ({ name, value }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#6366f1" radius={[4,4,0,0]} name="Seçilme Sayısı" />
                        </BarChart>
                      </ResponsiveContainer>
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
                                  <td className="px-3 py-2 text-center"><span className="text-yellow-600 font-semibold">{row.score}</span></td>
                                  <td className="px-3 py-2 text-center text-gray-600">{row.count}</td>
                                  <td className="px-3 py-2 text-center"><span className="font-bold text-indigo-600">{row.totalScore}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {stats.type === 'rating' && (
                    <div>
                      <p className="text-2xl font-bold text-indigo-600 mb-3 flex items-center gap-2">
                        ⭐ {stats.average} / 10
                        <span className="text-sm font-normal text-gray-400">— Toplam: {stats.totalScoreSum} puan</span>
                      </p>
                      <div className="flex gap-1.5 overflow-x-auto py-1">
                        {[1,2,3,4,5,6,7,8,9,10].map(n => {
                          const count = stats.distribution.filter(v => v === n).length
                          return (
                            <div key={n} className="flex-1 min-w-[32px] text-center">
                              <div className="bg-indigo-100 rounded-lg text-xs font-semibold text-indigo-700 py-1.5">{count}</div>
                              <div className="text-xs text-gray-500 mt-1 font-medium">{n}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {stats.type === 'matrix' && (
                    <div>
                      <div className="overflow-x-auto rounded-lg border border-gray-100">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-indigo-50 text-xs">
                              <th className="text-left px-3 py-2 text-gray-600 font-medium">Madde</th>
                              {(question.options?.columns || []).map((col, ci) => {
                                const c = typeof col === 'string' ? { text: col, score: 0 } : col
                                return (
                                  <th key={ci} className="text-center px-3 py-2 text-indigo-700 font-medium min-w-[80px]">
                                    {c.text}
                                    {c.score > 0 && <span className="block text-yellow-600 font-normal">({c.score}p)</span>}
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
                        <p className="text-xs text-yellow-700 font-medium mt-3 flex items-center gap-1">
                          <Star size={13} className="text-yellow-500" /> Bu sorudan toplam <strong>{stats.totalScoreSum}</strong> puan toplandı
                        </p>
                      )}
                    </div>
                  )}

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
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-xs">
                <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-100 flex items-center gap-2">
                  <Star size={18} className="text-yellow-600" />
                  <h3 className="font-semibold text-gray-800">Soru Bazlı Puan Dağılımı</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="text-left px-5 py-3">Soru</th>
                        <th className="text-left px-5 py-3">Kategori</th>
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
                            <td className="px-5 py-3">
                              {question.category
                                ? <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{question.category}</span>
                                : <span className="text-xs text-gray-300">—</span>}
                            </td>
                            <td className="px-5 py-3 text-gray-500 text-xs">{typeLabel[question.type]}</td>
                            <td className="px-5 py-3 text-center text-gray-600">{total}</td>
                            <td className="px-5 py-3 text-center"><span className="font-bold text-indigo-600 text-base">{stats.totalScoreSum || 0}</span></td>
                            <td className="px-5 py-3 text-center text-yellow-600 font-medium">{avg}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="bg-indigo-50 font-semibold">
                      <tr>
                        <td colSpan={4} className="px-5 py-3 text-right text-indigo-700">Genel Toplam</td>
                        <td className="px-5 py-3 text-center text-indigo-700 text-lg">{report.totalScoreAll}</td>
                        <td className="px-5 py-3 text-center text-yellow-700">{report.avgScore}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {report.questionStats.filter(qs => qs.stats.scoreTable?.length > 0).map(({ question, stats }, qi) => (
                <div key={question.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-xs">
                  <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-700 text-sm">{qi+1}. {question.text}</p>
                    {question.category && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                        <Tag size={10} /> {question.category}
                      </span>
                    )}
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
                            <td className="px-5 py-2 text-center"><span className="text-yellow-600 font-semibold">{row.score}</span></td>
                            <td className="px-5 py-2 text-center text-gray-600">{row.count}</td>
                            <td className="px-5 py-2 text-center"><span className="font-bold text-indigo-700">{row.totalScore}</span></td>
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
              SEKME 3: Kategori Analizi
          ═══════════════════════════════════════════════════════ */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(categoryMap)
                  .filter(([cat]) => cat !== 'Kategorisiz')
                  .map(([cat, info]) => {
                    const mx  = catMaxScore[cat] || 0
                    const tot = info.totalScoreSum || 0
                    const pct = mx > 0 ? Math.round((tot / mx) * 100) : null
                    const color = pct === null ? 'indigo' : pct >= 75 ? 'green' : pct >= 50 ? 'yellow' : 'red'
                    const colorMap = {
                      indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', bar: 'bg-indigo-500' },
                      green:  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  bar: 'bg-green-500' },
                      yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', bar: 'bg-yellow-500' },
                      red:    { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    bar: 'bg-red-400' },
                    }
                    const c = colorMap[color]
                    return (
                      <div key={cat} className={`${c.bg} border ${c.border} rounded-xl p-5 shadow-xs`}>
                        <div className="flex items-center gap-2 mb-3">
                          <Tag size={16} className={c.text} />
                          <h4 className={`font-semibold ${c.text}`}>{cat}</h4>
                        </div>
                        <p className="text-xs text-gray-500 mb-2 font-medium">{info.questionCount} soru</p>
                        <div className="flex items-end justify-between mb-2">
                          <span className={`text-2xl font-bold ${c.text}`}>{tot}</span>
                          {mx > 0 && <span className="text-xs text-gray-500 font-medium">/ {mx} maks</span>}
                        </div>
                        {pct !== null && (
                          <div>
                            <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-xs text-right mt-1 text-gray-500 font-medium">{pct}%</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>

              {Object.keys(categoryMap).filter(k => k !== 'Kategorisiz').length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs">
                  <h3 className="font-semibold text-gray-800 mb-4">Kategori Puan Karşılaştırması</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={Object.entries(categoryMap)
                        .filter(([k]) => k !== 'Kategorisiz')
                        .map(([cat, info]) => ({
                          name: cat.length > 14 ? cat.slice(0, 14) + '…' : cat,
                          puan: info.totalScoreSum || 0,
                          maks: catMaxScore[cat] || 0,
                        }))}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(val, name) => [val, name === 'puan' ? 'Toplam Puan' : 'Maks Puan']} />
                      <Bar dataKey="maks" fill="#e0e7ff" radius={[4,4,0,0]} name="Maks Puan" />
                      <Bar dataKey="puan" fill="#6366f1" radius={[4,4,0,0]} name="Toplam Puan" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {report.userScores?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-xs">
                  <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
                    <Tag size={18} className="text-indigo-600" />
                    <h3 className="font-semibold text-gray-800">Katılımcı Kategori Puanları</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                        <tr>
                          <th className="text-left px-5 py-3">Katılımcı</th>
                          {Object.keys(categoryMap)
                            .filter(k => k !== 'Kategorisiz')
                            .map(cat => (
                              <th key={cat} className="text-center px-4 py-3 min-w-[110px]">
                                {cat}
                                {catMaxScore[cat] > 0 && (
                                  <span className="block font-normal text-gray-400 normal-case">/ {catMaxScore[cat]}</span>
                                )}
                              </th>
                            ))}
                          <th className="text-center px-5 py-3">Toplam</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {[...(report.userScores || [])]
                          .sort((a, b) => b.totalScore - a.totalScore)
                          .map((us) => (
                            <tr key={us.responseId} className="hover:bg-gray-50">
                              <td className="px-5 py-3">
                                <p className="font-medium text-gray-900">{us.userName}</p>
                                <p className="text-xs text-gray-400">{us.userEmail}</p>
                              </td>
                              {Object.keys(categoryMap)
                                .filter(k => k !== 'Kategorisiz')
                                .map(cat => {
                                  const score = us.catScores?.[cat] ?? 0
                                  const mx    = catMaxScore[cat] || 0
                                  const pct   = mx > 0 ? Math.round((score / mx) * 100) : null
                                  const cls   = pct === null ? 'text-indigo-600' : pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-500'
                                  return (
                                    <td key={cat} className={`px-4 py-3 text-center font-semibold ${cls}`}>
                                      {score}
                                      {pct !== null && <span className="block text-xs font-normal text-gray-400">{pct}%</span>}
                                    </td>
                                  )
                                })}
                              <td className="px-5 py-3 text-center">
                                <ScoreBadge score={us.totalScore} max={maxPossible} />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════
              SEKME 4: Kişi Puanları
          ═══════════════════════════════════════════════════════ */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-xs">
              <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-100 flex items-center gap-2">
                <Trophy size={18} className="text-yellow-600" />
                <h3 className="font-semibold text-gray-800">Katılımcı Puan Sıralaması</h3>
                <span className="ml-auto text-xs text-gray-500 font-medium">Maks. Puan: {maxPossible}</span>
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
                      {report.questionStats.filter(qs => qs.stats.hasScoring).map((qs, qi) => (
                        <th key={qs.question.id} className="text-center px-3 py-3 min-w-[80px]">S{qi+1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...(report.userScores || [])].sort((a, b) => b.totalScore - a.totalScore).map((us, idx) => {
                      const pct    = maxPossible > 0 ? Math.round((us.totalScore / maxPossible) * 100) : 0
                      const medal  = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ''
                      return (
                        <tr key={us.responseId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-center text-gray-600 font-semibold">{medal || (idx + 1)}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{us.userName}</p>
                            <p className="text-xs text-gray-400">{us.userEmail}</p>
                          </td>
                          <td className="px-4 py-3 text-center"><ScoreBadge score={us.totalScore} max={maxPossible} /></td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`}
                                  style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-600 font-medium w-8">{pct}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-500 text-xs">
                            {us.duration ? `${Math.round(us.duration / 60)}'${us.duration % 60}"` : '—'}
                          </td>
                          {report.questionStats.filter(qs => qs.stats.hasScoring).map(qs => {
                            const pq = us.perQuestion?.find(p => p.questionId === qs.question.id)
                            return (
                              <td key={qs.question.id} className="px-3 py-3 text-center text-xs font-semibold text-indigo-600">
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
        </>
      )}
    </div>
  )
}
