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

import { ContextProvider, createContext } from '@lit/context';
import { ReactiveControllerHost } from 'lit';
import { installRouter } from 'pwa-helpers';

export const navigationContext = createContext<string, Symbol>(
  Symbol('navigation'),
);

export class NavigationProvider extends ContextProvider<
  typeof navigationContext
> {
  constructor(host: ReactiveControllerHost & HTMLElement) {
    super(host, { context: navigationContext });
    installRouter(location => {
      this.setValue(location.hash);
    });
  }

  setValue(path?: string) {
    let page = path || '';
    page = page === '' ? 'home' : page.slice(2);
    if (this.value === page) {
      return;
    }

    switch (page) {
      case 'help': {
        import('../components/yordle-help.js');
        break;
      }
      default:
        break;
    }

    super.setValue(page);
  }
}
