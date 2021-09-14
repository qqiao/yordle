import { localeTransformers } from '@lit/localize-tools/lib/rollup.js';
import { createSpaConfig } from '@open-wc/building-rollup';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import merge from 'deepmerge';

const production = process.env.ROLLUP_WATCH !== 'true';
const buildType = process.env.BUILD_TYPE;

const locales = localeTransformers();

const configs = locales.map(({ locale, localeTransformer }) => {
    const baseConfig = createSpaConfig({
        developmentMode: !production,
        injectServiceWorker: false,
        nodeResolve: { browser: true, dedupe: ['lit-html'] },
    });

    return merge(baseConfig, {
        input: './index.html',
        plugins: [
            replace({
                preventAssignment: true,
                values: {
                    'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
                    'process.env.BUILD_TYPE': JSON.stringify(buildType)
                }
            }),
            typescript({
                transformers: {
                    before: [localeTransformer],
                },
            }),
        ],
        output: {
            dir: `dist/${locale}`,
            sourcemap: true,
            format: 'es'
        },
    });
});

export default configs;
