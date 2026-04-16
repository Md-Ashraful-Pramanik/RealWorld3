const { query } = require('../config/db');

function mapProfile(row) {
  if (!row) {
    return null;
  }

  return {
    username: row.username,
    bio: row.bio,
    image: row.image,
    following: row.following
  };
}

async function getProfileByUserId(userId, viewerId = null) {
  const result = viewerId
    ? await query(
        `
          SELECT
            u.username,
            u.bio,
            u.image,
            EXISTS (
              SELECT 1
              FROM follows f
              WHERE f.follower_id = $2 AND f.following_id = u.id
            ) AS following
          FROM users u
          WHERE u.id = $1
        `,
        [userId, viewerId]
      )
    : await query(
        `
          SELECT
            u.username,
            u.bio,
            u.image,
            FALSE AS following
          FROM users u
          WHERE u.id = $1
        `,
        [userId]
      );

  return mapProfile(result.rows[0]);
}

async function followUser(followerId, followingId) {
  await query(
    `
      INSERT INTO follows (follower_id, following_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `,
    [followerId, followingId]
  );
}

async function unfollowUser(followerId, followingId) {
  await query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [
    followerId,
    followingId
  ]);
}

module.exports = {
  followUser,
  getProfileByUserId,
  unfollowUser
};