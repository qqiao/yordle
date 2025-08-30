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
import { customElement, property, state } from 'lit/decorators';
import { msg } from '@lit/localize';
import { navigate, NavigationController } from '../controllers/navigation.js';
import { localeContext, LocaleProvider } from '../contexts/locale.mjs';
import { installRouter } from 'pwa-helpers/router';

import '@material/mwc-icon';
import '@material/mwc-icon-button';
import '@material/mwc-top-app-bar';
import './yordle-home.js';

@customElement('yordle-app')
export class YordleApp extends LitElement {
  @property()
  appName = 'Yordle';

  #localeProvider = new LocaleProvider(this, {
    context: localeContext,
  });

  #navigationController = new NavigationController(this);

  static override readonly styles = css`
    :host {
      color: #666;
      display: block;
      --mdc-theme-primary: #fff;
      --mdc-theme-on-primary: #666;
    }

    :host mwc-icon-button:not([active]) {
      display: none;
    }

    :host mwc-top-app-bar .title {
      color: #666;
    }

    :host mwc-top-app-bar .top-navigation a {
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
    return html` <mwc-top-app-bar>
        <mwc-icon-button
          ?active="${this.#navigationController.page !== 'home'}"
          icon="arrow_back"
          slot="navigationIcon"
          @click="${() => {
            window.history.go(-1);
          }}"
        ></mwc-icon-button>
        <div slot="title" class="title">${this.appName}</div>
        <div slot="actionItems" class="top-navigation">
          <a href="/#/help">${msg('Help')}</a>
        </div>
      </mwc-top-app-bar>

      <yordle-home
        class="page"
        ?active="${this.#navigationController.page === 'home'}"
      ></yordle-home>
      <yordle-help
        class="page"
        ?active="${this.#navigationController.page === 'help'}"
      ></yordle-help>

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

  protected override firstUpdated(): void {
    installRouter(location => {
      navigate(location.hash);
    });
  }
}
