import { useEffect, useState, useRef } from 'react'
import {
  getSettings,
  saveSettings,
  uploadLogo,
  deleteLogo,
  testSmtp,
  sendTestEmail,
  sendTestWhatsApp,
  sendTestSms
} from '../utils/api'
import { useNotificationStore } from '../store/notificationStore'
import { useBrandingStore } from '../store/brandingStore'
import truguardLogo from '../assets/Truguard_logo.png'
import {
  Save, Wifi, Eye, EyeOff, Mail, Shield, Server, AtSign, Send,
  MessageSquare, Phone, Globe, Image as ImageIcon, UploadCloud,
  RotateCcw, AlertTriangle, CheckCircle2, XCircle, Trash2, HelpCircle
} from 'lucide-react'

const PRESET_SERVERS = [
  { label: 'Gmail',        host: 'smtp.gmail.com',      port: '587', ssl: 'false' },
  { label: 'Gmail (SSL)',  host: 'smtp.gmail.com',      port: '465', ssl: 'true'  },
  { label: 'Outlook',      host: 'smtp.office365.com',  port: '587', ssl: 'false' },
  { label: 'Yahoo',        host: 'smtp.mail.yahoo.com', port: '587', ssl: 'false' },
  { label: 'Yandex',       host: 'smtp.yandex.com',     port: '465', ssl: 'true'  },
  { label: 'Özel Sunucu',  host: '',                    port: '587', ssl: 'false' },
]

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg']
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 // 2MB

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const labelCls = 'text-sm text-gray-700 font-medium block mb-1'

