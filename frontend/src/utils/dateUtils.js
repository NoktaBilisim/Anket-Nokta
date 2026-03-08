/**
 * Sequelize underscored:true ile çalışırken API bazen createdAt (camelCase),
 * bazen created_at (snake_case) döndürebilir. Her iki formatı da kabul eder.
 *
 * Kullanım:
 *   import { fDate, fDateTime, fTime, fSmart } from '../utils/dateUtils'
 *   fDate(survey.createdAt)        → "12.03.2025"
 *   fDateTime(log.createdAt)       → "12.03.2025 14:32"
 *   fTime(log.createdAt)           → "14:32"
 *   fSmart(survey.createdAt)       → "3 saat önce" veya "12.03.2025"
 */

// Hem snake_case hem camelCase key'i dene, geçerli bir Date döndür
export function parseDate(value) {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

const TR = 'tr-TR'

/** "12.03.2025" */
export function fDate(value) {
  const d = parseDate(value)
  if (!d) return '—'
  return d.toLocaleDateString(TR)
}

/** "12.03.2025 14:32" */
export function fDateTime(value) {
  const d = parseDate(value)
  if (!d) return '—'
  return d.toLocaleString(TR, { dateStyle: 'short', timeStyle: 'short' })
}

/** "14:32" */
export function fTime(value) {
  const d = parseDate(value)
  if (!d) return '—'
  return d.toLocaleTimeString(TR, { hour: '2-digit', minute: '2-digit' })
}

/** Bugün/dün → göreceli, daha eskisi → tarih */
export function fSmart(value) {
  const d = parseDate(value)
  if (!d) return '—'
  const now  = new Date()
  const diff = (now - d) / 1000  // saniye

  if (diff < 60)              return 'Az önce'
  if (diff < 3600)            return `${Math.floor(diff / 60)} dk önce`
  if (diff < 86400)           return `${Math.floor(diff / 3600)} saat önce`
  if (diff < 86400 * 2)       return 'Dün'
  return fDate(value)
}

/** Bir objedeki createdAt / created_at farkını normalize et */
export function normDate(obj, key = 'createdAt') {
  return obj?.[key] ?? obj?.[key.replace(/([A-Z])/g, '_$1').toLowerCase()]
}
