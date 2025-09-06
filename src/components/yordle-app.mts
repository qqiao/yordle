/**
 * Yordle - A URL shortener for Google App Engine.
 * Copyright (C) 2018 The Yordle Team
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

import { css, html, LitElement, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { configureLocalization, msg } from '@lit/localize';
import { navigationContext } from '../contexts/navigation.mjs';
import { provide } from '@lit/context';
import { installRouter } from 'pwa-helpers/router.js';
import { allLocales, sourceLocale, targetLocales } from '../locale-codes.js';
import { localeContext } from '../contexts/locale.mjs';

import '@material/web/iconbutton/icon-button.js';
import '@material/web/icon/icon.js';

import './yordle-home.mjs';

const { setLocale } = configureLocalization({
  sourceLocale,
  targetLocales,
  loadLocale: locale => import(`../locales/${locale}.js`),
});

@customElement('yordle-app')
export class YordleApp extends LitElement {
  @property()
  appName = 'Yordle';

  @provide({ context: localeContext })
  @state()
  locale?: string;

  @provide({ context: navigationContext })
  @state()
  page?: string;

  constructor() {
    super();
    installRouter(location => {
      let page = location.hash || '';
      page = page === '' ? 'home' : page.slice(2);
      if (this.page === page) {
        return;
      }
      switch (page) {
        case 'help': {
          import('./yordle-help.mjs');
          break;
        }
        default:
          break;
      }
      this.page = page;
      this.requestUpdate();
    });

    let targetLoc = navigator.language;
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
    setLocale(targetLoc);
    this.locale = targetLoc;
  }

  static override readonly styles = css`
    :host {
      color: #666;
      display: block;
      --mdc-theme-primary: #fff;
      --mdc-theme-on-primary: #666;
    }

    :host header {
      align-items: center;
      display: flex;
      justify-content: space-between;
      height: 64px;
      padding: 0 16px;
    }

    :host md-icon-button:not([active]) {
      display: none;
    }

    :host #title {
      color: #666;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    :host #title-text {
      font-size: 20px;
    }

    :host #top-navigation a {
      color: #333;
      margin-left: 20px;
      text-decoration: none;
    }

    :host .page {
      display: none;
      margin: 0 auto;
    }

    :host .page[active] {
      display: block;
    }

    :host footer {
      margin: auto;
      color: #666;
      font-size: 13px;
      padding: 20px;
      text-align: center;
    }

    :host footer a {
      color: #666;
      text-decoration: none;
    }

    :host footer a:hover {
      text-decoration: underline;
    }
  `;

  protected override render(): TemplateResult {
    return html` <!-- <mwc-top-app-bar>

        <div slot="title" class="title">${this.appName}</div>
        <div slot="actionItems" class="top-navigation">

        </div>
      </mwc-top-app-bar> -->
      <header>
        <div id="title">
          <md-icon-button
            ?active="${this.page !== 'home'}"
            @click="${() => {
              window.history.go(-1);
            }}"
          >
            <md-icon>arrow_back</md-icon>
          </md-icon-button>
          <div id="title-text">${this.appName || 'Yordle'}</div>
        </div>
        <div id="top-navigation"><a href="/#/help">${msg('Help')}</a></div>
      </header>

      <main>
        <yordle-home
          class="page"
          ?active="${this.page === 'home'}"
        ></yordle-home>
        <yordle-help
          class="page"
          ?active="${this.page === 'help'}"
        ></yordle-help>
      </main>

      <footer>
        ${msg(
          html`Powered by
            <a
              href="https://github.com/qqiao/yordle"
              target="_blank"
              rel="noreferrer"
              >Yordle</a
            >`,
        )}
      </footer>`;
  }
}
