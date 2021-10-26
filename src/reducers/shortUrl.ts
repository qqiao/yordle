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

import { Reducer } from 'redux';
import { ActionTypes, Status } from '../actions/shortUrl.js';
import { RootActions } from '../store.js';

export interface State {
  shortUrl?: string;
  status?: Status;
}

const INITIAL_STATE: State = {};

const shortUrl: Reducer<State, RootActions> = (
  state = INITIAL_STATE,
  action: RootActions
) => {
  switch (action.type) {
    case ActionTypes.CREATION_SUCCESS:
      return {
        ...state,
        shortUrl: action.shortUrl,
        status: Status.SUCCESS,
      };
    case ActionTypes.CREATION_FAILURE:
      return {
        ...state,
        status: Status.FAILURE,
      };
    default:
      return state;
  }
};

export default shortUrl;
