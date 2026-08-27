// db can be the pg-promise root `db` object, or a `t` from inside db.tx(...)
exports.writeAuditLog = (db, { adminId, action, entityType, entityId, oldValue, newValue, reason }) =>
  db.none(
    `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, old_value, new_value, reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [adminId, action, entityType, entityId, oldValue || null, newValue || null, reason || null]
  );

exports.notify = (db, { userId, title, body }) =>
  db.none(`INSERT INTO notifications (user_id, title, body) VALUES ($1,$2,$3)`, [userId, title, body]);
