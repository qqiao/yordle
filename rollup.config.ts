import createDefaultConfig from '@open-wc/building-rollup/modern-config';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import typescript from 'rollup-plugin-typescript2';

const production = !process.env.ROLLUP_WATCH;
const buildType = process.env.BUILD_TYPE;

const wc = createDefaultConfig({
    input: './index.html'
});

export default [wc].map(conf => {
    return {
        ...conf,
        plugins: [
            replace({
                'process.env.NODE_ENV': JSON.stringify(!!production ? 'production' : 'development'),
                'process.env.BUILD_TYPE': JSON.stringify(buildType)
            }),
            ...conf.plugins,
            typescript({
                clean: true
            }),
            resolve(),
            production && terser()
        ],
        treeshake: !!production
    }
});
