const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const appModule = require('../src/app');

async function createTestServer(t) {
  const storageDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  const server = appModule.createApp({ storageDirectory }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await fs.rm(storageDirectory, { recursive: true, force: true });
  });

  return `http://127.0.0.1:${server.address().port}`;
}

function createUploadForm(content, owner = 'alice', filename = 'report.txt') {
  const form = new FormData();
  form.append('owner', owner);
  form.append('file', new Blob([content]), filename);
  return form;
}

test('o app backend é exportado', () => {
  assert.equal(typeof appModule, 'function');
});

test('faz upload, lista documentos e baixa o arquivo enviado', async (t) => {
  const baseUrl = await createTestServer(t);
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: createUploadForm('conteúdo do documento')
  });

  assert.equal(uploadResponse.status, 201);
  const uploadedDocument = await uploadResponse.json();
  assert.equal(uploadedDocument.originalName, 'report.txt');
  assert.equal(uploadedDocument.size, Buffer.byteLength('conteúdo do documento'));
  assert.equal(uploadedDocument.owner, 'alice');
  assert.ok(uploadedDocument.id);
  assert.ok(uploadedDocument.uploadedAt);
  assert.equal(Object.hasOwn(uploadedDocument, 'storageName'), false);

  const listResponse = await fetch(`${baseUrl}/documents?owner=alice`);
  assert.deepEqual(await listResponse.json(), [uploadedDocument]);

  const downloadResponse = await fetch(
    `${baseUrl}/documents/${uploadedDocument.id}/download`
  );
  assert.equal(downloadResponse.status, 200);
  assert.equal(await downloadResponse.text(), 'conteúdo do documento');
  assert.match(downloadResponse.headers.get('content-disposition'), /report\.txt/);
});

test('filtra documentos pelo dono e usa anonymous quando não informado', async (t) => {
  const baseUrl = await createTestServer(t);
  await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: createUploadForm('documento anônimo', '')
  });
  await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: createUploadForm('documento de bob', 'bob')
  });

  const anonymousResponse = await fetch(`${baseUrl}/documents?owner=anonymous`);
  const anonymousDocuments = await anonymousResponse.json();
  assert.equal(anonymousDocuments.length, 1);
  assert.equal(anonymousDocuments[0].owner, 'anonymous');

  const bobResponse = await fetch(`${baseUrl}/documents?owner=bob`);
  const bobDocuments = await bobResponse.json();
  assert.equal(bobDocuments.length, 1);
  assert.equal(bobDocuments[0].owner, 'bob');
});

test('retorna erro para upload sem arquivo e download inexistente', async (t) => {
  const baseUrl = await createTestServer(t);
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: new FormData()
  });
  assert.equal(uploadResponse.status, 400);

  const downloadResponse = await fetch(`${baseUrl}/documents/missing/download`);
  assert.equal(downloadResponse.status, 404);
});
