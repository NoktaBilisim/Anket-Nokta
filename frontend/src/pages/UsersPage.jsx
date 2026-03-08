import { useEffect, useState } from 'react'
import { getUsers, createUser, deleteUser, updateUser } from '../utils/api'
import { useNotificationStore } from '../store/notificationStore'
import { UserPlus, Trash2, Edit2, X, Eye, EyeOff, ToggleLeft, ToggleRight } from 'lucide-react'

const ROLES = ['admin', 'creator', 'evaluator', 'participant']
const ROLE_LABELS  = { admin: 'Admin', creator: 'Creator', evaluator: 'Evaluator', participant: 'Katılımcı' }
const ROLE_COLORS  = { admin: 'bg-red-100 text-red-700', creator: 'bg-blue-100 text-blue-700', evaluator: 'bg-purple-100 text-purple-700', participant: 'bg-gray-100 text-gray-700' }

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const labelCls = 'text-xs font-medium text-gray-500 block mb-1 uppercase tracking-wide'

const EMPTY_FORM = { name: '', email: '', password: '', role: 'participant', phone: '', whatsapp: '', is_active: true }

// ─── Modal ───────────────────────────────────────────────────────────────────
function UserModal({ user, onClose, onSave }) {
  const isEdit = !!user?.id
  const [form, setForm]       = useState(isEdit ? { ...user, password: '' } : EMPTY_FORM)
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving]   = useState(false)
  const { add } = useNotificationStore()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form }
      // Düzenlemede boş şifre gönderme
      if (isEdit && !payload.password) delete payload.password
      if (isEdit) {
        await updateUser(user.id, payload)
        add('Kullanıcı güncellendi ✓')
      } else {
        await createUser(payload)
        add('Kullanıcı oluşturuldu ✓')
      }
      onSave()
    } catch (err) {
      add(err.response?.data?.message || 'Hata', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
              {form.name?.[0]?.toUpperCase() || '?'}
            </div>
            <h3 className="font-semibold text-gray-900">
              {isEdit ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı'}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Ad & E-posta */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Ad Soyad *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="Ahmet Yılmaz" required className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>E-posta *</label>
              <input value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="ahmet@sirket.com" type="email" required
                disabled={isEdit}
                className={inputCls + (isEdit ? ' bg-gray-50 text-gray-400 cursor-not-allowed' : '')} />
              {isEdit && <p className="text-xs text-gray-400 mt-1">E-posta değiştirilemez.</p>}
            </div>
          </div>

          {/* Şifre */}
          <div>
            <label className={labelCls}>{isEdit ? 'Yeni Şifre (boş = değişmez)' : 'Şifre *'}</label>
            <div className="relative">
              <input
                value={form.password}
                onChange={e => set('password', e.target.value)}
                type={showPass ? 'text' : 'password'}
                placeholder={isEdit ? '••••••••' : 'En az 6 karakter'}
                required={!isEdit}
                className={inputCls + ' pr-10'}
              />
              <button type="button" onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Rol */}
          <div>
            <label className={labelCls}>Rol *</label>
            <div className="grid grid-cols-4 gap-2">
              {ROLES.map(r => (
                <button key={r} type="button" onClick={() => set('role', r)}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                    form.role === r
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                  }`}>
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          {/* Telefon & WhatsApp */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Telefon</label>
              <input value={form.phone || ''} onChange={e => set('phone', e.target.value)}
                placeholder="+905551234567" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>WhatsApp</label>
              <input value={form.whatsapp || ''} onChange={e => set('whatsapp', e.target.value)}
                placeholder="+905551234567" className={inputCls} />
              <p className="text-xs text-gray-400 mt-1">Boşsa telefon kullanılır.</p>
            </div>
          </div>

          {/* Aktif/Pasif */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-800">Hesap Durumu</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {form.is_active ? 'Kullanıcı sisteme giriş yapabilir' : 'Kullanıcı giriş yapamaz'}
              </p>
            </div>
            <button type="button" onClick={() => set('is_active', !form.is_active)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                form.is_active
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}>
              {form.is_active
                ? <><ToggleRight size={18} /> Aktif</>
                : <><ToggleLeft size={18} /> Pasif</>
              }
            </button>
          </div>

          {/* Butonlar */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              İptal
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">
              {saving ? 'Kaydediliyor...' : (isEdit ? 'Güncelle' : 'Oluştur')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)   // null | 'create' | user object
  const [search, setSearch]   = useState('')
  const { add } = useNotificationStore()

  const load = () => {
    setLoading(true)
    getUsers().then(r => setUsers(r.data.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleDelete = async (user) => {
    if (!confirm(`"${user.name}" kullanıcısını silmek istediğinize emin misiniz?`)) return
    try { await deleteUser(user.id); add('Kullanıcı silindi'); load() }
    catch (err) { add(err.response?.data?.message || 'Hata', 'error') }
  }

  const handleToggleActive = async (user) => {
    try {
      await updateUser(user.id, { is_active: !user.is_active })
      add(user.is_active ? 'Kullanıcı pasif yapıldı' : 'Kullanıcı aktif yapıldı')
      load()
    } catch { add('Hata', 'error') }
  }

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="flex items-center justify-center h-full text-gray-500">Yükleniyor...</div>

  return (
    <div className="p-8">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Kullanıcılar</h2>
          <p className="text-sm text-gray-500 mt-1">{users.length} kullanıcı</p>
        </div>
        <button onClick={() => setModal('create')}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <UserPlus size={16} /> Yeni Kullanıcı
        </button>
      </div>

      {/* Arama */}
      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="İsim veya e-posta ile ara..."
          className="w-full max-w-sm border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Kullanıcı</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Rol</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Telefon</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">WhatsApp</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Durum</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-sm">Kullanıcı bulunamadı</td></tr>
            )}
            {filtered.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">

                {/* Kullanıcı */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm ${ROLE_COLORS[user.role]}`}>
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </td>

                {/* Rol */}
                <td className="px-6 py-4">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLORS[user.role]}`}>
                    {ROLE_LABELS[user.role]}
                  </span>
                </td>

                {/* Telefon */}
                <td className="px-6 py-4 text-sm text-gray-600">{user.phone || <span className="text-gray-300">—</span>}</td>

                {/* WhatsApp */}
                <td className="px-6 py-4 text-sm text-gray-600">{user.whatsapp || <span className="text-gray-300">—</span>}</td>

                {/* Durum */}
                <td className="px-6 py-4">
                  <button onClick={() => handleToggleActive(user)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                      user.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}>
                    {user.is_active ? 'Aktif' : 'Pasif'}
                  </button>
                </td>

                {/* İşlemler */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => setModal(user)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Düzenle">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(user)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Sil">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <UserModal
          user={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
