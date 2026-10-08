// 404 Handler
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found at: ${req.originalUrl}`,
  });
};

// Centralized Global Error Handler
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  if (process.env.NODE_ENV === 'development') {
    console.error('Error caught by errorMiddleware:', err);
  }

  // PostgreSQL/Supabase bad identifier or Mongoose CastError
  if (err.name === 'CastError' || err.code === '22P02') {
    const value = err.value || req.params.id || 'id';
    const message = `Resource not found with id of ${value}`;
    return res.status(404).json({ success: false, message });
  }

  // PostgreSQL/Supabase Row not found
  if (err.code === 'PGRST116') {
    return res.status(404).json({ success: false, message: 'Requested resource not found' });
  }

  // PostgreSQL/Supabase unique constraint violation (23505) or Mongoose duplicate key (11000)
  if (err.code === 11000 || err.code === '23505' || (err.message && err.message.includes('duplicate key'))) {
    const field = Object.keys(err.keyValue || {})[0] || 'record';
    const message = `Duplicate value entered for ${field}. Please use another value.`;
    return res.status(400).json({ success: false, message });
  }

  // Validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors || {})
      .map((val) => val.message)
      .join(', ');
    return res.status(400).json({ success: false, message: message || err.message });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Internal Error',
  });
};

module.exports = { notFound, errorHandler };
