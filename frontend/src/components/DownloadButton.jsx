import { useEffect, useRef, useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import { downloadDocument } from '../services/api.js';

export default function DownloadButton({ document, owner }) {
  const controller = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => controller.current?.abort(), []);

  async function handleDownload() {
    if (controller.current) return;
    const requestController = new AbortController();
    controller.current = requestController;
    setDownloading(true);
    setError('');
    try {
      const blob = await downloadDocument(document.id, owner, { signal: requestController.signal });
      if (requestController.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.originalName;
      window.document.body.append(link);
      try {
        link.click();
      } finally {
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (failure) {
      if (failure.name !== 'AbortError') setError(failure.message);
    } finally {
      controller.current = null;
      if (!requestController.signal.aborted) setDownloading(false);
    }
  }

  return (
    <div className="download-action">
      <button
        className="icon-button"
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        aria-label={`Baixar ${document.originalName}`}
        title={downloading ? 'Baixando…' : `Baixar ${document.originalName}`}
        aria-busy={downloading}
      >
        {downloading ? <LoaderCircle className="spin" size={19} aria-hidden="true" /> : <Download size={19} aria-hidden="true" />}
      </button>
      {error && <p className="download-error" role="alert">{error}</p>}
    </div>
  );
}