exports.parsePage = (q, defaultLimit = 10) => {
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || defaultLimit, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

exports.paged = (data, total, page, limit) => ({
  data,
  pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
});

exports.escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
