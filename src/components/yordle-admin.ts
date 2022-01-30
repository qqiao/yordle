import { css, html, LitElement, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import './yordle-shell.js';

@customElement('yordle-admin')
export class YordleAdmin extends LitElement {
  @property()
  appName = 'Yordle';

  static override readonly styles = css`
    :host {
      display: block;
    }
  `;

  protected override render(): TemplateResult {
    return html`<yordle-shell .appName="${this.appName}">123</yordle-shell>`;
  }
}
