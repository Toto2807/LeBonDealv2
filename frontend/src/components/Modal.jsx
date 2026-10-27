import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Fenêtre modale accessible : Échap ferme, Tab reste dans la fenêtre, le focus revient à l'élément d'origine.
export default function Modal({ titleId, className, onClose, children }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    const elementPrecedent = document.activeElement;
    const premier = dialog.querySelector('[data-autofocus]') ?? dialog.querySelector(FOCUSABLE);
    (premier ?? dialog).focus();

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = [...dialog.querySelectorAll(FOCUSABLE)];
      if (elements.length === 0) return;
      const debut = elements[0];
      const fin = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === debut) {
        event.preventDefault();
        fin.focus();
      } else if (!event.shiftKey && document.activeElement === fin) {
        event.preventDefault();
        debut.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      elementPrecedent?.focus?.();
    };
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className={className} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
        {children}
      </section>
    </div>
  );
}
