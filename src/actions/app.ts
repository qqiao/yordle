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

import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { RootState } from '../store.js';

export const ACTION_UPDATE_PAGE = '[app] Update Page';

export type ActionTypes = typeof ACTION_UPDATE_PAGE;

interface ActionUpdatePage extends Action<typeof ACTION_UPDATE_PAGE> {
  page?: string;
}

export type Actions = ActionUpdatePage;

type ThunkResult = ThunkAction<void, RootState, undefined, Actions>;

const updatePage: ActionCreator<ActionUpdatePage> = (page: string) => ({
  type: ACTION_UPDATE_PAGE,
  page,
});

const loadPage: ActionCreator<ThunkResult> = (page: string) => dispatch => {
  switch (page) {
    case 'help': {
      import('../components/yordle-help.js');
      break;
    }
    default:
      break;
  }
  dispatch(updatePage(page));
};

export const navigate: ActionCreator<ThunkResult> =
  (path: string) => dispatch => {
    // Extract the page name from path.
    const page = path === '' ? 'home' : path.slice(2);

    // Any other info you might want to extract from the path (like page type),
    // you can do here
    dispatch(loadPage(page));
  };
