/**
 * Yordle - A URL shortener for Google App Engine.
 * Copyright (C) 2025 The Yordle Team
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

import { createContext, ContextProvider } from '@lit/context';
import { allLocales, sourceLocale, targetLocales } from '../locale-codes.js';
import { configureLocalization } from '@lit/localize';
import { ReactiveControllerHost } from 'lit';

export const localeContext = createContext<string, Symbol>(Symbol('locale'));

const { setLocale } = configureLocalization({
  sourceLocale,
  targetLocales,
  loadLocale: locale => import(`../locales/${locale}.js`),
});

export class LocaleProvider extends ContextProvider<typeof localeContext> {
  constructor(host: ReactiveControllerHost & HTMLElement) {
    super(host, { context: localeContext });
  }

  setValue(value: string) {
    value = this.#sanitizeLocale(value);
    setLocale(value);
    super.setValue(value);
  }

  #sanitizeLocale(locale?: string) {
    let targetLoc = locale;
    // setting non-existent locale would result in system going to default
    // locale;
    if (!targetLoc) {
      targetLoc = sourceLocale;
    } else {
      let bestmatch = '';
      allLocales.forEach(l => {
        if (targetLoc?.startsWith(l) && l.length > bestmatch?.length) {
          bestmatch = l;
        }
      });
      targetLoc = bestmatch ?? sourceLocale;
    }
    return targetLoc;
  }
}
