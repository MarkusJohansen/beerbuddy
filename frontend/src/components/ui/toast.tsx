import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ToastContext, type ToastApi } from "./use-toast";

/**
 * Transient feedback after an action, replacing Ant Design's `message`.
 *
 * Two live regions rather than one: a success is polite and can wait for a
 * screen reader to finish its sentence, a failure should interrupt. Politeness
 * has to be declared before the content changes, so the regions are static and
 * the messages move between them.
 *
 * shadcn/ui would reach for `sonner` here. A toast library is a queue, a portal
 * and an animation around an `aria-live` region, and the region is the part
 * that does the accessible work.
 */

type Tone = "success" | "error";

interface Toast {
  id: number;
  text: string;
  tone: Tone;
}

/** How long a message stays on screen. */
const DISMISS_AFTER_MS = 4000;

/**
 * Provides the toast API and renders the live regions.
 * @param props.children - The application.
 */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((text: string, tone: Tone) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, text, tone }]);
    setTimeout(
      () => setToasts((current) => current.filter((t) => t.id !== id)),
      DISMISS_AFTER_MS
    );
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (text) => push(text, "success"),
      error: (text) => push(text, "error"),
    }),
    [push]
  );

  const render = (tone: Tone) =>
    toasts
      .filter((toast) => toast.tone === tone)
      .map((toast) => (
        <p
          key={toast.id}
          className="m-0 border border-rule-strong bg-ground px-md py-sm text-base text-ink"
        >
          {toast.text}
        </p>
      ));

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-lg z-50 flex flex-col items-center gap-sm">
        <div role="status" aria-live="polite" className="contents">
          {render("success")}
        </div>
        <div role="alert" aria-live="assertive" className="contents">
          {render("error")}
        </div>
      </div>
    </ToastContext.Provider>
  );
};
