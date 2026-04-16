const { getProfileByUserId, followUser, unfollowUser } = require('../models/profileModel');
const { findUserByUsername } = require('../models/userModel');
const { badRequest, notFound } = require('../utils/errors');
const { recordAudit } = require('./auditService');

async function auditProfileAction(currentUser, action, req, details) {
  if (!currentUser) {
    return null;
  }

  return recordAudit(currentUser.id, action, req, details);
}

async function getProfile(username, currentUser, req) {
  const targetUser = await findUserByUsername(username);

  if (!targetUser) {
    await auditProfileAction(currentUser, 'profile.view', req, {
      username,
      result: 'not_found'
    });

    throw notFound('profile not found');
  }

  const profile = await getProfileByUserId(targetUser.id, currentUser ? currentUser.id : null);

  await auditProfileAction(currentUser, 'profile.view', req, {
    username,
    result: 'success'
  });

  return { profile };
}

async function followProfile(currentUser, username, req) {
  const targetUser = await findUserByUsername(username);

  if (!targetUser) {
    await auditProfileAction(currentUser, 'profile.follow', req, {
      username,
      result: 'not_found'
    });

    throw notFound('profile not found');
  }

  if (targetUser.id === currentUser.id) {
    await auditProfileAction(currentUser, 'profile.follow', req, {
      username,
      result: 'self_follow_blocked'
    });

    throw badRequest('you cannot follow yourself');
  }

  await followUser(currentUser.id, targetUser.id);
  const profile = await getProfileByUserId(targetUser.id, currentUser.id);

  await auditProfileAction(currentUser, 'profile.follow', req, {
    username,
    result: 'success'
  });

  return { profile };
}

async function unfollowProfile(currentUser, username, req) {
  const targetUser = await findUserByUsername(username);

  if (!targetUser) {
    await auditProfileAction(currentUser, 'profile.unfollow', req, {
      username,
      result: 'not_found'
    });

    throw notFound('profile not found');
  }

  await unfollowUser(currentUser.id, targetUser.id);
  const profile = await getProfileByUserId(targetUser.id, currentUser.id);

  await auditProfileAction(currentUser, 'profile.unfollow', req, {
    username,
    result: 'success'
  });

  return { profile };
}

module.exports = {
  followProfile,
  getProfile,
  unfollowProfile
};