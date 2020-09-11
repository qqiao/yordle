import { createSpaConfig } from '@open-wc/building-rollup';
import replace from '@rollup/plugin-replace';
import merge from 'deepmerge';

const baseConfig = createSpaConfig({
    developmentMode: process.env.ROLLUP_WATCH === 'true',
    injectServiceWorker: true,
});

const production = process.env.ROLLUP_WATCH !== 'true';
const buildType = process.env.BUILD_TYPE;

export default merge(baseConfig, {
    input: './index.html',
    plugins: [
        replace({
            'process.env.NODE_ENV': JSON.stringify(!!production ? 'production' : 'development'),
            'process.env.BUILD_TYPE': JSON.stringify(buildType)
        })
    ]
});
