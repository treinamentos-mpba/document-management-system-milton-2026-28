const { test } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { mkdtemp, readdir, rm, unlink } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { once } = require('node:events');

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('as rotas de documentos respeitam os contratos e o armazenamento local', async (context) => {
  const storageDirectory = await mkdtemp(path.join(tmpdir(), 'dms-api-'));
  const server = app.createApp({ storageDirectory, maxFileSize: 16 }).listen(0, '127.0.0.1');
  context.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(storageDirectory, { recursive: true, force: true });
  });
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  function request(route, { owner = 'usuario-1', ...options } = {}) {
    return fetch(`${baseUrl}${route}`, {
      ...options,
      headers: { ...(owner === null ? {} : { 'X-User-Id': owner }), ...options.headers },
    });
  }

  function upload(content, { field = 'file', extra = false, ...options } = {}) {
    const body = new FormData();
    if (content !== null) body.append(field, new Blob([content]), 'relatorio.txt');
    if (extra) body.append('file', new Blob(['extra']), 'outro.txt');
    return request('/upload', { ...options, method: 'POST', body });
  }

  await context.test('saúde preservada e usuário obrigatório antes da gravação', async () => {
    const health = await request('/health', { owner: null });
    assert.strictEqual(health.status, 200);
    assert.deepStrictEqual(await health.json(), { status: 'ok' });
    for (const owner of [null, 'invalido!']) {
      const response = await upload('conteudo', { owner });
      assert.strictEqual(response.status, 400);
      assert.strictEqual((await response.json()).error.code, 'INVALID_USER');
    }
    assert.deepStrictEqual(await readdir(storageDirectory), []);
    assert.deepStrictEqual(await (await request('/documents')).json(), []);
  });

  let document;
  await context.test('upload no limite, metadados públicos e download binário', async () => {
    const response = await upload('1234567890123456');
    assert.strictEqual(response.status, 201);
    document = await response.json();
    assert.deepStrictEqual(Object.keys(document).sort(), ['id', 'originalName', 'owner', 'size', 'uploadedAt']);
    assert.strictEqual(document.size, 16);
    assert.strictEqual(document.owner, 'usuario-1');
    assert.match(document.id, /^[0-9a-f-]{36}$/);
    const download = await request(`/documents/${document.id}/download`);
    assert.strictEqual(download.status, 200);
    assert.strictEqual(download.headers.get('content-type'), 'application/octet-stream');
    assert.strictEqual(download.headers.get('x-content-type-options'), 'nosniff');
    assert.match(download.headers.get('content-disposition'), /attachment;.*relatorio\.txt/);
    assert.strictEqual(await download.text(), '1234567890123456');
  });

  await context.test('rejeições não deixam arquivos ou metadados', async () => {
    const scenarios = [
      ['12345678901234567', {}, 413, 'FILE_TOO_LARGE'],
      ['x'.repeat(32), {}, 413, 'FILE_TOO_LARGE'],
      ['', {}, 400, 'EMPTY_FILE'],
      [null, {}, 400, 'FILE_REQUIRED'],
      ['arquivo', { field: 'outro' }, 400, 'UNEXPECTED_FILE'],
      ['arquivo', { extra: true }, 400, 'UNEXPECTED_FILE'],
    ];
    for (const [content, options, status, code] of scenarios) {
      const response = await upload(content, options);
      assert.strictEqual(response.status, status, code);
      assert.strictEqual((await response.json()).error.code, code);
      assert.deepStrictEqual(await readdir(storageDirectory), [document.id]);
    }
    const unsupported = await request('/upload', { method: 'POST' });
    assert.strictEqual(unsupported.status, 415);
    const malformed = await request('/upload', {
      method: 'POST', headers: { 'Content-Type': 'multipart/form-data' }, body: 'invalid',
    });
    assert.strictEqual(malformed.status, 400);
    assert.strictEqual((await malformed.json()).error.code, 'INVALID_MULTIPART');
    assert.deepStrictEqual(await (await request('/documents')).json(), [document]);
  });

  await context.test('nomes repetidos não colidem e documentos são filtrados pelo dono', async () => {
    const second = await (await upload('outro', { owner: 'usuario-2' })).json();
    assert.notStrictEqual(second.id, document.id);
    assert.strictEqual(second.originalName, document.originalName);
    assert.deepStrictEqual(await (await request('/documents')).json(), [document]);
    assert.deepStrictEqual(await (await request('/documents', { owner: 'usuario-2' })).json(), [second]);
    const forbidden = await request(`/documents/${document.id}/download`, { owner: 'usuario-2' });
    assert.strictEqual(forbidden.status, 404);
    assert.strictEqual((await forbidden.json()).error.code, 'DOCUMENT_NOT_FOUND');
    const invalid = await request('/documents/invalido/download');
    assert.strictEqual(invalid.status, 400);
    await unlink(path.join(storageDirectory, document.id));
    const missing = await request(`/documents/${document.id}/download`);
    assert.strictEqual(missing.status, 404);
    assert.strictEqual((await missing.json()).error.code, 'DOCUMENT_NOT_FOUND');
    assert.deepStrictEqual(await (await request('/documents')).json(), [document]);
  });
});
