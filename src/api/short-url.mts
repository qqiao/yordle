/**
 * Yordle - A URL shortener for Google App Engine.
 * Copyright (C) 2026 The Yordle Team
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 */

interface CreateShortURLResponse {
  status?: unknown;
  payload?: unknown;
}

export async function createShortURL(
  originalURL: string,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<string> {
  const formData = new FormData();
  formData.append('OriginalUrl', originalURL);

  const response = await fetcher('/v1/api/create', {
    method: 'POST',
    body: formData,
    signal,
  });

  let body: CreateShortURLResponse;
  try {
    body = (await response.json()) as CreateShortURLResponse;
  } catch {
    throw new Error('The server returned an invalid response');
  }

  if (!response.ok) {
    throw new Error(`Unable to shorten URL (${response.status})`);
  }

  if (body.status !== 'SUCCESS') {
    throw new Error(
      typeof body.payload === 'string'
        ? body.payload
        : 'Unable to shorten this URL',
    );
  }

  if (typeof body.payload !== 'string' || body.payload.length === 0) {
    throw new Error('The server returned an invalid response');
  }

  return body.payload;
}
