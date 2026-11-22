import { NavLink } from 'react-router-dom'
import { House, Truck, ClipboardList, Settings } from 'lucide-react'
import { useT } from '../i18n.js'

export function TabBar() {
  const t = useT()
  const tabs = [['/', 'home', House], ['/distributors', 'distributors_tab', Truck], ['/orders', 'orders', ClipboardList], ['/settings', 'settings', Settings]]
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-rule" aria-label="Main">
      <ul className="mx-auto max-w-app grid grid-cols-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {tabs.map(([to, key, Icon]) => (
          <li key={to}>
            <NavLink to={to} end={to === '/'}
              className={({ isActive }) => `relative flex flex-col items-center justify-center gap-1 min-h-[64px] px-1 text-sm leading-tight text-center ${isActive ? 'text-ink font-medium' : 'text-muted'}`}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute top-0 inset-x-3 h-[3px] rounded-pill bg-accent" aria-hidden />}
                  <span className={`flex items-center justify-center w-14 h-8 rounded-pill ${isActive ? 'bg-accent-soft text-accent-deep' : ''}`}>
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} aria-hidden />
                  </span>
                  {t(key)}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
