import { NavLink } from 'react-router-dom'
import { House, Truck, ClipboardList, Settings, Mic } from 'lucide-react'
import { useT } from '../i18n.js'
import { useAssistantState } from '../assistant/AssistantProvider.jsx'

const TABS_LEFT = [['/', 'home', House], ['/distributors', 'distributors_tab', Truck]]
const TABS_RIGHT = [['/orders', 'orders', ClipboardList], ['/settings', 'settings', Settings]]

function Tab({ to, label, Icon }) {
  return (
    <li>
      <NavLink to={to} end={to === '/'}
        className={({ isActive }) => `relative flex flex-col items-center justify-center gap-1 min-h-[64px] px-1 text-sm leading-tight text-center ${isActive ? 'text-ink font-medium' : 'text-muted'}`}>
        {({ isActive }) => (
          <>
            {isActive && <span className="absolute top-0 inset-x-3 h-[3px] rounded-pill bg-accent" aria-hidden />}
            <Icon size={24} strokeWidth={2} aria-hidden
              className={isActive ? 'text-accent-deep' : ''}
              fill={isActive ? 'var(--color-accent-soft)' : 'none'} />
            {label}
          </>
        )}
      </NavLink>
    </li>
  )
}

export function TabBar() {
  const t = useT()
  const assistant = useAssistantState()
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-rule" aria-label="Main">
      <ul className="mx-auto max-w-app grid grid-cols-5" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {TABS_LEFT.map(([to, key, Icon]) => <Tab key={to} to={to} label={t(key)} Icon={Icon} />)}
        {/* The mic (Bolo) sits in the middle of the bar: the main way to use the app. */}
        <li className="flex justify-center">
          <button type="button" onClick={assistant.openPanel} aria-label={t('assist_open')}
            className="-mt-5 flex flex-col items-center gap-0.5 text-sm font-medium text-accent-deep">
            <span className="flex items-center justify-center w-14 h-14 rounded-pill bg-surface border-2 border-accent shadow-lift active:bg-paper-2">
              <Mic size={26} strokeWidth={2.25} aria-hidden />
            </span>
            {t('assist_bolo')}
          </button>
        </li>
        {TABS_RIGHT.map(([to, key, Icon]) => <Tab key={to} to={to} label={t(key)} Icon={Icon} />)}
      </ul>
    </nav>
  )
}
