const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const header = req.headers['authorization'];
  const token  = header && header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ error: 'Token invalid or expired.' });
  }
};
