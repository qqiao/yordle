/* eslint-disable import/no-duplicates */
/**
 * Yordle - A URL shortener for Google App Engine.
 * Copyright (C) 2017 The Yordle Team
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

import { LitElement, css, html, TemplateResult, PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators';

import { localized, msg } from '@lit/localize';

import '@material/mwc-button';
// eslint-disable-next-line import/no-duplicates
import '@material/mwc-dialog';
import '@material/mwc-icon';
// eslint-disable-next-line import/no-duplicates
import '@material/mwc-snackbar';

// eslint-disable-next-line import/no-duplicates
import { Dialog } from '@material/mwc-dialog';
import { Snackbar } from '@material/mwc-snackbar';

// eslint-disable-next-line import/no-duplicates
import '@material/mwc-textfield';
// eslint-disable-next-line import/no-duplicates
import { TextField } from '@material/mwc-textfield';

import { createShortUrl, Status } from '../actions/shortUrl';
import shortUrl, { State } from '../reducers/shortUrl';
import { store } from '../store';

store.addReducers({ shortUrl });

@localized()
@customElement('yordle-home')
export class YordleHome extends LitElement {
  @query('#dialog')
  private dialog?: Dialog;

  @query('#input')
  private input?: TextField;

  @query('#result')
  private result?: TextField;

  @query('#snackbar')
  private snackbar?: Snackbar;

  @property()
  public response?: State;

  static styles = css`
    :host {
      display: block;
      --mdc-theme-primary: #000;
    }

    :host > div {
      display: flex;
      flex-direction: row;
      justify-content: center;
    }

    :host .inputs-container {
      background-color: #59f;
      color: #fff;
    }

    :host .inputs,
    :host .points {
      flex: 1;
      max-width: 900px;
      padding: 30px;
    }

    :host .inputs h1 {
      font-weight: normal;
      margin: 0;
    }

    :host .inputs mwc-textfield {
      margin-top: 10px;
      width: 100%;
      --mdc-theme-primary: #fff;
      --mdc-text-field-ink-color: #fff;
      --mdc-text-field-label-ink-color: #fff;
      --mdc-text-field-outlined-hover-border-color: #fff;
      --mdc-text-field-outlined-idle-border-color: #eee;
    }

    :host .inputs mwc-button {
      background: #fff;
      margin: 20px 0;
      --mdc-theme-primary: #59f;
    }

    :host .points {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: space-between;
    }

    @media (max-width: 600px) {
      :host .points {
        flex-direction: column;
        justify-content: space-between;
      }
    }

    :host .points .point {
      flex: 1;
      padding: 20px 50px 20px 0;
    }

    :host .points .point h2 {
      align-items: center;
      display: flex;
      flex-direction: row;
      font-weight: normal;
      margin: 0;
    }

    :host .points .point h2 mwc-icon {
      background: #eee;
      border-radius: 50%;
      margin-right: 5px;
      padding: 10px;
      --mdc-icon-size: 32px;
    }

    :host mwc-dialog .dialog-content {
      align-items: center;
      display: flex;
      flex-direction: row;
    }

    :host mwc-dialog mwc-button {
      --mdc-theme-primary: #666;
    }

    :host mwc-dialog .dialog-content #result {
      flex: 1;
      --mdc-theme-primary: #666;
      --mdc-text-field-fill-color: transparent;
    }
  `;

  protected updated(changed: PropertyValues): void {
    if (changed.has('response')) {
      if (Status.SUCCESS === this.response?.status) {
        if (this.result) this.result.value = this.response.shortUrl ?? '';
        if (this.dialog) this.dialog.open = true;
      }
    }
  }

  protected render(): TemplateResult {
    return html` <div class="inputs-container">
        <div class="inputs">
          <h1>${msg('Shorten your links')}</h1>
          <div>
            <mwc-textfield
              outlined
              id="input"
              label="${msg('Your original URL here')}"
              type="url"
              error-message="${msg('URL invalid')}"
            ></mwc-textfield>
          </div>
          <div>
            <mwc-button @click="${this._onShortenTap}">
              ${msg('Shorten URL')}
            </mwc-button>
          </div>
        </div>
      </div>
      <div>
        <div class="points">
          <div class="point">
            <h2>
              <mwc-icon>link</mwc-icon>
              ${msg('Shorten')}
            </h2>
            ${msg('Shorten your URL so its ready to be shared everywhere')}
          </div>
          <div class="point">
            <h2>
              <mwc-icon>trending_up</mwc-icon>
              ${msg('Track')}
            </h2>
            ${msg('Analytics help you know where your clicks are coming from')}
          </div>
          <div class="point">
            <h2>
              <mwc-icon>people</mwc-icon>
              ${msg('Learn')}
            </h2>
            ${msg('Understand and visualize your audience')}
          </div>
        </div>
      </div>
      <mwc-dialog id="dialog" scrimClickAction="">
        <div class="dialog-content">
          <mwc-textfield id="result" type="text"> </mwc-textfield>
          <mwc-button dense icon="file_copy" @click="${this._onCopyTap}">
            ${msg('Copy')}
          </mwc-button>
        </div>
        <mwc-button dense slot="primaryAction" dialogAction="ok">
          ${msg('Done')}
        </mwc-button>
      </mwc-dialog>
      <mwc-snackbar
        id="snackbar"
        leading
        closeOnEscape
        timeoutMs="5000"
        labelText="${msg('Short URL copied to clipboard')}"
      ></mwc-snackbar>`;
  }

  private _onCopyTap = (): void => {
    if (!this.dialog || !this.result) return;
    this.result.select();
    document.execCommand('copy');
    this.dialog.open = false;

    if (!this.snackbar) return;
    this.snackbar.open = true;
  };

  private _onShortenTap = (): void => {
    if (!this.input) return;
    const originalUrl = this.input.value;
    if (originalUrl?.length) {
      store.dispatch(createShortUrl(originalUrl));
    }
  };
}
