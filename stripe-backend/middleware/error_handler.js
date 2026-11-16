export const notFound = (req, res) => {
  res.status(404).json({ error: 'Not found' });
};

// Express 5 forwards rejected async handlers here. Without this, the default
// handler answers with an HTML page that includes the stack trace outside
// production. Errors can carry a `status` (4xx) whose message is safe to show;
// everything else is a 500 with a generic body.
// eslint-disable-next-line no-unused-vars
export const errorHandler = (error, req, res, next) => {
  const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 600
    ? error.status
    : 500;

  if (status >= 500) {
    console.error(`[api] ${req.method} ${req.originalUrl}:`, error);
  }

  if (res.headersSent) return next(error);

  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : error.message || 'Request failed',
  });
};
