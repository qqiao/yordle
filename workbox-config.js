module.exports = {
    clientsClaim: true,
    skipWaiting: true,
    swDest: 'dist/service-worker.js',
    globDirectory: 'dist/',
    globPatterns: [
        '**/*.js',
        '*.json',
        'images/**/*'
    ],
    runtimeCaching: [{
        urlPattern: /\/images\//,
        handler: 'CacheFirst'
    }, {
        urlPattern: /^https:\/\/fonts.gstatic.com\//,
        handler: 'CacheFirst',
    }, {
        urlPattern: /\.(?:js|map)$/,
        handler: 'CacheFirst'
    }]
};