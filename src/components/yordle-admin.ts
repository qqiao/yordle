import { css, html, LitElement, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('yordle-admin')
export class YordleAdmin extends LitElement {
  static override readonly styles = css`
    :host {
      display: block;
    }
  `;

  protected override render(): TemplateResult {
    return html`123`;
  }
}
