import { File, Files, LoaderCircle } from 'lucide-react';
import DownloadButton from './DownloadButton.jsx';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const sizeFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${sizeFormatter.format(bytes / 1024)} KB`;
  return `${sizeFormatter.format(bytes / 1024 ** 2)} MB`;
}

export default function DocumentList({ documents, owner, loading, failed }) {
  if (loading && documents.length === 0) {
    return <div className="list-state" role="status"><LoaderCircle className="spin" size={28} aria-hidden="true" /><p>Carregando documentos…</p></div>;
  }
  if (documents.length === 0) {
    return (
      <div className="list-state">
        <Files size={36} strokeWidth={1.4} aria-hidden="true" />
        <p>{failed ? 'Lista indisponível' : 'Nenhum documento'}</p>
      </div>
    );
  }

  return (
    <div className="table-scroll" aria-busy={loading}>
      <table className="document-table">
        <caption className="visually-hidden">Documentos de {owner}</caption>
        <thead>
          <tr><th scope="col">Nome</th><th scope="col">Tamanho</th><th scope="col">Enviado em</th><th scope="col"><span className="visually-hidden">Download</span></th></tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id}>
              <td><div className="document-name"><span className="document-icon"><File size={20} aria-hidden="true" /></span><span>{document.originalName}</span></div></td>
              <td className="metadata">{formatSize(document.size)}</td>
              <td className="metadata"><time dateTime={document.uploadedAt}>{dateFormatter.format(new Date(document.uploadedAt))}</time></td>
              <td><DownloadButton document={document} owner={owner} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}