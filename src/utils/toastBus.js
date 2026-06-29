const listeners = new Set();

export function subscribeToast(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function publishToast(toast) {
  listeners.forEach((fn) => fn(toast));
}
