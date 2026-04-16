const jwt = require('jsonwebtoken');

const { findUserById } = require('../models/userModel');
const { unauthorized } = require('./errors');

const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(user) {
  return jwt.sign({ id: user.id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

function serializeUser(user) {
  return {
    email: user.email,
    token: signToken(user),
    username: user.username,
    bio: user.bio,
    image: user.image
  };
}

function extractToken(req) {
  const authHeader = req.headers.authorization || '';

  if (authHeader.startsWith('Token ')) {
    return authHeader.slice('Token '.length).trim();
  }

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  return null;
}

async function resolveUser(req, strictMode) {
  const token = extractToken(req);

  if (!token) {
    if (strictMode) {
      throw unauthorized('authentication required');
    }

    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(payload.id);

    if (!user) {
      throw unauthorized('authentication required');
    }

    return user;
  } catch (error) {
    if (strictMode) {
      throw unauthorized('authentication required');
    }

    return null;
  }
}

async function authRequired(req, res, next) {
  try {
    req.user = await resolveUser(req, true);
    next();
  } catch (error) {
    next(error);
  }
}

async function authOptional(req, res, next) {
  try {
    req.user = await resolveUser(req, false);
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  authOptional,
  authRequired,
  extractToken,
  serializeUser,
  signToken
};