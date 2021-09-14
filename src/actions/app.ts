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

import { configureLocalization } from '@lit/localize';
import { Action, ActionCreator } from 'redux';
import { ThunkAction } from 'redux-thunk';

import { allLocales, sourceLocale, targetLocales } from '../locale-codes';
import { RootState } from '../store';


export const enum ActionTypes {
    UPDATE_LOCALE = '[app] Update Language',
    UPDATE_PAGE = '[app] Update Page',
};

interface ActionUpdatePage extends Action<ActionTypes.UPDATE_PAGE> {
    page: string
};
interface ActionUpdateLocale extends Action<ActionTypes.UPDATE_LOCALE> {
    locale: string
};

export type Actions = ActionUpdateLocale | ActionUpdatePage;

type ThunkResult = ThunkAction<void, RootState, undefined, Actions>;

export const navigate: ActionCreator<ThunkResult> = (path: string) => (dispatch) => {
    // Extract the page name from path.
    const page = path === '' ? 'home' : path.slice(2);

    // Any other info you might want to extract from the path (like page type),
    // you can do here
    dispatch(loadPage(page));
};

const loadPage: ActionCreator<ThunkResult> = (page: string) => (dispatch) => {
    switch (page) {
        case 'help':
            import('../components/yordle-help.js');
            break;
    }
    dispatch(updatePage(page));
}

const updatePage: ActionCreator<ActionUpdatePage> = (page: string) => {
    return {
        type: ActionTypes.UPDATE_PAGE,
        page
    };
}

const { getLocale, setLocale } = configureLocalization({
    sourceLocale,
    targetLocales,
    loadLocale: locale => import(`../locales/${locale}.js`),
});

export const updateLocale: ActionCreator<ThunkResult> =
    (locale?: string) => async (dispatch, getState) => {
        let targetLoc = locale;
        // setting non-existent locale would result in system going to default
        // locale;
        if (!targetLoc) {
            targetLoc = sourceLocale;
        } else {
            let bestmatch = '';
            allLocales.forEach(l => {
                if (targetLoc?.startsWith(l) && l.length > bestmatch?.length) {
                    bestmatch = l;
                }
            });
            targetLoc = bestmatch ?? sourceLocale;
        }

        const state = getState();

        if (targetLoc !== getLocale() || !state.app?.locale) {
            await setLocale(targetLoc);
            return dispatch({
                type: ActionTypes.UPDATE_LOCALE,
                locale: targetLoc,
            });
        }

        return undefined;
    };

