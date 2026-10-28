import { useEffect, useId, useRef, useState } from 'react';
import { FilePlus2, LoaderCircle, Upload } from 'lucide-react';
import { uploadDocument } from '../services/api.js';

export default function UploadComponent({ owner, onUploaded }) {
  const inputId = useId();
  const controller = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => controller.current?.abort(), []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || controller.current) return;
    if (file.size === 0) {
      setError('O arquivo não pode estar vazio.');
      return;
    }

    const form = event.currentTarget;
    const requestController = new AbortController();
    controller.current = requestController;
    setUploading(true);
    setError('');
    try {
      await uploadDocument(file, owner, { signal: requestController.signal });
      if (requestController.signal.aborted) return;
      form.reset();
      setFile(null);
      onUploaded();
    } catch (failure) {
      if (failure.name !== 'AbortError') setError(failure.message);
    } finally {
      controller.current = null;
      if (!requestController.signal.aborted) setUploading(false);
    }
  }

  return (
    <section className="upload-section" aria-labelledby={`${inputId}-heading`}>
      <h2 id={`${inputId}-heading`}>Novo documento</h2>
      <form className="upload-form" onSubmit={handleSubmit} aria-busy={uploading}>
        <div className="file-picker">
          <input
            id={inputId}
            className="file-input"
            type="file"
            disabled={uploading}
            aria-describedby={error ? `${inputId}-error` : undefined}
            onChange={(event) => {
              setFile(event.target.files[0] || null);
              setError('');
            }}
          />
          <label className={`button button-secondary ${uploading ? 'is-disabled' : ''}`} htmlFor={inputId}>
            <FilePlus2 size={18} aria-hidden="true" /> Selecionar arquivo
          </label>
          <span className="file-name" title={file?.name}>{file?.name || 'Nenhum arquivo selecionado'}</span>
        </div>
        <button className="button button-primary" type="submit" disabled={!file || uploading}>
          {uploading ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Upload size={18} aria-hidden="true" />}
          {uploading ? 'Enviando…' : 'Enviar documento'}
        </button>
      </form>
      {error && <p className="message message-error" id={`${inputId}-error`} role="alert">{error}</p>}
    </section>
  );
}