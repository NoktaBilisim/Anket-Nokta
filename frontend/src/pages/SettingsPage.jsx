import { useEffect, useState } from 'react'
import { getSettings, saveSettings, testSmtp } from '../utils/api'
import { useNotificationStore } from '../store/notificationStore'
import { Save, Wifi, Eye, EyeOff, Mail, Shield, Server, AtSign, Send, MessageSquare, Phone, Globe } from 'lucide-react'
import api from '../utils/api'

const PRESET_SERVERS = [
  { label: 'Gmail',        host: 'smtp.gmail.com',      port: '587', ssl: 'false' },
  { label: 'Gmail (SSL)',  host: 'smtp.gmail.com',      port: '465', ssl: 'true'  },
  { label: 'Outlook',      host: 'smtp.office365.com',  port: '587', ssl: 'false' },
  { label: 'Yahoo',        host: 'smtp.mail.yahoo.com', port: '587', ssl: 'false' },
  { label: 'Yandex',       host: 'smtp.yandex.com',     port: '465', ssl: 'true'  },
  { label: 'Özel Sunucu',  host: '',                    port: '587', ssl: 'false' },
]

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const labelCls = 'text-sm text-gray-600 block mb-1'

function Section({ icon, title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 bg-gray-50 border-b border-gray-200">
        <span className="text-indigo-600">{icon}</span>
        <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  )
}

function Toggle({ icon, label, hint, checked, onChange }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <div className="relative mt-0.5 flex-shrink-0" onClick={() => onChange(!checked)}>
        <div className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-200'}`} />
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
      </div>
      <div>
        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
          <span className="text-gray-400">{icon}</span>{label}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
      </div>
    </label>
  )
}

