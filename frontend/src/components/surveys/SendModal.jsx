import { useState, useEffect } from 'react'
import { getUsers, sendSurvey } from '../../utils/api'
import { X, Mail, MessageSquare, Phone, AlertCircle, CheckCircle2 } from 'lucide-react'

const METHOD_CONFIG = {
  email:     { label: 'E-posta',   icon: Mail,          color: 'text-blue-600',  field: 'email',    fieldLabel: 'E-posta' },
  whatsapp:  { label: 'WhatsApp',  icon: MessageSquare, color: 'text-green-600', field: 'whatsapp', fieldLabel: 'WhatsApp / Telefon' },
  sms:       { label: 'SMS',       icon: Phone,         color: 'text-purple-600',field: 'phone',    fieldLabel: 'Telefon' },
}

function hasContact(user, method) {
  const field = METHOD_CONFIG[method]?.field
  if (method === 'whatsapp') return !!(user.whatsapp || user.phone)
  return !!user[field]
}

function contactValue(user, method) {
  if (method === 'whatsapp') return user.whatsapp || user.phone || '—'
  return user[METHOD_CONFIG[method]?.field] || '—'
}

export default function SendModal({ survey, onClose, onSent }) {
  const [users, setUsers]     = useState([])
  const [selected, setSelected] = useState([])
  const [method, setMethod]   = useState('whatsapp')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)   // { sent, failed }

  useEffect(() => { getUsers().then(r => setUsers(r.data.data)) }, [])

  // Yöntem değişince geçersiz seçimleri temizle
  useEffect(() => {
    setSelected(s => s.filter(id => {
      const u = users.find(u => u.id === id)
      return u && hasContact(u, method)
    }))
  }, [method, users])

  const eligible = users.filter(u => hasContact(u, method))
  const toggle   = (id) => setSelected(s => s.includes(id) ? s.filter(i => i !== id) : [...s, id])
  const selectAll = () => setSelected(eligible.map(u => u.id))
  const clearAll  = () => setSelected([])

  const handleSend = async () => {
    if (!selected.length) return
    setLoading(true); setResult(null)
    try {
      const res = await sendSurvey(survey.id, { userIds: selected, method })
      setResult(res.data.data)
      if (res.data.data.failed?.length === 0) {
        setTimeout(() => onSent(), 1500)
      }
    } catch (err) {
      setResult({ error: err.response?.data?.message || 'Gönderim hatası' })
    } finally { setLoading(false) }
  }

  const cfg = METHOD_CONFIG[method]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="font-semibold text-gray-900">Anket Gönder</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{survey.title}</p>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">

          {/* Yöntem seçimi */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
              Gönderim Yöntemi
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(METHOD_CONFIG).map(([val, c]) => {
                const Icon = c.icon
                const count = users.filter(u => hasContact(u, val)).length
                return (
                  <button key={val} onClick={() => setMethod(val)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm transition-all ${
                      method === val
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-gray-200 text-gray-500 hover:border-indigo-300 hover:bg-gray-50'
                    }`}>
                    <Icon size={18} className={method === val ? c.color : ''} />
                    <span className="font-medium text-xs">{c.label}</span>
                    <span className="text-xs opacity-60">{count} kişi</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Kullanıcı listesi */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Alıcılar
                {eligible.length === 0 && (
                  <span className="ml-2 text-red-500 normal-case">({cfg.fieldLabel} bilgisi olan kullanıcı yok)</span>
                )}
              </label>
              <div className="flex gap-2">
                {selected.length > 0 && (
                  <button onClick={clearAll} className="text-xs text-gray-400 hover:text-gray-600">Temizle</button>
                )}
                {eligible.length > 0 && (
                  <button onClick={selectAll} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                    Tümünü Seç ({eligible.length})
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1 border border-gray-200 rounded-xl p-2">
              {users.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-4">Kullanıcılar yükleniyor...</p>
              )}
              {users.map(user => {
                const ok       = hasContact(user, method)
                const contact  = contactValue(user, method)
                const isSelected = selected.includes(user.id)
                return (
                  <label key={user.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                      !ok          ? 'opacity-40 cursor-not-allowed' :
                      isSelected   ? 'bg-indigo-50 cursor-pointer' :
                                     'hover:bg-gray-50 cursor-pointer'
                    }`}>
                    <input type="checkbox" disabled={!ok}
                      checked={isSelected} onChange={() => ok && toggle(user.id)}
                      className="text-indigo-600 accent-indigo-600" />
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                      <p className={`text-xs truncate ${ok ? 'text-gray-500' : 'text-red-400'}`}>
                        {ok ? contact : `${cfg.fieldLabel} yok`}
                      </p>
                    </div>
                    {ok && <cfg.icon size={13} className={`shrink-0 ${cfg.color} opacity-60`} />}
                  </label>
                )
              })}
            </div>
          </div>

          {/* Sonuç mesajı */}
          {result && (
            <div className={`rounded-xl p-3 text-sm flex items-start gap-2 ${
              result.error ? 'bg-red-50 text-red-700' :
              result.failed?.length > 0 ? 'bg-yellow-50 text-yellow-700' :
              'bg-green-50 text-green-700'
            }`}>
              {result.error
                ? <AlertCircle size={16} className="shrink-0 mt-0.5" />
                : <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              }
              <div>
                {result.error
                  ? result.error
                  : <>
                      <strong>{result.sent}</strong> kişiye gönderildi
                      {result.failed?.length > 0 && (
                        <div className="mt-1 text-xs opacity-80">
                          Başarısız: {result.failed.map(f => f.user).join(', ')}
                        </div>
                      )}
                    </>
                }
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
          <button onClick={onClose}
            className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            {result?.sent > 0 ? 'Kapat' : 'İptal'}
          </button>
          <button onClick={handleSend}
            disabled={loading || !selected.length}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2">
            {loading
              ? <><span className="animate-spin">⏳</span> Gönderiliyor...</>
              : <><cfg.icon size={15} /> {selected.length} Kişiye Gönder</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
