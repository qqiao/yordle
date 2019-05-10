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

import { LitElement, html, customElement, css } from 'lit-element';

@customElement('yordle-help' as any)
export class YordleHelp extends LitElement {
    static styles = css`
        :host {
            display: block;
        }

        :host > div {
            display: flex;
            justify-content: center;
            padding: 30px;
        }

        :host .header {
            background-color: #59f;
        }

        :host .contents > *,
        :host .header > * {
            flex: 1;
            max-width: 900px;
        }

        :host .header h2 {
            color: #fff;
            display: block;
            font-weight: normal;
            margin: 0;
        }`;

    protected render() {
        return html`
        <div class="header">
            <div>
                <h2>Yordle Help</h2>
            </div>
        </div>
        <div class="contents">
            <div>
                <h4>What is Yordle?</h4>
                <p>
                    Yordle allows you to shorten URLs so that they are easier
                    to share with people. For example, the following URL
                    <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                       target="_blank">https://www.youtube.com/watch?v=dQw4w9WgXcQ</a>
                    can be shortened to
                    <a href="/PmYUlTPea"
                       target="_blank">${document.baseURI}PmYUlTPea</a>,
                    which can be shared more easily.
                </p>
                <h4>How to I shorten a link?</h4>
                <p>
                    To shorten a link, paste in the long URL in the text box
                    labeled 'Your original URL here', then click on the
                    'Shorten URL' link.
                </p>
                <p>
                    A new dialog box will show up with the shortened URL. Click
                    on the 'Copy' button to copy it to your clipboard so that
                    it can be shared, emailed or tweeted.
                </p>
            </div>
        </div>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'yordle-help': YordleHelp;
    }
}
