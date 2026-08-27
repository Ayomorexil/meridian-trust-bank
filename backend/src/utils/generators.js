const randomDigits = (len) =>
  Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join('');

exports.generateAccountNumber = () => randomDigits(10);
exports.generateMemberNumber = () => `MT-${randomDigits(4)}-${randomDigits(4)}`;
