const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  next();
};

const optionalAuth = async (req, res, next) => {
  next();
};

module.exports = { auth, optionalAuth };
