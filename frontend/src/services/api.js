async function request(path, { owner, signal, ...options }) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      signal,
      headers: { 'X-User-Id': owner },
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Não foi possível conectar ao servidor.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message || 'Não foi possível concluir a operação.');
  }
  return response;
}

export async function listDocuments(owner, { signal } = {}) {
  const response = await request('/documents', { owner, signal });
  return response.json();
}

export async function uploadDocument(file, owner, { signal } = {}) {
  const body = new FormData();
  body.append('file', file);
  const response = await request('/upload', { method: 'POST', body, owner, signal });
  return response.json();
}

export async function downloadDocument(id, owner, { signal } = {}) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`, { owner, signal });
  return response.blob();
}