import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "cn";

/**
 * A modal dialog, on top of the native `<dialog>` element.
 *
 * This is the component shadcn/ui would install `@radix-ui/react-dialog` for.
 * The platform already supplies the hard parts — the focus trap, the inert
 * background, Escape-to-close and a stylable `::backdrop` — so the dependency
 * would buy styling hooks this design does not want anyway.
 *
 * Escape is the one sharp edge: the application binds Escape globally to return
 * focus to the skip link, and a dialog closing must not also do that. The
 * keydown handler below stops Escape at the dialog.
 */
interface DialogProps {
  /** Whether the dialog is open. Driven by the parent. */
  open: boolean;
  /** Called when the dialog closes itself — Escape, backdrop, or the close button. */
  onClose: () => void;
  /** Accessible name for the dialog. */
  label: string;
  children: ReactNode;
}

/**
 * A modal dialog rendered through the native `<dialog>` element.
 * @param props - See {@link DialogProps}.
 */
const Dialog = ({ open, onClose, label, children }: DialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onKeyDown={(event) => {
        // Let the dialog handle Escape, but do not let it reach the window
        // listener that returns focus to the skip link.
        if (event.key === "Escape") event.stopPropagation();
      }}
      onClick={(event) => {
        // The backdrop is part of the dialog's own box, so a click landing on
        // the element itself rather than its contents is a backdrop click.
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "relative m-auto max-h-[85vh] w-full max-w-[42rem] overflow-y-auto rounded-none",
        "border border-rule-strong bg-ground p-lg text-ink",
        "backdrop:bg-ink/40"
      )}
    >
      {open && (
        <>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-md right-md cursor-pointer border-0 bg-transparent p-0 text-ink-mute transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <X aria-hidden className="size-md" />
          </button>
          {children}
        </>
      )}
    </dialog>
  );
};

export default Dialog;
