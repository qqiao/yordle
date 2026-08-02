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

import { css, html, LitElement, TemplateResult } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import '@material/web/icon/icon.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/text-button.js';
import '@material/web/dialog/dialog.js';
import '@material/web/progress/circular-progress.js';
import '@material/web/textfield/outlined-text-field.js';
import { Task, TaskStatus } from '@lit/task';
import type { MdDialog } from '@material/web/dialog/dialog.js';
import type { MdOutlinedTextField } from '@material/web/textfield/outlined-text-field.js';
import { createShortURL } from '../api/short-url.mjs';

@customElement('yordle-home')
@localized()
export class YordleHome extends LitElement {
  @query('#input')
  private input?: MdOutlinedTextField;

  @query('#result')
  private result?: MdOutlinedTextField;

  @query('#result-dialog')
  private resultDialog?: MdDialog;

  @state()
  private copyStatus = '';

  static override readonly styles = css`
    :host {
      display: block;
    }

    :host > div {
      display: flex;
      flex-direction: row;
      justify-content: center;
    }

    :host #inputs-container {
      background-color: #59f;
      color: #fff;
    }

    :host #inputs-container md-outlined-text-field {
      --md-outlined-field-content-color: #fff;
      --md-outlined-field-focus-content-color: #fff;
      --md-outlined-field-hover-content-color: #fff;
      --md-outlined-field-hover-label-text-color: #fff;

      --md-outlined-text-field-hover-outline-color: #fff;
      --md-outlined-text-field-hover-text-color: #fff;
      --md-outlined-field-label-text-color: #fff;
      --md-outlined-text-field-input-text-color: #fff;
      --md-outlined-text-field-input-text-placeholder-color: #fff;
    }

    :host #inputs-container md-filled-button {
      --md-sys-color-on-primary: #59f;
    }

    :host #inputs,
    :host #points {
      flex: 1;
      max-width: 900px;
      padding: 30px;
    }

    :host #task-status {
      min-height: 24px;
    }

    :host #task-status p {
      margin: 0;
    }

    :host #task-status .error {
      color: #fff;
      font-weight: 500;
    }

    :host #result {
      width: min(520px, 80vw);
    }

    :host #copy-status {
      min-height: 24px;
      margin-top: 8px;
    }

    :host #inputs {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    :host #inputs md-outlined-text-field {
      width: 100%;
    }

    :host #points {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: space-between;
    }

    :host #points .point {
      flex: 1;
      padding: 20px 50px 20px 0;
    }

    :host #points .point h2 {
      align-items: center;
      display: flex;
      flex-direction: row;
      font-weight: normal;
      margin: 0;
    }

    :host #points .point h2 md-icon {
      background: #eee;
      border-radius: 50%;
      margin-right: 5px;
      padding: 10px;
    }

    @media (max-width: 600px) {
      :host #points {
        flex-direction: column;
      }
    }
  `;

  #createTask = new Task<[string], string>(this, {
    autoRun: false,
    task: ([originalURL], { signal }) =>
      createShortURL(originalURL, fetch, signal),
    onComplete: () => {
      this.copyStatus = '';
      void this.#showResult().catch(error => {
        console.error('Unable to show shortened URL', error);
      });
    },
  });

  protected override render(): TemplateResult {
    return html`<div id="inputs-container">
        <div id="inputs">
          <h1>${msg('Shorten your links')}</h1>
          <div>
            <md-outlined-text-field
              required
              id="input"
              label="${msg('Your original URL here')}"
              type="url"
              error-message="${msg('URL invalid')}"
              @keydown="${(event: KeyboardEvent) => {
                if (event.key === 'Enter') this.#onShortenTap();
              }}"
            ></md-outlined-text-field>
          </div>
          <div>
            <md-filled-button
              ?disabled="${this.#createTask.status === TaskStatus.PENDING}"
              @click="${this.#onShortenTap}"
              >${msg('Shorten URL')}</md-filled-button
            >
          </div>
          <div id="task-status" role="status" aria-live="polite">
            ${this.#createTask.render({
              pending: () => html`
                <md-circular-progress indeterminate></md-circular-progress>
                ${msg('Shortening URL…')}
              `,
              error: error =>
                html`<p class="error">
                  ${
                    error instanceof Error
                      ? error.message
                      : msg('Unable to shorten this URL')
                  }
                </p>`,
            })}
          </div>
        </div>
      </div>
      <div>
        <div id="points">
          <div class="point">
            <h2>
              <md-icon>link</md-icon>
              ${msg('Shorten')}
            </h2>
            ${msg('Shorten your URL so its ready to be shared everywhere')}
          </div>
          <div class="point">
            <h2>
              <md-icon>trending_up</md-icon>
              ${msg('Track')}
            </h2>
            ${msg('Analytics help you know where your clicks are coming from')}
          </div>
          <div class="point">
            <h2>
              <md-icon>people</md-icon>
              ${msg('Learn')}
            </h2>
            ${msg('Understand and visualize your audience')}
          </div>
        </div>
      </div>

      <md-dialog id="result-dialog" aria-label="${msg('Shortened URL')}">
        <div slot="headline">${msg('Your shortened URL')}</div>
        <div slot="content">
          <md-outlined-text-field
            id="result"
            readonly
            .value="${this.#createTask.value ?? ''}"
          ></md-outlined-text-field>
          <div id="copy-status" role="status" aria-live="polite">
            ${this.copyStatus}
          </div>
        </div>
        <div slot="actions">
          <md-text-button @click="${this.#onCopyTap}"
            >${msg('Copy')}</md-text-button
          >
          <md-text-button
            @click="${() => {
              void this.resultDialog?.close();
            }}"
            >${msg('Done')}</md-text-button
          >
        </div>
      </md-dialog>`;
  }

  #onShortenTap = (): void => {
    if (!this.input?.reportValidity()) return;

    const originalURL = this.input.value.trim();
    if (originalURL.length === 0) return;

    void this.#createTask.run([originalURL]);
  };

  #showResult = async (): Promise<void> => {
    await this.updateComplete;
    await this.resultDialog?.show();
  };

  #onCopyTap = async (): Promise<void> => {
    const shortURL = this.#createTask.value;
    if (!shortURL) return;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shortURL);
      } else {
        this.result?.select();
        if (!document.execCommand('copy')) {
          throw new Error('Copy command failed');
        }
      }
      this.copyStatus = msg('Short URL copied to clipboard');
    } catch {
      this.copyStatus = msg('Unable to copy the short URL');
    }
  };
}
