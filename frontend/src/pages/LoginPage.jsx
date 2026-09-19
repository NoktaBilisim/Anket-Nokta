import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useBrandingStore } from '../store/brandingStore'
import { useNotificationStore } from '../store/notificationStore'
import truguardLogo from '../assets/Truguard_logo.png'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const { appLogo, appTitle, cacheKey } = useBrandingStore()
  const { add } = useNotificationStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      add(err.response?.data?.message || 'Giriş başarısız', 'error')
    } finally {
      setLoading(false)
    }
  }

  const demoAccounts = [
    { label: 'Admin', email: 'admin@surveypro.com', password: 'Admin123!' },
    { label: 'Creator', email: 'creator@surveypro.com', password: 'Creator123!' },
    { label: 'Evaluator', email: 'evaluator@surveypro.com', password: 'Eval123!' },
    { label: 'Katılımcı', email: 'user1@surveypro.com', password: 'User123!' },
  ]

  const logoSrc = appLogo ? `${appLogo}?v=${cacheKey}` : truguardLogo

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">

          {/* Logo + Başlık */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4 min-h-[64px] items-center">
              <img
                src={logoSrc}
                alt={appTitle || 'SurveyPro'}
                className="h-16 w-auto max-w-[240px] object-contain drop-shadow-lg transition-all duration-300"
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = truguardLogo
                }}
              />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">{appTitle || 'SurveyPro'}</h1>
            <p className="text-white/60 mt-1 text-sm">Anket ve Değerlendirme Yönetim Sistemi</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-white/80 text-sm block mb-1">E-posta</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/60"
                placeholder="email@example.com" required />
            </div>
            <div>
              <label className="text-white/80 text-sm block mb-1">Şifre</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/60"
                placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors">
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="mt-6">
            <p className="text-white/50 text-xs text-center mb-3">Demo Hesaplar</p>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map(acc => (
                <button key={acc.email} onClick={() => setForm({ email: acc.email, password: acc.password })}
                  className="text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-2 transition-colors">
                  <p className="text-white text-xs font-medium">{acc.label}</p>
                  <p className="text-white/50 text-xs truncate">{acc.email}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