export default function SettingsPage() {
  const { add } = useNotificationStore()
  const [loading,          setLoading]        = useState(true)
  const [saving,           setSaving]         = useState(false)
  const [testing,          setTesting]        = useState(false)
  const [showPass,         setShowPass]       = useState(false)
  const [showSmsKey,       setShowSmsKey]     = useState(false)
  const [testResult,       setTestResult]     = useState(null)
  const [showTestEmail,    setShowTestEmail]  = useState(false)
  const [showTestWa,       setShowTestWa]     = useState(false)
  const [showTestSms,      setShowTestSms]    = useState(false)
  const [testEmailTo,      setTestEmailTo]    = useState('')
  const [testWaPhone,      setTestWaPhone]    = useState('')
  const [testSmsPhone,     setTestSmsPhone]   = useState('')
  const [sendingEmail,     setSendingEmail]   = useState(false)
  const [sendingWa,        setSendingWa]      = useState(false)
  const [sendingSms,       setSendingSms]     = useState(false)

  const [form, setForm] = useState({
    site_url: '',
    smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '',
    smtp_ssl: 'false', smtp_auth: 'true',
    smtp_from_name: 'SurveyPro', smtp_from_email: '',
    whatsapp_api_url: 'http://whatsapp.noktabilisim.net:3000/send-message',
    sms_api_url: 'http://smsportal.noktabilisim.net:3001',
    sms_api_key: '',
    sms_header:  'NOKTABLSM',
  })

  useEffect(() => {
    getSettings()
      .then(r => {
        setForm(f => ({ ...f, ...r.data.data }))
        setTestEmailTo(r.data.data.smtp_user || '')
      })
      .catch(() => add('Ayarlar yüklenemedi', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setTestResult(null) }

  const applyPreset = p => {
    setForm(f => ({ ...f, smtp_host: p.host, smtp_port: p.port, smtp_ssl: p.ssl }))
    setTestResult(null)
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try { await saveSettings(form); add('Ayarlar kaydedildi ✓') }
    catch (err) { add(err.response?.data?.message || 'Kayıt hatası', 'error') }
    finally { setSaving(false) }
  }

  const saveFirst = async () => { try { await saveSettings(form) } catch {} }

  const handleTestConn = async () => {
    await saveFirst(); setTesting(true); setTestResult(null)
    try {
      const r = await testSmtp()
      setTestResult({ ok: true, message: r.data.data.message })
    } catch (err) {
      setTestResult({ ok: false, message: err.response?.data?.message || 'Bağlantı başarısız' })
    } finally { setTesting(false) }
  }

  const handleTestEmail = async () => {
    if (!testEmailTo) return add('Alıcı e-posta girin', 'error')
    await saveFirst(); setSendingEmail(true); setTestResult(null)
    try {
      const r = await api.post('/settings/send-test-email', { to: testEmailTo })
      setTestResult({ ok: true, message: r.data.data.message }); add(r.data.data.message)
    } catch (err) {
      const m = err.response?.data?.message || 'Hata'
      setTestResult({ ok: false, message: m }); add(m, 'error')
    } finally { setSendingEmail(false) }
  }

  const handleTestWa = async () => {
    if (!testWaPhone) return add('Telefon numarası girin', 'error')
    await saveFirst(); setSendingWa(true); setTestResult(null)
    try {
      const r = await api.post('/settings/send-test-whatsapp', { phone: testWaPhone })
      setTestResult({ ok: true, message: r.data.data.message }); add(r.data.data.message)
    } catch (err) {
      const m = err.response?.data?.message || 'Hata'
      setTestResult({ ok: false, message: m }); add(m, 'error')
    } finally { setSendingWa(false) }
  }

  const handleTestSms = async () => {
    if (!testSmsPhone) return add('Telefon numarası girin', 'error')
    await saveFirst(); setSendingSms(true); setTestResult(null)
    try {
      const r = await api.post('/settings/send-test-sms', { phone: testSmsPhone })
      setTestResult({ ok: true, message: r.data.data.message }); add(r.data.data.message)
    } catch (err) {
      const m = err.response?.data?.message || 'Hata'
      setTestResult({ ok: false, message: m }); add(m, 'error')
    } finally { setSendingSms(false) }
  }

  const togglePanel = (panel) => {
    setShowTestEmail(panel === 'email' ? !showTestEmail : false)
    setShowTestWa(panel === 'wa' ? !showTestWa : false)
    setShowTestSms(panel === 'sms' ? !showTestSms : false)
    setTestResult(null)
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-500">Yükleniyor...</div>

  const isSsl  = form.smtp_ssl  === 'true'
  const isAuth = form.smtp_auth === 'true'

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Sistem Ayarları</h2>
      <p className="text-sm text-gray-500 mb-8">Genel, e-posta, SMS ve WhatsApp bildirim yapılandırması</p>

      <form onSubmit={handleSave} className="space-y-6">

        {/* ── Genel Ayarlar ────────────────────────────── */}
        <Section icon={<Globe size={18} />} title="Genel Ayarlar">
          <div>
            <label className={labelCls}>Site URL <span className="text-red-400">*</span></label>
            <input
              value={form.site_url}
              onChange={e => set('site_url', e.target.value)}
              placeholder="http://192.168.2.160"
              className={inputCls}
            />
            <p className="text-xs text-gray-400 mt-1">
              E-posta, SMS ve WhatsApp mesajlarındaki anket bağlantısı bu adres üzerinden oluşturulur.
              Örnek: <code className="bg-gray-100 px-1 rounded">http://192.168.2.160</code> veya <code className="bg-gray-100 px-1 rounded">https://anket.sirket.com</code>
            </p>
          </div>
          {/* Önizleme */}
          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 text-sm">
            <p className="text-xs font-semibold text-indigo-400 mb-2 uppercase tracking-wide">Örnek Anket Linki</p>
            <code className="text-indigo-700 break-all">
              {(form.site_url || 'http://localhost:3000').replace(/\/$/, '')}/survey/abc123-token
            </code>
          </div>
        </Section>

        {/* ── SMTP Sunucu ──────────────────────────────── */}
        <Section icon={<Server size={18} />} title="SMTP Sunucu">
          <div>
            <label className={labelCls}>Hazır Sunucu Şablonu</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {PRESET_SERVERS.map(p => (
                <button key={p.label} type="button" onClick={() => applyPreset(p)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    form.smtp_host === p.host && p.host !== ''
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                  }`}>{p.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>SMTP Host</label>
              <input value={form.smtp_host} onChange={e => set('smtp_host', e.target.value)}
                placeholder="smtp.gmail.com" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Port</label>
              <input value={form.smtp_port} onChange={e => set('smtp_port', e.target.value)}
                placeholder="587" type="number" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-12 pt-1">
            <Toggle icon={<Shield size={15} />} label="SSL / TLS"
              hint={isSsl ? 'Aktif — port 465' : 'Pasif — STARTTLS (587)'}
              checked={isSsl}
              onChange={v => { set('smtp_ssl', v ? 'true' : 'false'); set('smtp_port', v ? '465' : '587') }}
            />
            <Toggle icon={<Shield size={15} />} label="SMTP Kimlik Doğrulama"
              hint="Kullanıcı adı / şifre ile auth"
              checked={isAuth}
              onChange={v => set('smtp_auth', v ? 'true' : 'false')}
            />
          </div>
        </Section>

        {/* ── SMTP Kimlik ──────────────────────────────── */}
        {isAuth && (
          <Section icon={<AtSign size={18} />} title="SMTP Kimlik Bilgileri">
            <div>
              <label className={labelCls}>Kullanıcı Adı / E-posta</label>
              <input value={form.smtp_user} onChange={e => set('smtp_user', e.target.value)}
                placeholder="user@gmail.com" type="email" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Şifre / Uygulama Şifresi</label>
              <div className="relative">
                <input value={form.smtp_pass} onChange={e => set('smtp_pass', e.target.value)}
                  type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  className={inputCls + ' pr-10'} />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Gmail: Google Hesap → Güvenlik → 2 Adımlı Doğrulama → Uygulama Şifreleri
              </p>
            </div>
          </Section>
        )}

        {/* ── Gönderici ────────────────────────────────── */}
        <Section icon={<Mail size={18} />} title="E-posta Gönderici Bilgileri">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Gönderici Adı</label>
              <input value={form.smtp_from_name} onChange={e => set('smtp_from_name', e.target.value)}
                placeholder="SurveyPro" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Gönderici E-posta (send as)</label>
              <input value={form.smtp_from_email} onChange={e => set('smtp_from_email', e.target.value)}
                placeholder="noreply@sirket.com" type="email" className={inputCls} />
              <p className="text-xs text-gray-400 mt-1">Boş bırakılırsa kullanıcı adı kullanılır.</p>
            </div>
          </div>
        </Section>

        {/* ── SMS API ──────────────────────────────────── */}
        <Section icon={<Phone size={18} />} title="SMS API (noktabilisim.net)">
          <div>
            <label className={labelCls}>API Endpoint URL</label>
            <input value={form.sms_api_url} onChange={e => set('sms_api_url', e.target.value)}
              placeholder="http://smsportal.noktabilisim.net:3001" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>API Key</label>
            <div className="relative">
              <input value={form.sms_api_key} onChange={e => set('sms_api_key', e.target.value)}
                type={showSmsKey ? 'text' : 'password'} placeholder="••••••••••••••••"
                className={inputCls + ' pr-10'} />
              <button type="button" onClick={() => setShowSmsKey(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showSmsKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelCls}>SMS Başlığı (Header)</label>
            <input value={form.sms_header} onChange={e => set('sms_header', e.target.value.toUpperCase())}
              placeholder="NOKTABLSM" maxLength={11} className={inputCls} />
            <p className="text-xs text-gray-400 mt-1">Operatörde kayıtlı başlık. Boş bırakılırsa gönderilmez.</p>
          </div>
        </Section>

        {/* ── WhatsApp API ─────────────────────────────── */}
        <Section icon={<MessageSquare size={18} />} title="WhatsApp API (noktabilisim.net)">
          <div>
            <label className={labelCls}>API Endpoint URL</label>
            <input value={form.whatsapp_api_url} onChange={e => set('whatsapp_api_url', e.target.value)}
              placeholder="http://whatsapp.noktabilisim.net:3000/send-message" className={inputCls} />
          </div>
        </Section>

        {/* ── Test Sonucu ──────────────────────────────── */}
        {testResult && (
          <div className={`rounded-xl p-4 text-sm font-medium flex items-center gap-2 ${
            testResult.ok
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <span className="text-lg">{testResult.ok ? '✓' : '✗'}</span>
            {testResult.message}
          </div>
        )}

        {/* ── Test Panelleri ───────────────────────────── */}
        {showTestEmail && (
          <Section icon={<Send size={18} />} title="Test E-postası Gönder">
            <div className="flex gap-3">
              <input value={testEmailTo} onChange={e => setTestEmailTo(e.target.value)}
                type="email" placeholder="test@example.com" className={inputCls} />
              <button type="button" onClick={handleTestEmail} disabled={sendingEmail}
                className="shrink-0 flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                <Send size={14} /> {sendingEmail ? 'Gönderiliyor...' : 'Gönder'}
              </button>
            </div>
          </Section>
        )}

        {showTestSms && (
          <Section icon={<Phone size={18} />} title="Test SMS Gönder">
            <div className="flex gap-3">
              <input value={testSmsPhone} onChange={e => setTestSmsPhone(e.target.value)}
                type="tel" placeholder="5551234567 veya +905551234567" className={inputCls} />
              <button type="button" onClick={handleTestSms} disabled={sendingSms}
                className="shrink-0 flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                <Phone size={14} /> {sendingSms ? 'Gönderiliyor...' : 'Gönder'}
              </button>
            </div>
          </Section>
        )}

        {showTestWa && (
          <Section icon={<MessageSquare size={18} />} title="Test WhatsApp Mesajı Gönder">
            <div className="flex gap-3">
              <input value={testWaPhone} onChange={e => setTestWaPhone(e.target.value)}
                type="tel" placeholder="+905551234567" className={inputCls} />
              <button type="button" onClick={handleTestWa} disabled={sendingWa}
                className="shrink-0 flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                <MessageSquare size={14} /> {sendingWa ? 'Gönderiliyor...' : 'Gönder'}
              </button>
            </div>
          </Section>
        )}

        {/* ── Aksiyon Butonları ─────────────────────────── */}
        <div className="flex flex-wrap gap-3 justify-end pt-2">
          <button type="button" onClick={handleTestConn} disabled={testing || saving}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            <Wifi size={16} /> {testing ? 'Test ediliyor...' : 'SMTP Test'}
          </button>
          <button type="button" onClick={() => togglePanel('email')}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm transition-colors ${showTestEmail ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
            <Mail size={16} /> Test E-posta
          </button>
          <button type="button" onClick={() => togglePanel('sms')}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm transition-colors ${showTestSms ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
            <Phone size={16} /> Test SMS
          </button>
          <button type="button" onClick={() => togglePanel('wa')}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm transition-colors ${showTestWa ? 'border-green-400 bg-green-50 text-green-700' : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'}`}>
            <MessageSquare size={16} /> Test WhatsApp
          </button>
          <button type="submit" disabled={saving || testing}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors">
            <Save size={16} /> {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
          </button>
        </div>
      </form>
    </div>
  )
}
