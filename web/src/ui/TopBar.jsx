import { ArrowLeft } from 'lucide-react'
import { useT, useLang } from '../i18n.js'
import { IconButton } from './kit.jsx'

export function LangChip() {
  const { lang, setLang } = useLang()
  return (
    <div className="flex rounded-control border border-rule overflow-hidden" role="group" aria-label="Language">
      {[['hi', 'हिं'], ['en', 'EN']].map(([code, label]) => (
        <button key={code} type="button" aria-pressed={lang === code} onClick={() => setLang(code)}
          className={`min-h-[44px] min-w-[48px] px-2 font-medium ${lang === code ? 'bg-accent-soft text-ink' : 'bg-surface text-muted'}`}>
          {label}
        </button>
      ))}
    </div>
  )
}

export function TopBar({ title, onBack, right, children }) {
  const t = useT()
  return (
    <header className="bg-paper">
      <div className="mx-auto max-w-app px-4 min-h-[60px] flex items-center gap-2">
        {onBack && <IconButton icon={ArrowLeft} label={t('back')} onClick={onBack} className="-ml-3" />}
        {title && <h1 className="text-xl flex-1 truncate">{title}</h1>}
        {children}
        {right}
      </div>
    </header>
  )
}

export function Steps({ current }) {
  const t = useT()
  const steps = ['step_photo', 'step_check', 'step_result']
  return (
    <ol className="flex-1 flex items-center gap-1" aria-label="Steps">
      {steps.map((k, i) => (
        <li key={k} aria-current={i === current ? 'step' : undefined}
          className={`flex-1 text-center text-sm py-1 rounded-pill ${i === current ? 'bg-accent-soft text-ink font-medium' : i < current ? 'text-ink-2' : 'text-muted'}`}>
          {t(k)}
        </li>
      ))}
    </ol>
  )
}
