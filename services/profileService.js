const { getProfileByUserId, followUser, unfollowUser } = require('../models/profileModel');
const { findUserByUsername } = require('../models/userModel');
const { badRequest, notFound } = require('../utils/errors');
const { recordAudit } = require('./auditService');

async function getProfile(username, currentUser, req) {
  const targetUser = await findUserByUsername(username);

  if (!targetUser) {
    throw notFound('profile not found');
  }

  const profile = await getProfileByUserId(targetUser.id, currentUser ? currentUser.id : null);

  if (currentUser) {
    await recordAudit(currentUser.id, 'profile.view', req, { username });
  }

  return { profile };
}

async function followProfile(currentUser, username, req) {
  const targetUser = await findUserByUsername(username);

  if (!targetUser) {
    throw notFound('profile not found');
  }

  if (targetUser.id === currentUser.id) {
    throw badRequest('you cannot follow yourself');
  }

  await followUser(currentUser.id, targetUser.id);
  const profile = await getProfileByUserId(targetUser.id, currentUser.id);

  await recordAudit(currentUser.id, 'profile.follow', req, { username });

  return { profile };
}

async function unfollowProfile(currentUser, username, req) {
  const targetUser = await findUserByUsername(username);

  if (!targetUser) {
    throw notFound('profile not found');
  }

  await unfollowUser(currentUser.id, targetUser.id);
  const profile = await getProfileByUserId(targetUser.id, currentUser.id);

  await recordAudit(currentUser.id, 'profile.unfollow', req, { username });

  return { profile };
}

module.exports = {
  followProfile,
  getProfile,
  unfollowProfile
};