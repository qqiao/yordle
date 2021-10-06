import { ReduxStateController } from '@qqiao/webapp-scaffold/controllers/redux-state-controller';

import { RootState, store } from '../store';

export class NavigationController extends ReduxStateController(store) {
  page?: string;

  override stateChanged(state: RootState) {
    let needsUpdate = false;
    if (state.app?.page !== this.page) {
      this.page = state.app?.page;
      needsUpdate = true;
    }

    if (needsUpdate) this.host.requestUpdate();
  }
}
