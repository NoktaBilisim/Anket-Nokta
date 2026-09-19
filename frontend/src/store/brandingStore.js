import { create } from 'zustand'
import { getPublicSettings } from '../utils/api'

export const useBrandingStore = create((set, get) => ({
  appLogo: null,             // Özel logo URL'si veya null (null ise fallback Truguard)
  appTitle: 'SurveyPro',     // Kurumsal sistem başlığı
  siteUrl: '',               // Site taban URL'si
  loading: false,
  error: null,
  cacheKey: Date.now(),      // Önbellek kırma (cache busting) anahtarı

  // Uygulama açılışında /api/settings/public ucundan bilgileri çeker (< 100ms)
  fetchBranding: async () => {
    set({ loading: true, error: null })
    try {
      const res = await getPublicSettings()
      const data = res.data?.data || {}
      set({
        appLogo: data.app_logo || null,
        appTitle: data.app_title || 'SurveyPro',
        siteUrl: data.site_url || '',
        loading: false,
        cacheKey: Date.now(),
      })
      // Tarayıcı sekme başlığını güncelle
      if (data.app_title) {
        document.title = data.app_title
      }
    } catch (err) {
      // Hata durumunda varsayılan değerler korunur, kullanıcı akışı kesilmez
      set({ loading: false, error: err.message || 'Marka ayarları yüklenemedi' })
    }
  },

  // Logo veya başlık güncellendiğinde state'i anında günceller
  setBranding: ({ app_logo, app_title, site_url }) => {
    set((state) => {
      const updatedLogo = app_logo !== undefined ? app_logo : state.appLogo
      const updatedTitle = app_title !== undefined ? app_title : state.appTitle
      const updatedSiteUrl = site_url !== undefined ? site_url : state.siteUrl
      if (updatedTitle) {
        document.title = updatedTitle
      }
      return {
        appLogo: updatedLogo,
        appTitle: updatedTitle,
        siteUrl: updatedSiteUrl,
        cacheKey: Date.now(),
      }
    })
  },

  // Özel logoyu sıfırlar (Varsayılan Truguard logoya dönüş)
  resetLogo: () => {
    set({ appLogo: null, cacheKey: Date.now() })
  }
}))
