// Plain-text + light HTML templates for every notification event. Kept as
// simple functions returning { subject, text, html } so emailService.js
// stays a pure transport layer.

const footer =
  '\n\n— Meridian Trust Federal Credit Union (demo)\nThis is a simulated institution. No real funds are involved.';

exports.welcomeVerifyEmail = (user) => ({
  subject: 'Welcome to Meridian Trust — verify your account',
  text: `Hi ${user.fullName || user.full_name},\n\nYour account has been created (member number ${
    user.memberNumber || user.member_number
  }). Your identity verification (KYC) is currently pending review before you can send transfers.${footer}`,
});

exports.kycStatusChanged = (user, status, reason) => ({
  subject: `Your identity verification status: ${status}`,
  text: `Hi ${user.full_name || user.fullName},\n\nYour KYC status has been updated to "${status}".${
    reason ? `\nReason: ${reason}` : ''
  }${footer}`,
});

exports.loginAlert = (user) => ({
  subject: 'New sign-in to your account',
  text: `Hi ${user.full_name || user.fullName},\n\nWe noticed a new sign-in to your Meridian Trust account just now. If this wasn't you, contact support immediately.${footer}`,
});

exports.transferInitiated = (user, transfer) => ({
  subject: `Transfer initiated — $${Number(transfer.amount).toFixed(2)}`,
  text: `Hi ${user.full_name || user.fullName},\n\nYour transfer of $${Number(transfer.amount).toFixed(
    2
  )} has been initiated and is ${transfer.status}.${footer}`,
});

exports.transferCompleted = (user, transfer) => ({
  subject: `Transfer completed — $${Number(transfer.amount).toFixed(2)}`,
  text: `Hi ${user.full_name || user.fullName},\n\nYour transfer of $${Number(transfer.amount).toFixed(
    2
  )} has completed successfully.${footer}`,
});

exports.transferApproved = (user, transfer) => ({
  subject: `Transfer approved — $${Number(transfer.amount).toFixed(2)}`,
  text: `Hi ${user.full_name || user.fullName},\n\nYour pending transfer of $${Number(transfer.amount).toFixed(
    2
  )} has been reviewed and approved.${footer}`,
});

exports.transferRejected = (user, transfer, reason) => ({
  subject: `Transfer declined — $${Number(transfer.amount).toFixed(2)}`,
  text: `Hi ${user.full_name || user.fullName},\n\nYour transfer of $${Number(transfer.amount).toFixed(
    2
  )} was declined.\nReason: ${reason || 'Not specified'}${footer}`,
});

exports.billPaid = (user, payee, amount) => ({
  subject: `Bill payment sent — ${payee}`,
  text: `Hi ${user.full_name || user.fullName},\n\nA payment of $${Number(amount).toFixed(2)} to ${payee} was processed.${footer}`,
});

exports.creditScoreChanged = (user, newScore, reason) => ({
  subject: 'Your credit score has been updated',
  text: `Hi ${user.full_name || user.fullName},\n\nYour simulated credit score was updated to ${newScore} by a Meridian Trust representative.${
    reason ? `\nReason: ${reason}` : ''
  }${footer}`,
});

exports.accountStatusChanged = (user, status, reason) => ({
  subject: `Your account status: ${status}`,
  text: `Hi ${user.full_name || user.fullName},\n\nYour account status has been changed to "${status}".${
    reason ? `\nReason: ${reason}` : ''
  }${footer}`,
});
