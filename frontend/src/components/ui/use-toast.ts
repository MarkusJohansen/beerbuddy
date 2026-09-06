import { createContext, useContext } from "react";

/** The two announcers a component can reach for. */
export interface ToastApi {
  /** Announce a completed action. */
  success: (text: string) => void;
  /** Announce a failure. Interrupts the screen reader. */
  error: (text: string) => void;
}

/** Shared so `ToastProvider` can fill it and `useToast` can read it. */
export const ToastContext = createContext<ToastApi | null>(null);

/**
 * The toast API. Must be called inside a {@link ToastProvider}.
 * @returns `success` and `error` announcers.
 */
export const useToast = (): ToastApi => {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside a ToastProvider");
  return api;
};
