// Utility validation middleware for request sanitization & checking

exports.validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Please provide a valid name' });
  }

  if (!email || !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
  }

  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  next();
};

exports.validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide both email and password' });
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

exports.validateTask = (req, res, next) => {
  const { title, status, priority, dueDate } = req.body;

  if (title !== undefined && (!title || typeof title !== 'string' || title.trim().length === 0)) {
    return res.status(400).json({ success: false, message: 'Task title cannot be empty' });
  }

  const validStatuses = ['To Do', 'In Progress', 'Completed', 'Archived'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({ success: false, message: `Priority must be one of: ${validPriorities.join(', ')}` });
  }

  if (dueDate && isNaN(Date.parse(dueDate))) {
    return res.status(400).json({ success: false, message: 'Invalid due date format' });
  }

  next();
};

exports.validateCategory = (req, res, next) => {
  const { name, color } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Category name is required' });
  }

  if (color && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
    return res.status(400).json({ success: false, message: 'Category color must be a valid hex code (e.g., #6366f1)' });
  }

  req.body.name = name.trim();
  next();
};
