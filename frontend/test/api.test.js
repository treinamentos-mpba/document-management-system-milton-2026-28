import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listDocuments, uploadDocument, downloadDocument } from '../src/services/api.js';

test('o cliente usa /api, identifica o usuário e envia o arquivo sem Content-Type manual', async (context) => {
  const calls = [];
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify(url.endsWith('/upload') ? { id: 'documento-1' } : []));
  });

  const controller = new AbortController();
  assert.deepEqual(await listDocuments('usuario-1', { signal: controller.signal }), []);
  assert.equal(calls[0].url, '/api/documents');
  assert.deepEqual(calls[0].options.headers, { 'X-User-Id': 'usuario-1' });
  assert.equal(calls[0].options.signal, controller.signal);

  const file = new File(['conteudo'], 'arquivo.txt');
  assert.deepEqual(await uploadDocument(file, 'usuario-1'), { id: 'documento-1' });
  assert.equal(calls[1].url, '/api/upload');
  assert.equal(calls[1].options.method, 'POST');
  assert.equal(calls[1].options.body.get('file').name, 'arquivo.txt');
  assert.equal(calls[1].options.headers['Content-Type'], undefined);
});

test('download entrega Blob, codifica o ID e transmite o usuário', async (context) => {
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/documents/id%2Fteste/download');
    assert.equal(options.headers['X-User-Id'], 'usuario-2');
    return new Response('arquivo binario');
  });
  const blob = await downloadDocument('id/teste', 'usuario-2');
  assert.equal(await blob.text(), 'arquivo binario');
});

test('erros HTTP e de conexão recebem mensagens e cancelamentos são preservados', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify({ error: { message: 'Documento não encontrado.' } }), { status: 404 }));
  await assert.rejects(downloadDocument('ausente', 'usuario-1'), { message: 'Documento não encontrado.' });
  fetchMock.mock.mockImplementation(async () => new Response('erro do proxy', { status: 502 }));
  await assert.rejects(listDocuments('usuario-1'), { message: 'Não foi possível concluir a operação.' });
  fetchMock.mock.mockImplementation(async () => { throw new TypeError('fetch failed'); });
  await assert.rejects(listDocuments('usuario-1'), { message: 'Não foi possível conectar ao servidor.' });
  fetchMock.mock.mockImplementation(async () => { throw new DOMException('Cancelado', 'AbortError'); });
  await assert.rejects(listDocuments('usuario-1'), { name: 'AbortError' });
});