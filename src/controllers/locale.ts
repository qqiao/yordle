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

import { ReduxStateController } from '@qqiao/webapp-scaffold/controllers/redux-state-controller.js';

import { updateLocale } from '../actions/app.js';
import { RootState, store } from '../store.js';

export const update = (locale: string): void => {
  store.dispatch(updateLocale(locale));
};

export class LocaleController extends ReduxStateController(store) {
  locale?: string;

  override stateChanged(state: RootState): void {
    let needsUpdate = false;

    if (state.app?.locale !== this.locale) {
      this.locale = state.app?.locale;
      needsUpdate = true;
    }

    if (needsUpdate) this.host.requestUpdate();
  }
}
