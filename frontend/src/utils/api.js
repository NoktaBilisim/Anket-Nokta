import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        const res = await axios.post('/api/auth/refresh', { refreshToken })
        const { accessToken } = res.data.data
        localStorage.setItem('accessToken', accessToken)
        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// Auth
export const login = (data) => api.post('/auth/login', data)
export const logout = () => api.post('/auth/logout')
export const getMe = () => api.get('/auth/me')

// Surveys
export const getSurveys = () => api.get('/surveys')
export const getSurvey = (id) => api.get(`/surveys/${id}`)
export const createSurvey = (data) => api.post('/surveys', data)
export const updateSurvey = (id, data) => api.put(`/surveys/${id}`, data)
export const deleteSurvey = (id) => api.delete(`/surveys/${id}`)
export const sendSurvey = (id, data) => api.post(`/surveys/${id}/send`, data)
export const getSurveyReport = (id) => api.get(`/surveys/${id}/report`)
export const exportSurveyExcel = (id) => api.get(`/surveys/${id}/export-excel`, { responseType: 'blob' })
export const changeSurveyStatus = (id, status) => api.patch(`/surveys/${id}/status`, { status })

// Responses (public)
export const getSurveyByToken = (token) => api.get(`/responses/token/${token}`)
export const submitSurvey = (token, data) => api.post(`/responses/token/${token}`, data)

// Users
export const getUsers = () => api.get('/users')
export const createUser = (data) => api.post('/users', data)
export const updateUser = (id, data) => api.put(`/users/${id}`, data)
export const deleteUser = (id) => api.delete(`/users/${id}`)
export const updateProfile = (data) => api.put('/users/me/profile', data)
export const changePassword = (data) => api.put('/users/me/password', data)

// Logs
export const getLogs = (params) => api.get('/logs', { params })
export const getStats = () => api.get('/logs/stats')
export const getMySurveys = () => api.get('/logs/my-surveys')

// Settings & Branding
export const getPublicSettings = () => api.get('/settings/public')
export const getSettings = () => api.get('/settings')
export const saveSettings = (data) => api.put('/settings', data)
export const uploadLogo = (formData) => api.post('/settings/logo', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
export const deleteLogo = () => api.delete('/settings/logo')
export const testSmtp = () => api.post('/settings/test-smtp')
export const sendTestEmail = (data) => api.post('/settings/send-test-email', data)
export const sendTestWhatsApp = (data) => api.post('/settings/send-test-whatsapp', data)
export const sendTestSms = (data) => api.post('/settings/send-test-sms', data)

export default api
