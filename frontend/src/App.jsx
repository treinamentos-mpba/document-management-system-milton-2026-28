import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, FileStack, RefreshCw, UserRound } from 'lucide-react';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import { listDocuments } from './services/api.js';
import './App.css';

function DocumentWorkspace({ owner }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    listDocuments(owner, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setDocuments(result);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [owner, revision]);

  return (
    <>
      <UploadComponent owner={owner} onUploaded={() => {
        setNotice('Documento enviado com sucesso.');
        setRevision((value) => value + 1);
      }} />
      {notice && <p className="message message-success" role="status"><CheckCircle2 size={18} aria-hidden="true" />{notice}</p>}
      <section className="documents-section" aria-labelledby="documents-heading">
        <div className="section-heading">
          <div className="heading-with-count"><h2 id="documents-heading">Meus documentos</h2><span className="document-count" aria-label={`${documents.length} documentos`}>{documents.length}</span></div>
          <button className="icon-button" type="button" title="Atualizar documentos" aria-label="Atualizar documentos" disabled={loading} onClick={() => setRevision((value) => value + 1)}>
            <RefreshCw size={18} className={loading ? 'spin' : undefined} aria-hidden="true" />
          </button>
        </div>
        {error && <p className="message message-error" role="alert">{error}</p>}
        <DocumentList documents={documents} owner={owner} loading={loading} failed={Boolean(error)} />
      </section>
    </>
  );
}

export default function App() {
  const [owner, setOwner] = useState('usuario-1');
  const [ownerInput, setOwnerInput] = useState('usuario-1');
  const [ownerError, setOwnerError] = useState('');

  function changeOwner(event) {
    event.preventDefault();
    const value = ownerInput.trim();
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
      setOwnerError('Informe um usuário com letras, números, hífen ou sublinhado.');
      return;
    }
    setOwnerError('');
    setOwnerInput(value);
    setOwner(value);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner"><span className="brand-mark"><FileStack size={23} aria-hidden="true" /></span><span className="brand-name">DMS<span>Document Management System</span></span><span className="environment-label">LOCAL</span></div>
      </header>
      <main className="workspace">
        <div className="page-heading"><div><p className="eyebrow">ARQUIVO DIGITAL</p><h1>Documentos</h1></div><div className="active-user"><UserRound size={16} aria-hidden="true" /><span>{owner}</span></div></div>
        <form className="user-form" onSubmit={changeOwner}>
          <label htmlFor="owner">Usuário</label>
          <div className="user-input-group"><input id="owner" value={ownerInput} maxLength={128} autoComplete="off" spellCheck={false} aria-invalid={Boolean(ownerError)} aria-describedby={ownerError ? 'owner-error' : undefined} onChange={(event) => setOwnerInput(event.target.value)} /><button className="icon-button" type="submit" aria-label="Aplicar usuário" title="Aplicar usuário"><ArrowRight size={19} aria-hidden="true" /></button></div>
          {ownerError && <p id="owner-error" className="message message-error" role="alert">{ownerError}</p>}
        </form>
        <DocumentWorkspace key={owner} owner={owner} />
      </main>
    </div>
  );
}
