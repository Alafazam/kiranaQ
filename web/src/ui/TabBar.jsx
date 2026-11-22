import { NavLink } from 'react-router-dom'
import { House, Truck, ClipboardList, Settings } from 'lucide-react'
import { useT } from '../i18n.js'

export function TabBar() {
  const t = useT()
  const tabs = [['/', 'home', House], ['/distributors', 'distributor_visits', Truck], ['/orders', 'orders', ClipboardList], ['/settings', 'settings', Settings]]
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-rule" aria-label="Main">
      <ul className="mx-auto max-w-app grid grid-cols-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {tabs.map(([to, key, Icon]) => (
          <li key={to}>
            <NavLink to={to} end={to === '/'}
              className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 min-h-[60px] px-1 text-sm leading-tight text-center ${isActive ? 'text-accent font-medium' : 'text-muted'}`}>
              <Icon size={22} strokeWidth={2} aria-hidden />
              {t(key)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
