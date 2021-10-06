/**
 * Yordle - A URL shortener for Google App Engine.
 * Copyright (C) 2021 The Yordle Team
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

import { ReduxStateController } from '@qqiao/webapp-scaffold/controllers/redux-state-controller';

import { createShortUrl, Status } from '../actions/shortUrl';
import shortUrl from '../reducers/shortUrl';
import { RootState, store } from '../store';

store.addReducers({ shortUrl });

export class ShortURLController extends ReduxStateController(store) {
  shortURL?: string;

  status?: Status;

  override stateChanged(state: RootState) {
    let needsUpdate = false;

    if (this.status !== state.shortUrl?.status) {
      this.status = state.shortUrl?.status;
      needsUpdate = true;
    }

    if (this.shortURL !== state.shortUrl?.shortUrl) {
      this.shortURL = state.shortUrl?.shortUrl;
      needsUpdate = true;
    }

    if (needsUpdate) this.host.requestUpdate();
  }

  create(originalURL: string): void {
    this.shortURL = undefined;
    this.status = undefined;
    store.dispatch(createShortUrl(originalURL));
  }
}

export { Status };
