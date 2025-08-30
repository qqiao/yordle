import { ContextProvider, createContext } from '@lit/context';
import { Options } from '@lit/context/lib/controllers/context-provider';
import { ReactiveControllerHost } from '@lit/reactive-element';
import { allLocales, sourceLocale, targetLocales } from '../locale-codes';
import { configureLocalization } from '@lit/localize';

export const localeContext = createContext<string, Symbol>(Symbol('locale'));

const { getLocale, setLocale } = configureLocalization({
  sourceLocale,
  targetLocales,
  loadLocale: locale => import(`../locales/${locale}.js`),
});

export class LocaleProvider extends ContextProvider<typeof localeContext> {
  constructor(
    host: ReactiveControllerHost & HTMLElement,
    options: Options<typeof localeContext>,
  ) {
    super(host, options);
  }

  setValue(value: string) {
    value = this.#sanitizeLocale(value);
    setLocale(value);
    super.setValue(value);
  }

  #sanitizeLocale(locale?: string) {
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
    return targetLoc;
  }
}
