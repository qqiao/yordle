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
import { Reducer } from 'redux';

import { ActionTypes } from '../actions/app';
import { RootActions } from '../store';

export interface State {
    page: string;
    locale: string;
};

const DEFAULT_STATE: State = {
    page: 'home',
    locale: 'en',
}

const app: Reducer<State, RootActions> = (state = DEFAULT_STATE, action: RootActions): State => {
    switch (action.type) {
        case ActionTypes.UPDATE_PAGE:
            return {
                ...state,
                page: action.page,
            };
        case ActionTypes.UPDATE_LOCALE:
            return {
                ...state,
                locale: action.locale,
            };
        default:
            return state;
    }
};

export default app;
