import { createContext, useCallback, useContext, useState } from "react";
import { createPortal } from "react-dom";

// Tiny toast system: wrap the app in <ToastProvider>, call const toast = useToast()
// then toast.success("…") / toast.error("…") / toast.info("…").
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

const STYLE = {
  success: "border-sage/30 bg-sage/10",
  error: "border-red-500/30 bg-red-500/10",
  info: "border-ink/15 bg-paper",
};
const ICON_COLOR = { success: "text-sage", error: "text-red-500", info: "text-muted" };
const ICON_PATH = {
  success: "M20 6 9 17l-5-5",
  error: "M18 6 6 18M6 6l12 12",
  info: "M12 8v4m0 4h.01",
};

let seq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = "success", ttl = 3500) => {
    const id = ++seq;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  }, []);

  // Stable callable: toast(msg) and toast.success/error/info(msg).
  const toast = useCallback((message, type = "success") => push(message, type), [push]);
  toast.success = (m) => push(m, "success");
  toast.error = (m) => push(m, "error", 5000);
  toast.info = (m) => push(m, "info");

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-xs flex-col gap-2 print:hidden">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              className={`animate-toast-in pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm text-ink shadow-card-hover ${STYLE[t.type]}`}
            >
              <svg viewBox="0 0 24 24" className={`mt-0.5 h-4 w-4 shrink-0 ${ICON_COLOR[t.type]}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={ICON_PATH[t.type]} />
              </svg>
              <span className="flex-1">{t.message}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastCtx.Provider>
  );
}
