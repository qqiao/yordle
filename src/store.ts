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

import {
  createStore,
  compose,
  applyMiddleware,
  combineReducers,
  Reducer,
  StoreEnhancer,
} from 'redux';
import { thunk, ThunkMiddleware } from 'redux-thunk';
import { lazyReducerEnhancer } from 'pwa-helpers/lazy-reducer-enhancer';

import { Actions as AppActions } from './actions/app.js';
import { Actions as ShortUrlActions } from './actions/shortUrl.js';

import app, { State as AppState } from './reducers/app.js';
import { State as ShortUrlState } from './reducers/shortUrl.js';

declare global {
  interface Window {
    process?: unknown;
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof compose;
  }
}

// Overall state extends static states and partials lazy states.
export interface RootState {
  app?: AppState;
  shortUrl?: ShortUrlState;
}

export type RootActions = AppActions | ShortUrlActions;

// Sets up a Chrome extension for time travel debugging.
// See https://github.com/zalmoxisus/redux-devtools-extension for more information.
const devCompose: <
  Ext0 extends {},
  Ext1 extends {},
  StateExt0 extends {},
  StateExt1 extends {},
>(
  f1: StoreEnhancer<Ext0, StateExt0>,
  f2: StoreEnhancer<Ext1, StateExt1>,
) => StoreEnhancer<Ext0 & Ext1, StateExt0 & StateExt1> =
  window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

// Initializes the Redux store with a lazyReducerEnhancer (so that you can
// lazily add reducers after the store has been created) and redux-thunk (so
// that you can dispatch async actions). See the "Redux and state management"
// section of the wiki for more details:
// https://github.com/Polymer/pwa-starter-kit/wiki/4.-Redux-and-state-management
export const store = createStore(
  state => state as Reducer<RootState, RootActions>,
  devCompose(
    lazyReducerEnhancer(combineReducers),
    applyMiddleware(thunk as ThunkMiddleware<RootState, RootActions>),
  ),
);

// Initially loaded reducers.
store.addReducers({
  app,
});
