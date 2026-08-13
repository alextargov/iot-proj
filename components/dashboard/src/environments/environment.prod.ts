export const environment = {
    production: true,
    // In production, use relative paths that will be served from the same origin
    apiUrl: '/graphql',
    wsUrl: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/graphql`,
};
