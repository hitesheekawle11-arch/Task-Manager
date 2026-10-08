const User = require('../models/User');
const Category = require('../models/Category');

// Default categories created for every newly registered user
const DEFAULT_CATEGORIES = [
  { name: 'Work', color: '#3b82f6', icon: '💼', description: 'Work and professional projects' },
  { name: 'Personal', color: '#10b981', icon: '🏡', description: 'Personal life and errands' },
  { name: 'College', color: '#8b5cf6', icon: '🎓', description: 'Academics and study goals' },
  { name: 'Fitness', color: '#f59e0b', icon: '💪', description: 'Health and workouts' },
  { name: 'Freelance', color: '#ec4899', icon: '💻', description: 'Client work and freelance gigs' },
];

// Helper to send token response
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = user.getSignedJwtToken();

  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      bio: user.bio,
      themePreference: user.themePreference,
      createdAt: user.createdAt,
    },
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists',
      });
    }

    // First user registered can automatically be made admin if none exists
    const countUsers = await User.countDocuments();
    const assignedRole = countUsers === 0 ? 'admin' : (role === 'admin' ? 'admin' : 'user');

    const user = await User.create({
      name,
      email,
      password,
      role: assignedRole,
    });

    // Seed default categories for this user
    try {
      const userCategories = DEFAULT_CATEGORIES.map((cat) => ({
        ...cat,
        user: user._id,
      }));
      await Category.insertMany(userCategories);
    } catch (catErr) {
      console.warn('Could not seed default categories:', catErr.message);
    }

    sendTokenResponse(user, 201, res, 'Registration successful! Welcome to Task Manager.');
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    sendTokenResponse(user, 200, res, 'Login successful!');
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Log user out
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User logged out successfully',
  });
};
