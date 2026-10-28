import { useEffect, useRef, useState } from 'react';
import { uploadImage } from '../api/images.js';
import { TYPES_IMAGE, preparerImage } from '../utils/image.js';

// Zone de dépôt de la photo d'une annonce : glisser-déposer ou choix d'un fichier, aperçu, retrait.
// `value` = URL de la photo (ou null) ; `onChange(url | null)` ; `onBusyChange(true|false)` pendant l'envoi.
export default function PhotoDropzone({ value, onChange, onBusyChange }) {
  const [survol, setSurvol] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const inputRef = useRef(null);
  const onBusyChangeRef = useRef(onBusyChange);

  useEffect(() => {
    onBusyChangeRef.current = onBusyChange;
  });
  useEffect(() => {
    onBusyChangeRef.current?.(envoiEnCours);
  }, [envoiEnCours]);

  async function traiter(fichier) {
    if (!fichier || envoiEnCours) return;
    setErreur('');
    setEnvoiEnCours(true);
    try {
      const envoyee = await uploadImage(await preparerImage(fichier));
      onChange(envoyee.url);
    } catch (error) {
      setErreur(error.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setSurvol(false);
    traiter(event.dataTransfer.files?.[0]);
  }

  function handleChoix(event) {
    traiter(event.target.files?.[0]);
    event.target.value = '';
  }

  return (
    <div className="photo-field">
      <span className="photo-label" id="photo-label">Photo <span className="field-hint">(facultatif)</span></span>
      <div
        className={`dropzone${survol ? ' is-over' : ''}${value ? ' has-photo' : ''}`}
        onDragOver={(event) => { event.preventDefault(); setSurvol(true); }}
        onDragLeave={() => setSurvol(false)}
        onDrop={handleDrop}
        aria-labelledby="photo-label"
      >
        <input ref={inputRef} type="file" accept={TYPES_IMAGE.join(',')} hidden onChange={handleChoix} />

        {value ? (
          <div className="dropzone-preview">
            <img src={value} alt="Aperçu de la photo de l’annonce" />
            <div className="dropzone-actions">
              <button type="button" className="secondary-button" disabled={envoiEnCours} onClick={() => inputRef.current.click()}>Changer</button>
              <button type="button" className="danger-button" disabled={envoiEnCours} onClick={() => { setErreur(''); onChange(null); }}>Retirer</button>
            </div>
          </div>
        ) : (
          <div className="dropzone-empty">
            <span className="dropzone-icon" aria-hidden="true">📷</span>
            <p>{envoiEnCours ? 'Envoi de la photo…' : 'Glisse ta photo ici'}</p>
            <button type="button" className="secondary-button" disabled={envoiEnCours} onClick={() => inputRef.current.click()}>Choisir un fichier</button>
            <span className="field-hint">JPEG, PNG ou WebP</span>
          </div>
        )}

        {envoiEnCours && value && <p className="dropzone-status" role="status">Envoi de la photo…</p>}
      </div>
      {erreur && <p className="form-error" role="alert">{erreur}</p>}
    </div>
  );
}
