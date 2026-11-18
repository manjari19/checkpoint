// Dev server proxy: forwards /api calls to the Spring Boot API so the app and API share one origin
// (needed for the session cookie and CSRF token). API_URL is set by scripts/frontend.sh.
export default {
  '/api': {
    target: process.env.API_URL ?? 'http://localhost:8180',
    secure: false,
    changeOrigin: false,
  },
};
