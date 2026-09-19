import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import {
  LayoutDashboard, ClipboardList, Users, Activity,
  User, LogOut, PlusCircle, ListChecks, Settings, Sun, Moon,
  Menu, X
} from 'lucide-react'

export default function AppLayout() {
  const { user, logout } = useAuthStore()
  const { theme, toggle } = useThemeStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navItems = [
    { to: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard',       roles: ['admin','creator','evaluator','participant'] },
    { to: '/surveys',         icon: ClipboardList,   label: 'Anketler',         roles: ['admin','creator','evaluator'] },
    { to: '/surveys/create',  icon: PlusCircle,      label: 'Yeni Anket',       roles: ['admin','creator'] },
    { to: '/my-surveys',      icon: ListChecks,      label: 'Anketlerim',       roles: ['participant'] },
    { to: '/users',           icon: Users,           label: 'Kullanıcılar',     roles: ['admin'] },
    { to: '/logs',            icon: Activity,        label: 'Aktivite Logları', roles: ['admin'] },
    { to: '/settings',        icon: Settings,        label: 'Sistem Ayarları',  roles: ['admin'] },
    { to: '/profile',         icon: User,            label: 'Profilim',         roles: ['admin','creator','evaluator','participant'] },
  ].filter(item => item.roles.includes(user?.role))

  return (
    <div className="flex h-screen bg-gray-50 flex-col md:flex-row overflow-hidden">
      {/* ── Mobil Üst Bar ───────────────────────────────────────── */}
      <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Menüyü Kapat' : 'Menüyü Aç'}
            aria-expanded={mobileMenuOpen}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div>
            <h1 className="text-lg font-bold text-indigo-600">SurveyPro</h1>
            <p className="text-[10px] text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Aydınlık moda geç' : 'Karanlık moda geç'}
            title={theme === 'dark' ? 'Aydınlık moda geç' : 'Karanlık moda geç'}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-xs">
            {user?.name?.[0]?.toUpperCase()}
          </div>
        </div>
      </header>

      {/* ── Mobil Menü Çekmecesi & Backdrop ─────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 ease-in-out md:static md:w-64 md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Masaüstü Logo */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-indigo-600">SurveyPro</h1>
            <p className="text-xs text-gray-500 mt-1 capitalize">{user?.role}</p>
          </div>
          {/* Dark mode hızlı toggle */}
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Aydınlık moda geç' : 'Karanlık moda geç'}
            title={theme === 'dark' ? 'Aydınlık moda geç' : 'Karanlık moda geç'}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Ana Menü">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/surveys'}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Oturumu Kapat"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition-colors w-full p-1.5 rounded-lg hover:bg-red-50"
          >
            <LogOut size={16} /> Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  )
}
