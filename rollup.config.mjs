import { createSpaConfig } from '@open-wc/building-rollup';

import dynamicImportVars from '@rollup/plugin-dynamic-import-vars';
import replace from '@rollup/plugin-replace';
import merge from 'deepmerge';

const production = process.env.ROLLUP_WATCH !== 'true';
const buildType = process.env.BUILD_TYPE;
const baseConfig = createSpaConfig({
    developmentMode: !production,
    injectServiceWorker: false,
    nodeResolve: { browser: true, dedupe: ['lit-html'] },
});

export default merge(baseConfig, {
    input: './index.html',
    plugins: [
        replace({
            preventAssignment: true,
            values: {
                'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
                'process.env.BUILD_TYPE': JSON.stringify(buildType)
            }
        }),
        dynamicImportVars.default(),
    ]
});
