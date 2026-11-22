// App state: store, distributors, items, language, theme. Draft log lives in sessionStorage.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from './api.js'
import { LangContext, makeT } from './i18n.js'

const THEME_KEY = 'kq-theme'
const LANG_KEY = 'kq-lang'
const DRAFT_KEY = 'kq-draft'

function readLocal(key, fallback) {
  try { return localStorage.getItem(key) || fallback } catch { return fallback }
}
function writeLocal(key, value) {
  try { localStorage.setItem(key, value) } catch { /* storage blocked */ }
}

export function applyTheme(theme) {
  const root = document.documentElement
  // Light is the default; dark only when the owner picks it.
  if (theme === 'dark') root.dataset.theme = 'dark'
  else delete root.dataset.theme
}

// Loads data with the four states: loading, error, empty, full.
export function useLoad(loader, deps = []) {
  const [state, setState] = useState({ status: 'loading', data: null })
  const run = useCallback(() => {
    setState((s) => ({ status: 'loading', data: s.data }))
    loader()
      .then((data) => setState({ status: 'ok', data }))
      .catch((error) => {
        console.error('load failed', error)
        setState({ status: 'error', data: null, error })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => { run() }, [run])
  return { ...state, reload: run, setData: (data) => setState({ status: 'ok', data }) }
}

const StoreContext = createContext(null)
export const useStore = () => useContext(StoreContext)

export function AppProvider({ children }) {
  const [lang, setLangState] = useState(() => readLocal(LANG_KEY, 'hi'))
  const [theme, setThemeState] = useState(() => (readLocal(THEME_KEY, 'light') === 'dark' ? 'dark' : 'light'))
  const items = useLoad(() => api.items(), [])
  const distributors = useLoad(() => api.distributors(), [])

  useEffect(() => { document.documentElement.lang = lang }, [lang])

  const setLang = useCallback((code) => {
    setLangState(code)
    writeLocal(LANG_KEY, code)
    api.setLanguage(code).catch((e) => console.error('language save failed', e))
  }, [])
  const setTheme = useCallback((value) => {
    setThemeState(value)
    writeLocal(THEME_KEY, value)
    applyTheme(value)
  }, [])

  const langValue = useMemo(() => ({ lang, setLang, t: makeT(lang) }), [lang, setLang])
  const storeValue = { items, distributors, theme, setTheme }
  return (
    <LangContext.Provider value={langValue}>
      <StoreContext.Provider value={storeValue}>{children}</StoreContext.Provider>
    </LangContext.Provider>
  )
}

// Draft log: {photos:[dataUrl], source, counts:[{item_id,count,source,vision_count,vision_confidence}], photo_count}
export function readDraft() {
  try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY)) || null } catch { return null }
}
export function writeDraft(draft) {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)) } catch (e) { console.warn('draft not saved', e) }
}
export function clearDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY) } catch { /* storage blocked */ }
}
