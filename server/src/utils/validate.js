const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
exports.isEmail = (s) => EMAIL_RX.test(String(s || '').trim());
exports.isBlank = (s) => !String(s ?? '').trim();
exports.hasErrors = (e) => Object.keys(e).length > 0;
exports.fail = (res, errors) => res.status(400).json({ message: 'Please fix the highlighted fields', errors });
exports.conflict = (res, field, message) => res.status(409).json({ message, errors: { [field]: message } });
