import { ReduxStateController } from '@qqiao/webapp-scaffold/controllers/redux-state-controller';
import { RootState, store } from '../store';

export class LocaleController extends ReduxStateController(store) {
  locale?: string;

  override stateChanged(state: RootState) {
    let needsUpdate = false;

    if (state.app?.locale !== this.locale) {
      this.locale = state.app?.locale;
      needsUpdate = true;
    }

    if (needsUpdate) this.host.requestUpdate();
  }
}
