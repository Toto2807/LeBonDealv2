import { useEffect } from 'react';

// Message de confirmation ou d'erreur annoncé aux lecteurs d'écran, qui disparaît seul.
export default function Notice({ notice, onDismiss }) {
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [notice, onDismiss]);

  if (!notice) return null;
  return (
    <div className="notice-region">
      <p className={`notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.text}</p>
    </div>
  );
}

