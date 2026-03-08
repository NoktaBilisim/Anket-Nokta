import { useState, useEffect } from 'react'
import { getUsers, sendSurvey } from '../../utils/api'
import { X, Mail, MessageSquare } from 'lucide-react'

export default function SendModal({ survey, onClose, onSent }) {
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState([])
  const [method, setMethod] = useState('email')
  const [loading, setLoading] = useState(false)

  useEffect(() => { getUsers().then(r => setUsers(r.data.data)) }, [])

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(i => i !== id) : [...s, id])
  const selectAll = () => setSelected(users.map(u => u.id))

  const handleSend = async () => {
    if (!selected.length) return
    setLoading(true)
    try {
      await sendSurvey(survey.id, { userIds: selected, method })
      onSent()
    } catch (err) { alert(err.response?.data?.message || 'Hata') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Anket Gönder</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Gönderim Yöntemi</label>
            <div className="flex gap-2">
              {[['email', 'E-posta', Mail], ['sms', 'SMS', MessageSquare], ['whatsapp', 'WhatsApp', MessageSquare]].map(([val, label, Icon]) => (
                <button key={val} onClick={() => setMethod(val)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm transition-colors ${method === val ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Kullanıcılar</label>
              <button onClick={selectAll} className="text-xs text-indigo-600 hover:text-indigo-700">Tümünü Seç</button>
            </div>
            <div className="max-h-56 overflow-y-auto space-y-1 border border-gray-200 rounded-xl p-2">
              {users.map(user => (
                <label key={user.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selected.includes(user.id) ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                  <input type="checkbox" checked={selected.includes(user.id)} onChange={() => toggle(user.id)} className="text-indigo-600" />
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-semibold">{user.name?.[0]}</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50">İptal</button>
          <button onClick={handleSend} disabled={loading || !selected.length}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl py-2 text-sm font-medium transition-colors">
            {loading ? 'Gönderiliyor...' : `${selected.length} Kişiye Gönder`}
          </button>
        </div>
      </div>
    </div>
  )
}
