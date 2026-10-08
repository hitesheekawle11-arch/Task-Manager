const User = require('../models/User');
const Task = require('../models/Task');

// @desc    Get admin high-level system statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getAdminStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: 'Completed' });
    const pendingTasks = await Task.countDocuments({ status: { $in: ['To Do', 'In Progress'] } });
    const archivedTasks = await Task.countDocuments({ status: 'Archived' });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalTasks,
        completedTasks,
        pendingTasks,
        archivedTasks,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all users with their task counts
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const userTotalTasks = await Task.countDocuments({ user: user._id });
        const userCompleted = await Task.countDocuments({ user: user._id, status: 'Completed' });
        const userPending = await Task.countDocuments({
          user: user._id,
          status: { $in: ['To Do', 'In Progress'] },
        });

        return {
          ...user.toObject(),
          tasksCount: {
            total: userTotalTasks,
            completed: userCompleted,
            pending: userPending,
          },
        };
      })
    );

    res.status(200).json({
      success: true,
      count: usersWithStats.length,
      data: usersWithStats,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle user active/disabled status
// @route   PATCH /api/admin/users/:id/status
// @access  Private/Admin
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent disabling self
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot disable your own admin account',
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User account has been ${user.isActive ? 'activated' : 'deactivated'}`,
      data: { id: user._id, isActive: user.isActive },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete user and their tasks
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own admin account',
      });
    }

    // Delete tasks and user
    await Task.deleteMany({ user: user._id });
    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User and all associated tasks deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};
