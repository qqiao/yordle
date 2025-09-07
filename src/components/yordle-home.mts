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

import { css, html, LitElement, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import '@material/web/icon/icon.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/button/filled-button.js';
import { Task } from '@lit/task';
import { MdOutlinedTextField } from '@material/web/textfield/outlined-text-field.js';

@customElement('yordle-home')
@localized()
export class YordleHome extends LitElement {
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
  `;

  #createTask = new Task(this, {
    task: async () => {
      const input = this.shadowRoot?.querySelector(
        '#input',
      ) as MdOutlinedTextField;
      const url = input?.value;
      return url;
    },
  });

  protected override render(): TemplateResult {
    return html`<div id="inputs-container">
        <div id="inputs">
          <h1>${msg('Shorten your links')}</h1>
          ${this.#createTask.render({
            initial: () => {
              return html` <div>
                  <md-outlined-text-field
                    outlined
                    id="input"
                    label="${msg('Your original URL here')}"
                    type="url"
                    error-message="${msg('URL invalid')}"
                  ></md-outlined-text-field>
                </div>
                <div>
                  <md-filled-button>${msg('Shorten URL')} </md-filled-button>
                </div>`;
            },
          })}
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
      </div>`;
  }
}
