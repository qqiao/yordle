import { createSpaConfig } from '@open-wc/building-rollup';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import merge from 'deepmerge';

const baseConfig = createSpaConfig({
    developmentMode: process.env.ROLLUP_WATCH === 'true',
    injectServiceWorker: false,
    nodeResolve: { browser: true, dedupe: ['lit-html'] },
});

const production = process.env.ROLLUP_WATCH !== 'true';
const buildType = process.env.BUILD_TYPE;

export default merge(baseConfig, {
    input: './index.html',
    plugins: [
        replace({
            'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
            'process.env.BUILD_TYPE': JSON.stringify(buildType)
        }),
        typescript()
    ]
});
