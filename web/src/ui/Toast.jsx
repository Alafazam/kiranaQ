// One toast at a time, with an optional action (undo).
import { createContext, useCallback, useContext, useRef, useState } from 'react'

const TOAST_MS = 4000
const ToastContext = createContext(() => {})
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)
  const show = useCallback((message, action) => {
    clearTimeout(timer.current)
    setToast({ message, action, id: Date.now() })
    timer.current = setTimeout(() => setToast(null), TOAST_MS)
  }, [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="fixed inset-x-0 bottom-36 z-50 flex justify-center px-4 pointer-events-none" aria-live="polite">
        {toast && (
          <div key={toast.id} className="pointer-events-auto max-w-app w-full flex items-center gap-3 rounded-control bg-ink text-paper px-4 py-3 shadow-lift fade-enter">
            <span className="flex-1">{toast.message}</span>
            {toast.action && (
              <button type="button" className="font-medium underline min-h-[44px] px-2" onClick={() => { toast.action.onClick(); setToast(null) }}>
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
