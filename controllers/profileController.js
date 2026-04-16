const asyncHandler = require('../utils/asyncHandler');
const {
  followProfile,
  getProfile,
  unfollowProfile
} = require('../services/profileService');

const profile = asyncHandler(async (req, res) => {
  const response = await getProfile(req.params.username, req.user, req);

  res.json(response);
});

const follow = asyncHandler(async (req, res) => {
  const response = await followProfile(req.user, req.params.username, req);

  res.json(response);
});

const unfollow = asyncHandler(async (req, res) => {
  const response = await unfollowProfile(req.user, req.params.username, req);

  res.json(response);
});

module.exports = {
  profile,
  follow,
  unfollow
};