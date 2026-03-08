import { useNotificationStore } from '../../store/notificationStore'
import { CheckCircle, XCircle, X } from 'lucide-react'

export default function Notifications() {
  const { notifications, remove } = useNotificationStore()
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map(n => (
        <div key={n.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm max-w-sm ${n.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {n.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          <span className="flex-1">{n.message}</span>
          <button onClick={() => remove(n.id)}><X size={14} /></button>
        </div>
      ))}
    </div>
  )
}
