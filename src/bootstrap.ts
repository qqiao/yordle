import loadPolyfills from '@open-wc/polyfills-loader';

(async () => {
    try {
        await loadPolyfills();
        await import('./components/yordle-app');
    } catch (e) {
        console.error(e);
    }
})();