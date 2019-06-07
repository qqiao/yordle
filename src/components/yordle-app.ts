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

import { unsafeHTML } from 'lit-html/directives/unsafe-html';
import { html, LitElement, customElement, property, css } from 'lit-element';

import '@material/mwc-icon';
import '@material/mwc-icon-button';
import '@material/mwc-top-app-bar';

import { connect } from 'pwa-helpers/connect-mixin';
import { installRouter } from 'pwa-helpers/router';

import './yordle-home';

import { store, RootState } from '../store';
import { navigate, i18n } from '../actions/app';

import { MESSAGES } from './yordle-app-en';

@customElement('yordle-app')
export class YordleApp extends connect(store)(LitElement) {
    @property()
    private appName: string = 'Yordle'

    @property()
    _messages: any

    @property()
    _page: string = 'home'

    constructor() {
        super();
        this._messages = MESSAGES;
    }

    static styles = css`
        :host {
            color: #666;
            display: block;
            --mdc-theme-primary: #fff
        }

        :host mwc-top-app-bar a {
            color: #666;
            text-decoration: none;
        }

        :host mwc-icon-button {
            margin: 0 16px 0 0;
        }

        :host mwc-icon-button:not([active]) {
            display: none;
        }

        :host mwc-top-app-bar .top-navigation a {
            color: #333;
            margin-left: 20px;
            text-decoration: none;
        }

        :host .page {
            display: none;
            margin: 48px auto 0;
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
        }`;

    protected render() {
        return html`
        <mwc-top-app-bar>
            <a href="/" slot="navigationIcon">
                <mwc-icon-button ?active="${'home' !== this._page}"
                    icon="arrow_back"></mwc-icon-button>
            </a>
            <div slot="title">${this.appName}</div>
            <div slot="actionItems" class="top-navigation">
                <a href="#/help">${this._messages.help}</a>
            </div>
        </mwc-top-app-bar>

        <yordle-home class="page" ?active="${'home' === this._page}"></yordle-home>
        <yordle-help class="page" ?active="${'help' === this._page}"></yordle-help>

        <footer>
            ${unsafeHTML(this._messages.poweredBy)}
        </footer>`;
    }

    protected firstUpdated() {
        installRouter((location) => {
            store.dispatch(navigate(decodeURIComponent(location.hash)));
        });

        store.dispatch(i18n(navigator.language));
    }

    stateChanged(state: RootState) {
        if (state.app) {
            this._page = state.app.page;

            if (state.app.language) {
                if ('en' === state.app.language) {
                    this._messages = MESSAGES;
                } else {
                    let promise;
                    switch (state.app.language) {
                        case 'zh':
                            promise = import('./yordle-app-zh.js')
                            break;
                    }
                    if (promise)
                        promise.then((module) => {
                            this._messages = module.MESSAGES;
                        });
                }
            }
        }
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'yordle-app': YordleApp;
    }
}
