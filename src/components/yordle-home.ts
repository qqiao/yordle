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

import { LitElement, html, customElement, property, css } from 'lit-element';

import '@material/mwc-button';
import '@material/mwc-icon';

import '@polymer/paper-dialog/paper-dialog';
import '@polymer/paper-input/paper-input';

import { IronInputElement } from '@polymer/iron-input';
import { PaperDialogElement } from '@polymer/paper-dialog/paper-dialog';
import { PaperInputElement } from '@polymer/paper-input/paper-input';

import { connect } from 'pwa-helpers/connect-mixin';

import { MESSAGES } from './yordle-home-en';

import { store, RootState } from '../store';

import { createShortUrl, Status } from '../actions/shortUrl';

import shortUrl from '../reducers/shortUrl';

store.addReducers({ shortUrl });

@customElement('yordle-home')
export class YordleHome extends connect(store)(LitElement) {
    @property()
    private _messages: any

    @property()
    private _shortUrl: string = ''

    static styles = css`
        :host {
            display: block;
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

        :host .inputs paper-input {
            --paper-input-container-color: #fff;
            --paper-input-container-focus-color: #fff;
            --paper-input-container-input-color: #fff;
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

        :host paper-dialog .dialog-content {
            align-items: center;
            display: flex;
            flex-direction: row;
        }

        :host paper-dialog mwc-button {
            --mdc-theme-primary: #666;
        }

        :host paper-dialog .dialog-content #shortUrl {
            flex: 1;
        }`;

    protected render() {
        return html`
        <div class="inputs-container">
            <div class="inputs">
                <h1>${this._messages['Shorten your links']}</h1>
                <paper-input id="originalUrlInput"
                    label="${this._messages['Your original URL here']}"
                    type="url" error-message="${this._messages['URL invalid']}">
                </paper-input>
                <mwc-button @click="${this._onShortenTap}">
                    ${this._messages['Shorten URL']}
                </mwc-button>
            </div>
        </div>
        <div>
            <div class="points">
                <div class="point">
                    <h2>
                        <mwc-icon>link</mwc-icon>
                        ${this._messages['Shorten']}
                    </h2>
                    ${this._messages['Shorten your URL so its ready to be shared everywhere']}
                </div>
                <div class="point">
                    <h2>
                        <mwc-icon>trending_up</mwc-icon>
                        ${this._messages['Track']}
                    </h2>
                    ${this._messages['Analytics help you know where your clicks are coming from']}
                </div>
                <div class="point">
                    <h2>
                        <mwc-icon>people</mwc-icon>
                        ${this._messages['Learn']}
                    </h2>
                    ${this._messages['Understand and visualize your audience']}
                </div>
            </div>
        </div>
        <paper-dialog id="resultDialog" no-cancel-on-outside-click
                      no-cancel-on-esc-key>
            <div class="dialog-content">
                <paper-input id="shortUrl" no-label-float type="url"
                             value="${this._shortUrl}"></paper-input>
                <mwc-button dense icon="file_copy"
                            @click="${this._onCopyTap}">
                    ${this._messages['Copy']}
                </mwc-button>
            </div>
            <div class="buttons">
                <mwc-button dense dialog-dismiss>
                    ${this._messages['Done']}
                </mwc-button>
            </div>
        </paper-dialog>`;
    }

    constructor() {
        super();

        this._messages = MESSAGES;
    }

    private _onCopyTap() {
        ((this.shadowRoot.querySelector('#shortUrl') as PaperInputElement).inputElement as IronInputElement).inputElement.select();
        document.execCommand('copy');
    }

    private _onShortenTap() {
        if (!this.shadowRoot) return
        let originalUrl = (this.shadowRoot.querySelector('#originalUrlInput') as PaperInputElement)
            .value;
        store.dispatch(createShortUrl(originalUrl));
    }

    stateChanged(state: RootState) {
        if (state.shortUrl && state.shortUrl.shortUrl) {
            this._shortUrl = state.shortUrl.shortUrl;

            if (state.shortUrl.status === Status.SUCCESS) {
                if (this.shadowRoot) {
                    (this.shadowRoot.querySelector('#resultDialog') as PaperDialogElement).open();
                }
            }
        }

        if (state.app && state.app.language) {
            if ('en' === state.app.language) {
                this._messages = MESSAGES;
            } else {
                let promise;
                switch (state.app.language) {
                    case 'zh':
                        promise = import('./yordle-home-zh.js')
                        break;
                    default:
                        promise = import('./yordle-home-en.js')
                }
                promise.then((module) => {
                    this._messages = module.MESSAGES;
                });
            }
        }
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'yordle-home': YordleHome;
    }
}
