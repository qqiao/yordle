import assert from 'node:assert/strict';
import test from 'node:test';

import { createShortURL } from '../../src/api/short-url.mts';
import { locationOrigin } from '../../src/api/location-origin.mts';

test('locationOrigin preserves a non-default port', () => {
  assert.equal(
    locationOrigin({ origin: 'http://localhost:8080' }),
    'http://localhost:8080',
  );
});

test('createShortURL returns a successful short URL', async () => {
  const fetcher: typeof fetch = async (_input, init) => {
    assert.equal(init?.method, 'POST');
    assert.equal(
      (init?.body as FormData).get('OriginalUrl'),
      'https://example.com/long',
    );
    return new Response(
      JSON.stringify({ status: 'SUCCESS', payload: 'https://sho.rt/a' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const shortURL = await createShortURL('https://example.com/long', fetcher);

  assert.equal(shortURL, 'https://sho.rt/a');
});

test('createShortURL rejects API failures', async () => {
  const fetcher: typeof fetch = async () =>
    new Response(
      JSON.stringify({ status: 'FAILURE', payload: 'Invalid URL' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );

  await assert.rejects(createShortURL('not-a-url', fetcher), /Invalid URL/);
});

test('createShortURL rejects malformed success payloads', async () => {
  const fetcher: typeof fetch = async () =>
    new Response(JSON.stringify({ status: 'SUCCESS' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  await assert.rejects(
    createShortURL('https://example.com', fetcher),
    /invalid response/i,
  );
});
