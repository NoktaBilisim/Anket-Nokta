import { useState } from 'react'
import { updateProfile, changePassword } from '../utils/api'
import { useAuthStore } from '../store/authStore'
import { useNotificationStore } from '../store/notificationStore'
import { useThemeStore } from '../store/themeStore'
import { Sun, Moon, Monitor, Eye, EyeOff } from 'lucide-react'

const inputCls  = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const labelCls  = 'text-sm text-gray-600 block mb-1'

const ROLE_LABELS = { admin: 'Admin', creator: 'Creator', evaluator: 'Değerlendirici', participant: 'Katılımcı' }
const ROLE_COLORS = { admin: 'bg-red-100 text-red-700', creator: 'bg-blue-100 text-blue-700', evaluator: 'bg-purple-100 text-purple-700', participant: 'bg-gray-100 text-gray-700' }

export default function ProfilePage() {
  const { user, setUser }    = useAuthStore()
  const { add }              = useNotificationStore()
  const { theme, setTheme }  = useThemeStore()

  const [form, setForm]      = useState({ name: user?.name || '', phone: user?.phone || '', whatsapp: user?.whatsapp || '' })
  const [pwForm, setPwForm]  = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [loading, setLoading]= useState(false)
  const [showPw, setShowPw]  = useState({ current: false, next: false, confirm: false })

  const handleProfile = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      const res = await updateProfile(form)
      setUser(res.data.data)
      add('Profil güncellendi ✓')
    } catch (err) { add(err.response?.data?.message || 'Hata', 'error') }
    finally { setLoading(false) }
  }

  const handlePassword = async (e) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirm) return add('Şifreler eşleşmiyor', 'error')
    if (pwForm.newPassword.length < 6) return add('Şifre en az 6 karakter olmalı', 'error')
    setLoading(true)
    try {
      await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      add('Şifre güncellendi ✓')
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err) { add(err.response?.data?.message || 'Hata', 'error') }
    finally { setLoading(false) }
  }

  const THEMES = [
    {
      key: 'light',
      icon: <Sun size={22} />,
      label: 'Aydınlık',
      desc: 'Açık renk tema',
      preview: 'bg-white border-gray-200',
      dot: 'bg-yellow-400'
    },
    {
      key: 'dark',
      icon: <Moon size={22} />,
      label: 'Karanlık',
      desc: 'Koyu renk tema',
      preview: 'bg-gray-900 border-gray-700',
      dot: 'bg-indigo-400'
    },
    {
      key: 'system',
      icon: <Monitor size={22} />,
      label: 'Sistem',
      desc: 'OS ayarını takip et',
      preview: 'bg-gradient-to-br from-white to-gray-900 border-gray-400',
      dot: 'bg-gray-400'
    },
  ]

  const handleTheme = (key) => {
    if (key === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(prefersDark ? 'dark' : 'light')
      localStorage.setItem('theme', 'system')
    } else {
      setTheme(key)
    }
  }

  const activeTheme = localStorage.getItem('theme') || 'light'

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Profilim</h2>
        <p className="text-sm text-gray-500 mt-1">Hesap bilgileri ve tercihler</p>
      </div>

      {/* ── Kullanıcı kartı ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-5">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold ${ROLE_COLORS[user?.role]}`}>
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="text-lg font-semibold text-gray-900">{user?.name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <span className={`inline-block mt-2 text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLORS[user?.role]}`}>
            {ROLE_LABELS[user?.role] || user?.role}
          </span>
        </div>
      </div>

      {/* ── Tema Seçimi ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Görünüm Tercihi</h3>
        <p className="text-sm text-gray-500 mb-4">Uygulamanın renk temasını seçin</p>

        <div className="grid grid-cols-3 gap-3">
          {THEMES.map(t => {
            const isActive = activeTheme === t.key ||
              (t.key === 'system' && !['light','dark'].includes(activeTheme) === false && activeTheme === 'system')
            return (
              <button
                key={t.key}
                onClick={() => handleTheme(t.key)}
                className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                  activeTheme === t.key
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                }`}
              >
                {/* Önizleme kutusu */}
                <div className={`w-full h-12 rounded-lg border mb-3 ${t.preview}`} />

                <div className="flex items-center gap-2">
                  <span className={activeTheme === t.key ? 'text-indigo-600' : 'text-gray-400'}>
                    {t.icon}
                  </span>
                  <div>
                    <p className={`text-sm font-medium ${activeTheme === t.key ? 'text-indigo-700' : 'text-gray-700'}`}>
                      {t.label}
                    </p>
                    <p className="text-xs text-gray-400">{t.desc}</p>
                  </div>
                </div>

                {/* Seçili işareti */}
                {activeTheme === t.key && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Profil Bilgileri ────────────────────────────────── */}
      <form onSubmit={handleProfile} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Profil Bilgileri</h3>
        <div>
          <label className={labelCls}>Ad Soyad</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Telefon</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+905..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>WhatsApp</label>
            <input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
              placeholder="+905..." className={inputCls} />
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
          {loading ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </form>

      {/* ── Şifre Değiştir ──────────────────────────────────── */}
      <form onSubmit={handlePassword} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Şifre Değiştir</h3>

        {[
          { key: 'currentPassword', label: 'Mevcut Şifre',       field: 'current' },
          { key: 'newPassword',     label: 'Yeni Şifre',          field: 'next'    },
          { key: 'confirm',         label: 'Yeni Şifre (Tekrar)', field: 'confirm' },
        ].map(({ key, label, field }) => (
          <div key={key}>
            <label className={labelCls}>{label}</label>
            <div className="relative">
              <input
                type={showPw[field] ? 'text' : 'password'}
                value={pwForm[key]}
                onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                required
                className={inputCls + ' pr-10'}
              />
              <button type="button"
                onClick={() => setShowPw(s => ({ ...s, [field]: !s[field] }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw[field] ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        ))}

        <button type="submit" disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
          {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
        </button>
      </form>
    </div>
  )
}
