const { db } = require('../config/db');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.getMyNotifications = catchAsync(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
  const notifications = await db.any(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [req.user.id, limit]
  );
  const unreadCount = await db.one(
    'SELECT count(*)::int AS count FROM notifications WHERE user_id = $1 AND read = false',
    [req.user.id]
  );
  res.status(200).json({ status: 'success', data: { notifications, unreadCount: unreadCount.count } });
});

exports.markRead = catchAsync(async (req, res, next) => {
  const notification = await db.oneOrNone('SELECT * FROM notifications WHERE id = $1 AND user_id = $2', [
    req.params.id,
    req.user.id,
  ]);
  if (!notification) return next(new AppError('Notification not found.', 404));
  const updated = await db.one('UPDATE notifications SET read = true WHERE id = $1 RETURNING *', [req.params.id]);
  res.status(200).json({ status: 'success', data: { notification: updated } });
});

exports.markAllRead = catchAsync(async (req, res) => {
  await db.none('UPDATE notifications SET read = true WHERE user_id = $1 AND read = false', [req.user.id]);
  res.status(200).json({ status: 'success', message: 'All notifications marked as read.' });
});
