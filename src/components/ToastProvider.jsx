import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { subscribeToast } from '../utils/toastBus';

const ToastContext = createContext(() => {});

const STYLES = {
  error:   'bg-red-600',
  success: 'bg-green-600',
  info:    'bg-gray-800',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const showToast = useCallback((message, type = 'error') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => subscribeToast((toast) => showToast(toast.message, toast.type)), [showToast]);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="fixed top-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:left-auto z-50 space-y-2 sm:max-w-xs">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg shadow-lg px-4 py-3 text-sm text-white ${STYLES[t.type] ?? STYLES.error}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
