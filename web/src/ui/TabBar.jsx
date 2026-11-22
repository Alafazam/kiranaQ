import { NavLink } from 'react-router-dom'
import { House, ClipboardList, Settings } from 'lucide-react'
import { useT } from '../i18n.js'

export function TabBar() {
  const t = useT()
  const tabs = [['/', 'home', House], ['/orders', 'orders', ClipboardList], ['/settings', 'settings', Settings]]
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-rule" aria-label="Main">
      <ul className="mx-auto max-w-app grid grid-cols-3" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {tabs.map(([to, key, Icon]) => (
          <li key={to}>
            <NavLink to={to} end={to === '/'}
              className={({ isActive }) => `flex flex-col items-center justify-center min-h-[60px] text-sm ${isActive ? 'text-accent font-medium' : 'text-muted'}`}>
              <Icon size={22} strokeWidth={2} aria-hidden />
              {t(key)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