function Section({ icon, title, badge, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
      <div className="flex items-center justify-between px-6 py-4 bg-gray-50/80 border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <span className="text-indigo-600 p-1.5 bg-indigo-50 rounded-lg">{icon}</span>
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        </div>
        {badge && (
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
            {badge}
          </span>
        )}
      </div>
      <div className="p-6 space-y-5">{children}</div>
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
  const { appLogo, appTitle, cacheKey, setBranding, resetLogo } = useBrandingStore()

  // Durum Yönetimi
  const [loading,          setLoading]        = useState(true)
  const [loadError,        setLoadError]      = useState(null)
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

  // Logo ve Marka State'leri
  const [selectedLogoFile, setSelectedLogoFile] = useState(null)
  const [previewUrl,       setPreviewUrl]       = useState(null)
  const [uploadingLogo,    setUploadingLogo]    = useState(false)
  const [resettingLogo,    setResettingLogo]    = useState(false)
  const [showResetModal,   setShowResetModal]   = useState(false)
  const [isDragging,       setIsDragging]       = useState(false)
  const fileInputRef                            = useRef(null)

  const [form, setForm] = useState({
    app_title: 'SurveyPro',
    app_logo: '',
    site_url: '',
    smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '',
    smtp_ssl: 'false', smtp_auth: 'true',
    smtp_from_name: 'SurveyPro', smtp_from_email: '',
    whatsapp_api_url: 'http://whatsapp.noktabilisim.net:3000/send-message',
    sms_api_url: 'http://smsportal.noktabilisim.net:3001',
    sms_api_key: '',
    sms_header:  'NOKTABLSM',
  })

  const loadAllSettings = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const r = await getSettings()
      const data = r.data?.data || {}
      setForm(f => ({ ...f, ...data }))
      setTestEmailTo(data.smtp_user || '')
      if (data.app_logo !== undefined || data.app_title !== undefined) {
        setBranding({ app_logo: data.app_logo, app_title: data.app_title, site_url: data.site_url })
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Ayarlar sunucudan yüklenemedi'
      setLoadError(msg)
      add(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllSettings()
  }, [])

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setTestResult(null)
  }

  const applyPreset = p => {
    setForm(f => ({ ...f, smtp_host: p.host, smtp_port: p.port, smtp_ssl: p.ssl }))
    setTestResult(null)
  }

  // Dosya Doğrulama Yardımcısı (AC-23)
  const validateFile = (file) => {
    if (!file) return false

    // 1. Boyut denetimi (max 2MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      add('Dosya boyutu 2MB\'tan büyük olamaz.', 'error')
      return false
    }

    // 2. MIME türü ve dosya uzantısı denetimi
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    const isMimeValid = ALLOWED_MIME_TYPES.includes(file.type)
    const isExtValid = ALLOWED_EXTENSIONS.includes(ext)

    if (!isMimeValid && !isExtValid) {
      add('Geçersiz dosya formatı. Yalnızca PNG, JPG, JPEG, WebP ve SVG formatları desteklenir.', 'error')
      return false
    }

    return true
  }

  const handleFileChange = (file) => {
    if (!file) return
    if (!validateFile(file)) {
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setSelectedLogoFile(file)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  const handleCancelSelection = () => {
    setSelectedLogoFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Logo Yükleme / Değiştirme (AC-23, AC-24)
  const handleUploadLogo = async () => {
    if (!selectedLogoFile) {
      return add('Lütfen yüklenecek bir logo dosyası seçin.', 'error')
    }

    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('logo', selectedLogoFile)

      const res = await uploadLogo(formData)
      const data = res.data?.data || {}

      // State ve Store senkronizasyonu
      set('app_logo', data.app_logo)
      setBranding({
        app_logo: data.app_logo,
        app_title: form.app_title || data.app_title
      })

      handleCancelSelection()
      add(data.message || 'Logo başarıyla yüklendi ve güncellendi ✓', 'success')
    } catch (err) {
      const msg = err.response?.data?.message || 'Logo yüklenirken bir hata oluştu'
      add(msg, 'error')
    } finally {
      setUploadingLogo(false)
    }
  }

  // Varsayılana Sıfırlama (AC-24)
  const handleResetLogo = async () => {
    setResettingLogo(true)
    try {
      await deleteLogo()
      resetLogo()
      set('app_logo', '')
      handleCancelSelection()
      setShowResetModal(false)
      add('Özel logo kaldırıldı, varsayılan Truguard logosuna dönüldü ✓', 'success')
    } catch (err) {
      const msg = err.response?.data?.message || 'Logo sıfırlanırken bir hata oluştu'
      add(msg, 'error')
    } finally {
      setResettingLogo(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await saveSettings(form)
      setBranding({
        app_title: form.app_title,
        site_url: form.site_url
      })
      add('Ayarlar başarıyla kaydedildi ✓')
    } catch (err) {
      add(err.response?.data?.message || 'Kayıt sırasında hata oluştu', 'error')
    } finally {
      setSaving(false)
    }
  }

  const saveFirst = async () => {
    try { await saveSettings(form) } catch {}
  }

  const handleTestConn = async () => {
    await saveFirst()
    setTesting(true)
    setTestResult(null)
    try {
      const r = await testSmtp()
      setTestResult({ ok: true, message: r.data?.data?.message || 'SMTP bağlantısı başarılı' })
    } catch (err) {
      setTestResult({ ok: false, message: err.response?.data?.message || 'Bağlantı başarısız' })
    } finally {
      setTesting(false)
    }
  }

  const handleTestEmail = async () => {
    if (!testEmailTo) return add('Alıcı e-posta girin', 'error')
    await saveFirst()
    setSendingEmail(true)
    setTestResult(null)
    try {
      const r = await sendTestEmail({ to: testEmailTo })
      const msg = r.data?.data?.message || 'Test e-postası gönderildi'
      setTestResult({ ok: true, message: msg })
      add(msg)
    } catch (err) {
      const m = err.response?.data?.message || 'E-posta gönderilemedi'
      setTestResult({ ok: false, message: m })
      add(m, 'error')
    } finally {
      setSendingEmail(false)
    }
  }

  const handleTestWa = async () => {
    if (!testWaPhone) return add('Telefon numarası girin', 'error')
    await saveFirst()
    setSendingWa(true)
    setTestResult(null)
    try {
      const r = await sendTestWhatsApp({ phone: testWaPhone })
      const msg = r.data?.data?.message || 'WhatsApp mesajı gönderildi'
      setTestResult({ ok: true, message: msg })
      add(msg)
    } catch (err) {
      const m = err.response?.data?.message || 'WhatsApp mesajı gönderilemedi'
      setTestResult({ ok: false, message: m })
      add(m, 'error')
    } finally {
      setSendingWa(false)
    }
  }

  const handleTestSms = async () => {
    if (!testSmsPhone) return add('Telefon numarası girin', 'error')
    await saveFirst()
    setSendingSms(true)
    setTestResult(null)
    try {
      const r = await sendTestSms({ phone: testSmsPhone })
      const msg = r.data?.data?.message || 'SMS gönderildi'
      setTestResult({ ok: true, message: msg })
      add(msg)
    } catch (err) {
      const m = err.response?.data?.message || 'SMS gönderilemedi'
      setTestResult({ ok: false, message: m })
      add(m, 'error')
    } finally {
      setSendingSms(false)
    }
  }

  const togglePanel = (panel) => {
    setShowTestEmail(panel === 'email' ? !showTestEmail : false)
    setShowTestWa(panel === 'wa' ? !showTestWa : false)
    setShowTestSms(panel === 'sms' ? !showTestSms : false)
    setTestResult(null)
  }

  // 1. Loading Durumu (Skeleton)
  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-8" />
        <div className="h-64 bg-gray-200 rounded-xl" />
        <div className="h-48 bg-gray-200 rounded-xl" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  // 2. Error Durumu (Tekrar Dene)
  if (loadError) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 space-y-4">
          <XCircle className="mx-auto text-red-500" size={48} />
          <h3 className="text-lg font-bold text-red-800">Ayarlar Yüklenemedi</h3>
          <p className="text-sm text-red-600">{loadError}</p>
          <button
            type="button"
            onClick={loadAllSettings}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl text-sm transition-colors"
          >
            Yeniden Dene
          </button>
        </div>
      </div>
    )
  }

  const isSsl  = form.smtp_ssl  === 'true'
  const isAuth = form.smtp_auth === 'true'
  const activeLogoUrl = previewUrl || (form.app_logo ? `${form.app_logo}?v=${cacheKey}` : null)
  const isCustomLogoActive = Boolean(form.app_logo)

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      {/* Üst Başlık */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Sistem ve Marka Ayarları</h2>
        <p className="text-sm text-gray-500 mt-1">
          Kurumsal marka kimliği, logo, e-posta, SMS ve WhatsApp bildirim servisleri yönetimi
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* ── 1. Kurumsal Marka ve Logo Yönetimi (AC-23, AC-24, AC-25, AC-26) ── */}
        <Section
          icon={<ImageIcon size={18} />}
          title="Kurumsal Marka ve Logo Yönetimi"
          badge={isCustomLogoActive ? 'Özel Logo Aktif' : 'Varsayılan Logo'}
        >
          {/* Sistem Başlığı (app_title) */}
          <div>
            <label className={labelCls}>
              Sistem / Uygulama Başlığı <span className="text-red-500">*</span>
            </label>
            <input
              value={form.app_title || ''}
              onChange={e => set('app_title', e.target.value)}
              placeholder="Örn: SurveyPro veya ABC Holding Anket Portalı"
              className={inputCls}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Giriş sayfasında, sol menüde ve tarayıcı sekmesinde görüntülenecek kurumsal sistem adı.
            </p>
          </div>

          {/* Logo Yükleme ve Önizleme Alanı */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <label className={labelCls}>
                Kurumsal Logo (White-Labeling)
              </label>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <HelpCircle size={14} />
                <span>PNG, JPG, SVG, WebP (Maks. 2MB)</span>
              </div>
            </div>

            {/* Drag & Drop Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
                  : selectedLogoFile
                  ? 'border-indigo-300 bg-indigo-50/20'
                  : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                onChange={e => handleFileChange(e.target.files?.[0])}
                className="hidden"
              />

              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <UploadCloud size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {selectedLogoFile ? selectedLogoFile.name : 'Yeni bir logo dosyası seçin veya buraya sürükleyin'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedLogoFile
                      ? `${(selectedLogoFile.size / 1024).toFixed(1)} KB — Yüklemek için aşağıdaki butona basın`
                      : 'Şeffaf arka planlı (PNG/SVG) yatay logo formatı önerilir'}
                  </p>
                </div>
              </div>
            </div>

            {/* Seçilen dosya aksiyonları */}
            {selectedLogoFile && (
              <div className="mt-3 flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />
                  <span className="text-xs font-medium text-indigo-900 truncate">
                    Seçildi: {selectedLogoFile.name} ({(selectedLogoFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCancelSelection}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    onClick={handleUploadLogo}
                    disabled={uploadingLogo}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                  >
                    <UploadCloud size={14} />
                    {uploadingLogo ? 'Yükleniyor...' : 'Logoyu Kaydet ve Uygula'}
                  </button>
                </div>
              </div>
            )}

            {/* Canlı Önizleme Kartları (Açık & Koyu Zemin) */}
            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                Canlı Görsel Önizleme
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Açık Zemin Önizleme */}
                <div className="border border-gray-200 rounded-xl p-4 bg-white flex flex-col items-center justify-center min-h-[120px] relative shadow-2xs">
                  <span className="absolute top-2 left-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Açık Zemin (Sidebar)
                  </span>
                  <div className="flex items-center justify-center h-14 w-full p-1 mt-2">
                    <img
                      src={activeLogoUrl || truguardLogo}
                      alt="Logo Önizleme (Açık)"
                      className="h-12 max-h-12 w-auto max-w-[200px] object-contain drop-shadow-xs"
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src = truguardLogo
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-gray-500 mt-2 font-medium">
                    {previewUrl
                      ? 'Yeni Seçilen Logo Önizlemesi'
                      : isCustomLogoActive
                      ? 'Yüklü Özel Logo'
                      : 'Varsayılan Truguard Logosu'}
                  </span>
                </div>

                {/* Koyu Zemin Önizleme */}
                <div className="border border-slate-700 rounded-xl p-4 bg-slate-900 flex flex-col items-center justify-center min-h-[120px] relative shadow-2xs">
                  <span className="absolute top-2 left-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Koyu Zemin (Login Ekranı)
                  </span>
                  <div className="flex items-center justify-center h-14 w-full p-1 mt-2">
                    <img
                      src={activeLogoUrl || truguardLogo}
                      alt="Logo Önizleme (Koyu)"
                      className="h-12 max-h-12 w-auto max-w-[200px] object-contain drop-shadow-md"
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src = truguardLogo
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 font-medium">
                    {previewUrl
                      ? 'Yeni Seçilen Logo Önizlemesi'
                      : isCustomLogoActive
                      ? 'Yüklü Özel Logo'
                      : 'Varsayılan Truguard Logosu'}
                  </span>
                </div>
              </div>
            </div>

            {/* Varsayılana Dön (Sıfırla) Aksiyonu */}
            {isCustomLogoActive && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                  <span>Özel logoyu kaldırıp orijinal Truguard varsayılan logosuna dönmek için:</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  disabled={resettingLogo}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RotateCcw size={14} />
                  {resettingLogo ? 'Sıfırlanıyor...' : 'Varsayılana Dön (Sıfırla)'}
                </button>
              </div>
            )}
          </div>
        </Section>

        {/* ── 2. Genel Ayarlar ────────────────────────────── */}
        <Section icon={<Globe size={18} />} title="Genel Bağlantı Ayarları">
          <div>
            <label className={labelCls}>
              Site Taban URL <span className="text-red-500">*</span>
            </label>
            <input
              value={form.site_url || ''}
              onChange={e => set('site_url', e.target.value)}
              placeholder="http://185.126.217.99:4466 veya https://anket.kurum.com"
              className={inputCls}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              E-posta, SMS ve WhatsApp bildirimlerindeki tekil anket bağlantıları bu taban URL üzerinden oluşturulur.
            </p>
          </div>
          {/* Canlı Bağlantı Önizlemesi */}
          <div className="bg-indigo-50/70 rounded-xl p-4 border border-indigo-100 text-sm">
            <p className="text-xs font-semibold text-indigo-500 mb-1.5 uppercase tracking-wide">Örnek Anket Linki</p>
            <code className="text-indigo-700 font-mono text-xs break-all">
              {(form.site_url || 'http://localhost:3000').replace(/\/$/, '')}/survey/d1e89b62-6c3e-4b47-b89a-f4c2e6f498c1
            </code>
          </div>
        </Section>

        {/* ── 3. SMTP Sunucu Ayarları ─────────────────────── */}
        <Section icon={<Server size={18} />} title="SMTP E-posta Sunucusu">
          <div>
            <label className={labelCls}>Hazır Sunucu Şablonları</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {PRESET_SERVERS.map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    form.smtp_host === p.host && p.host !== ''
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className={labelCls}>SMTP Host</label>
              <input
                value={form.smtp_host || ''}
                onChange={e => set('smtp_host', e.target.value)}
                placeholder="smtp.gmail.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Port</label>
              <input
                value={form.smtp_port || ''}
                onChange={e => set('smtp_port', e.target.value)}
                placeholder="587"
                type="number"
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-8 pt-1">
            <Toggle
              icon={<Shield size={15} />}
              label="SSL / TLS"
              hint={isSsl ? 'Aktif — port 465' : 'Pasif — STARTTLS (587)'}
              checked={isSsl}
              onChange={v => {
                set('smtp_ssl', v ? 'true' : 'false')
                set('smtp_port', v ? '465' : '587')
              }}
            />
            <Toggle
              icon={<Shield size={15} />}
              label="SMTP Kimlik Doğrulama"
              hint="Kullanıcı adı / şifre ile auth"
              checked={isAuth}
              onChange={v => set('smtp_auth', v ? 'true' : 'false')}
            />
          </div>
        </Section>

        {/* ── 4. SMTP Kimlik Bilgileri ────────────────────── */}
        {isAuth && (
          <Section icon={<AtSign size={18} />} title="SMTP Kimlik ve Güvenlik">
            <div>
              <label className={labelCls}>Kullanıcı Adı / E-posta</label>
              <input
                value={form.smtp_user || ''}
                onChange={e => set('smtp_user', e.target.value)}
                placeholder="user@sirket.com"
                type="email"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Parola / Uygulama Şifresi</label>
              <div className="relative">
                <input
                  value={form.smtp_pass || ''}
                  onChange={e => set('smtp_pass', e.target.value)}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={inputCls + ' pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  aria-label={showPass ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Gmail için: Google Hesabı → Güvenlik → 2 Adımlı Doğrulama → Uygulama Şifreleri kullanınız.
              </p>
            </div>
          </Section>
        )}

        {/* ── 5. E-posta Gönderici Bilgileri ──────────────── */}
        <Section icon={<Mail size={18} />} title="E-posta Gönderici Bilgileri">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Gönderici Adı</label>
              <input
                value={form.smtp_from_name || ''}
                onChange={e => set('smtp_from_name', e.target.value)}
                placeholder="SurveyPro"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Gönderici E-posta (From Email)</label>
              <input
                value={form.smtp_from_email || ''}
                onChange={e => set('smtp_from_email', e.target.value)}
                placeholder="noreply@sirket.com"
                type="email"
                className={inputCls}
              />
              <p className="text-xs text-gray-400 mt-1">Boş bırakılırsa SMTP kullanıcı adı kullanılır.</p>
            </div>
          </div>
        </Section>

        {/* ── 6. SMS API Gateway ─────────────────────────── */}
        <Section icon={<Phone size={18} />} title="SMS Gateway (Nokta Bilişim)">
          <div>
            <label className={labelCls}>SMS API Endpoint URL</label>
            <input
              value={form.sms_api_url || ''}
              onChange={e => set('sms_api_url', e.target.value)}
              placeholder="http://smsportal.noktabilisim.net:3001"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>SMS API Key / Token</label>
            <div className="relative">
              <input
                value={form.sms_api_key || ''}
                onChange={e => set('sms_api_key', e.target.value)}
                type={showSmsKey ? 'text' : 'password'}
                placeholder="••••••••••••••••"
                className={inputCls + ' pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowSmsKey(s => !s)}
                aria-label={showSmsKey ? 'SMS anahtarını gizle' : 'SMS anahtarını göster'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                {showSmsKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className={labelCls}>SMS Başlığı (Alfanumerik Header)</label>
            <input
              value={form.sms_header || ''}
              onChange={e => set('sms_header', e.target.value.toUpperCase())}
              placeholder="NOKTABLSM"
              maxLength={11}
              className={inputCls}
            />
            <p className="text-xs text-gray-400 mt-1">Operatör onaylı SMS başlığınız (Maks. 11 karakter).</p>
          </div>
        </Section>

        {/* ── 7. WhatsApp API Gateway ────────────────────── */}
        <Section icon={<MessageSquare size={18} />} title="WhatsApp API Gateway (Nokta Bilişim)">
          <div>
            <label className={labelCls}>WhatsApp API Endpoint URL</label>
            <input
              value={form.whatsapp_api_url || ''}
              onChange={e => set('whatsapp_api_url', e.target.value)}
              placeholder="http://whatsapp.noktabilisim.net:3000/send-message"
              className={inputCls}
            />
          </div>
        </Section>

        {/* ── Canlı Test Sonucu Bildirimi (AC-10) ─────────── */}
        {testResult && (
          <div
            className={`rounded-xl p-4 text-sm font-medium flex items-center gap-3 transition-all ${
              testResult.ok
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 size={20} className="text-green-600 shrink-0" />
            ) : (
              <XCircle size={20} className="text-red-600 shrink-0" />
            )}
            <div className="flex-1">{testResult.message}</div>
          </div>
        )}

        {/* ── Test Panelleri ─────────────────────────────── */}
        {showTestEmail && (
          <Section icon={<Send size={18} />} title="Test E-postası Gönder">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={testEmailTo}
                onChange={e => setTestEmailTo(e.target.value)}
                type="email"
                placeholder="test@example.com"
                className={inputCls}
              />
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={sendingEmail}
                className="shrink-0 flex items-center justify-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 min-h-[44px]"
              >
                <Send size={14} /> {sendingEmail ? 'Gönderiliyor...' : 'E-posta Gönder'}
              </button>
            </div>
          </Section>
        )}

        {showTestSms && (
          <Section icon={<Phone size={18} />} title="Test SMS Gönder">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={testSmsPhone}
                onChange={e => setTestSmsPhone(e.target.value)}
                type="tel"
                placeholder="0532 123 45 67 veya +905321234567"
                className={inputCls}
              />
              <button
                type="button"
                onClick={handleTestSms}
                disabled={sendingSms}
                className="shrink-0 flex items-center justify-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 min-h-[44px]"
              >
                <Phone size={14} /> {sendingSms ? 'Gönderiliyor...' : 'SMS Gönder'}
              </button>
            </div>
          </Section>
        )}

        {showTestWa && (
          <Section icon={<MessageSquare size={18} />} title="Test WhatsApp Mesajı Gönder">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={testWaPhone}
                onChange={e => setTestWaPhone(e.target.value)}
                type="tel"
                placeholder="0532 123 45 67 veya +905321234567"
                className={inputCls}
              />
              <button
                type="button"
                onClick={handleTestWa}
                disabled={sendingWa}
                className="shrink-0 flex items-center justify-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 min-h-[44px]"
              >
                <MessageSquare size={14} /> {sendingWa ? 'Gönderiliyor...' : 'WhatsApp Gönder'}
              </button>
            </div>
          </Section>
        )}

        {/* ── Alt Aksiyon Butonları ───────────────────────── */}
        <div className="flex flex-wrap gap-3 justify-end pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleTestConn}
            disabled={testing || saving}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            <Wifi size={16} /> {testing ? 'Test ediliyor...' : 'SMTP Test'}
          </button>
          <button
            type="button"
            onClick={() => togglePanel('email')}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
              showTestEmail ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-blue-200 bg-blue-50/60 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <Mail size={16} /> Test E-posta
          </button>
          <button
            type="button"
            onClick={() => togglePanel('sms')}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
              showTestSms ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-blue-200 bg-blue-50/60 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <Phone size={16} /> Test SMS
          </button>
          <button
            type="button"
            onClick={() => togglePanel('wa')}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
              showTestWa ? 'border-green-400 bg-green-50 text-green-700' : 'border-green-200 bg-green-50/60 text-green-700 hover:bg-green-100'
            }`}
          >
            <MessageSquare size={16} /> Test WhatsApp
          </button>
          <button
            type="submit"
            disabled={saving || testing}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors shadow-xs min-h-[44px]"
          >
            <Save size={16} /> {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
          </button>
        </div>
      </form>

      {/* ── Yıkıcı İşlem Onay Modalı (Varsayılana Dönüş Onayı) ── */}
      {showResetModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-100 rounded-full">
                <Trash2 size={24} />
              </div>
              <h3 id="reset-modal-title" className="text-lg font-bold text-gray-900">
                Logoyu Sıfırla
              </h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Yüklenmiş olan kurumsal logo sunucudan tamamen silinecektir. Sistem varsayılan <strong>Truguard</strong> logosuna dönecektir. Bu işlemi onaylıyor musunuz?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px]"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleResetLogo}
                disabled={resettingLogo}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors min-h-[44px]"
              >
                {resettingLogo ? 'Siliniyor...' : 'Evet, Sıfırla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
