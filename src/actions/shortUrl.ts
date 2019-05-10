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

import { RootState } from '../store';

export const enum ActionTypes {
    CREATION_FAILURE = '[short url] Creation Failure',
    CREATION_SUCCESS = '[short url] Creation Success',
}

export enum Status {
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE',
}

interface ActionCreationFailure extends Action<ActionTypes.CREATION_FAILURE> {
    error?: string;
}
interface ActionCreationSuccess extends Action<ActionTypes.CREATION_SUCCESS> {
    shortUrl: string;
};

type ThunkResult = ThunkAction<void, RootState, undefined, Actions>;

export type Actions = ActionCreationFailure | ActionCreationSuccess;


export const createShortUrl: ActionCreator<ThunkResult> = (originalUrl: string) => async (dispatch) => {
    let formData = new FormData();
    formData.append('OriginalUrl', originalUrl);
    const resp = await (await fetch('/v1/api/create', {
        method: 'POST',
        body: formData,
    })).json();

    switch (Status[resp.status]) {
        case Status.SUCCESS:
            dispatch({
                type: ActionTypes.CREATION_SUCCESS,
                shortUrl: resp.payload
            } as ActionCreationSuccess);
            return;
        case Status.FAILURE:
            dispatch({
                type: ActionTypes.CREATION_FAILURE
            } as ActionCreationFailure);
            return;
    }
};
