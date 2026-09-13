import app from '../src/app.js';

export default async function handler(req, res) {
  const matchedPath =
    req.headers['x-matched-path'] ||
    req.headers['x-forwarded-uri'] ||
    req.headers['x-original-url'];

  if (
    matchedPath &&
    matchedPath !== '/api' &&
    matchedPath !== '/api/' &&
    (req.url === '/api' || req.url === '/api/' || req.url === '/api/index.js' || req.url === '/')
  ) {
    req.url = matchedPath;
  }

  return app(req, res);
}
