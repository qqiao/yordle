import { css, html, LitElement, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('yordle-admin')
export class YordleAdmin extends LitElement {
  @property({ attribute: 'app-name' })
  appName = 'Yordle URL Shortener';

  static override readonly styles = css`
    :host {
      display: block;
      min-height: 100vh;
    }

    header {
      align-items: center;
      background: #59f;
      box-shadow: 0 2px 12px rgb(30 60 110 / 18%);
      color: #fff;
      display: flex;
      justify-content: space-between;
      padding: 18px clamp(20px, 5vw, 72px);
    }

    header strong {
      font-size: 1.1rem;
      letter-spacing: -0.01em;
    }

    header a {
      border: 1px solid rgb(255 255 255 / 70%);
      border-radius: 999px;
      color: inherit;
      padding: 7px 14px;
      text-decoration: none;
    }

    header a:focus-visible,
    header a:hover {
      background: rgb(255 255 255 / 16%);
      outline: 2px solid #fff;
      outline-offset: 2px;
    }

    main {
      margin: 0 auto;
      max-width: 880px;
      padding: clamp(40px, 8vw, 80px) 20px;
    }

    h1 {
      font-size: clamp(2rem, 5vw, 3rem);
      letter-spacing: -0.04em;
      line-height: 1.1;
      margin: 0 0 12px;
    }

    .intro {
      color: #526078;
      font-size: 1.05rem;
      margin: 0 0 32px;
    }

    section {
      background: #fff;
      border: 1px solid #e1e6ef;
      border-radius: 16px;
      box-shadow: 0 14px 38px rgb(30 60 110 / 8%);
      padding: clamp(24px, 5vw, 40px);
    }

    h2 {
      font-size: 1.2rem;
      margin: 0 0 20px;
    }

    dl {
      display: grid;
      gap: 8px;
      margin: 0;
    }

    dt {
      color: #66738a;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    dd {
      font-size: 1.05rem;
      margin: 0;
      overflow-wrap: anywhere;
    }
  `;

  protected override render(): TemplateResult {
    return html`
      <header>
        <strong>${this.appName}</strong>
        <a href="/">Return to app</a>
      </header>
      <main>
        <h1>Administration</h1>
        <p class="intro">Review the active configuration for this instance.</p>
        <section aria-labelledby="configuration-heading">
          <h2 id="configuration-heading">Configuration</h2>
          <dl>
            <dt>Application name</dt>
            <dd>${this.appName}</dd>
          </dl>
        </section>
      </main>
    `;
  }
}
