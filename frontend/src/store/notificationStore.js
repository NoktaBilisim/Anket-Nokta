import { create } from 'zustand'

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  add: (message, type = 'success') => {
    const id = Date.now()
    set(s => ({ notifications: [...s.notifications, { id, message, type }] }))
    setTimeout(() => get().remove(id), 4000)
  },
  remove: (id) => set(s => ({ notifications: s.notifications.filter(n => n.id !== id) }))
}))
