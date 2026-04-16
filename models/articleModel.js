const { pool, query } = require('../config/db');
const { slugify } = require('../utils/slug');

function mapArticle(row) {
  if (!row) {
    return null;
  }

  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    body: row.body,
    tagList: row.tag_list || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    favorited: row.favorited,
    favoritesCount: Number(row.favorites_count || 0),
    author: {
      username: row.author_username,
      bio: row.author_bio,
      image: row.author_image,
      following: row.author_following
    }
  };
}

function mapComment(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    body: row.body,
    author: {
      username: row.author_username,
      bio: row.author_bio,
      image: row.author_image,
      following: row.author_following
    }
  };
}

function getArticleSelectSql(filterSql) {
  return `
    SELECT
      a.id,
      a.author_id,
      a.slug,
      a.title,
      a.description,
      a.body,
      a.created_at,
      a.updated_at,
      COALESCE(tags.tag_list, ARRAY[]::text[]) AS tag_list,
      COALESCE(fav_stats.favorites_count, 0) AS favorites_count,
      COALESCE(viewer_fav.favorited, FALSE) AS favorited,
      au.username AS author_username,
      au.bio AS author_bio,
      au.image AS author_image,
      COALESCE(viewer_follow.following, FALSE) AS author_following
    FROM articles a
    INNER JOIN users au ON au.id = a.author_id
    LEFT JOIN LATERAL (
      SELECT ARRAY_AGG(COALESCE(t.name, at.tag) ORDER BY at.position ASC, COALESCE(t.name, at.tag) ASC) AS tag_list
      FROM article_tags at
      LEFT JOIN tags t ON t.id = at.tag_id
      WHERE at.article_id = a.id AND at.deleted_at IS NULL
    ) tags ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::INTEGER AS favorites_count
      FROM article_favorites af
      WHERE af.article_id = a.id AND af.deleted_at IS NULL
    ) fav_stats ON TRUE
    LEFT JOIN LATERAL (
      SELECT TRUE AS favorited
      FROM article_favorites af
      WHERE af.article_id = a.id AND af.user_id = $1 AND af.deleted_at IS NULL
      LIMIT 1
    ) viewer_fav ON TRUE
    LEFT JOIN LATERAL (
      SELECT TRUE AS following
      FROM follows f
      WHERE f.following_id = au.id AND f.follower_id = $1
      LIMIT 1
    ) viewer_follow ON TRUE
    ${filterSql}
  `;
}

async function listArticles(filters, viewerId = null) {
  const params = [viewerId, filters.tag || null, filters.author || null, filters.favorited || null];

  const filterSql = `
    WHERE a.deleted_at IS NULL
      AND ($2::text IS NULL OR EXISTS (
        SELECT 1
        FROM article_tags atf
        LEFT JOIN tags tf ON tf.id = atf.tag_id
        WHERE atf.article_id = a.id AND atf.deleted_at IS NULL AND COALESCE(tf.name, atf.tag) = $2
      ))
      AND ($3::text IS NULL OR au.username = $3)
      AND ($4::text IS NULL OR EXISTS (
        SELECT 1
        FROM article_favorites aff
        INNER JOIN users uf ON uf.id = aff.user_id
        WHERE aff.article_id = a.id AND aff.deleted_at IS NULL AND uf.username = $4
      ))
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT $5 OFFSET $6
  `;

  const countSql = `
    SELECT COUNT(*)::INTEGER AS count
    FROM articles a
    INNER JOIN users au ON au.id = a.author_id
    WHERE a.deleted_at IS NULL
      AND ($1::text IS NULL OR EXISTS (
        SELECT 1
        FROM article_tags atf
        LEFT JOIN tags tf ON tf.id = atf.tag_id
        WHERE atf.article_id = a.id AND atf.deleted_at IS NULL AND COALESCE(tf.name, atf.tag) = $1
      ))
      AND ($2::text IS NULL OR au.username = $2)
      AND ($3::text IS NULL OR EXISTS (
        SELECT 1
        FROM article_favorites aff
        INNER JOIN users uf ON uf.id = aff.user_id
        WHERE aff.article_id = a.id AND aff.deleted_at IS NULL AND uf.username = $3
      ))
  `;

  params.push(filters.limit, filters.offset);

  const [articlesResult, countResult] = await Promise.all([
    query(getArticleSelectSql(filterSql), params),
    query(countSql, [filters.tag || null, filters.author || null, filters.favorited || null])
  ]);

  return {
    articles: articlesResult.rows.map(mapArticle),
    articlesCount: countResult.rows[0].count
  };
}

async function listFeedArticles(userId, limit, offset) {
  const filterSql = `
    INNER JOIN follows feed ON feed.following_id = a.author_id AND feed.follower_id = $2
    WHERE a.deleted_at IS NULL
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT $3 OFFSET $4
  `;

  const countSql = `
    SELECT COUNT(*)::INTEGER AS count
    FROM articles a
    INNER JOIN follows f ON f.following_id = a.author_id AND f.follower_id = $1
    WHERE a.deleted_at IS NULL
  `;

  const [articlesResult, countResult] = await Promise.all([
    query(getArticleSelectSql(filterSql), [userId, userId, limit, offset]),
    query(countSql, [userId])
  ]);

  return {
    articles: articlesResult.rows.map(mapArticle),
    articlesCount: countResult.rows[0].count
  };
}

async function findArticleBySlug(slug, viewerId = null) {
  const result = await query(
    getArticleSelectSql(`
      WHERE a.slug = $2 AND a.deleted_at IS NULL
      LIMIT 1
    `),
    [viewerId, slug]
  );

  return mapArticle(result.rows[0]);
}

async function findArticleRecordBySlug(slug) {
  const result = await query(
    `
      SELECT id, author_id, slug, title, description, body, created_at, updated_at
      FROM articles
      WHERE slug = $1 AND deleted_at IS NULL
      LIMIT 1
    `,
    [slug]
  );

  return result.rows[0] || null;
}

async function generateUniqueSlug(title, client = pool, excludeArticleId = null) {
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const params = [slug];
    let sql = 'SELECT 1 FROM articles WHERE slug = $1';

    if (excludeArticleId) {
      sql += ' AND id <> $2';
      params.push(excludeArticleId);
    }

    sql += ' LIMIT 1';

    const result = await client.query(sql, params);
    if (result.rowCount === 0) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

async function createArticle(client, { authorId, slug, title, description, body }) {
  const result = await client.query(
    `
      INSERT INTO articles (author_id, slug, title, description, body)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
    [authorId, slug, title, description, body]
  );

  return result.rows[0];
}

async function updateArticle(client, articleId, fields) {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return null;
  }

  const values = [];
  const assignments = entries.map(([key, value], index) => {
    values.push(value);
    return `${key} = $${index + 1}`;
  });

  assignments.push('updated_at = NOW()');
  values.push(articleId);

  const result = await client.query(
    `
      UPDATE articles
      SET ${assignments.join(', ')}
      WHERE id = $${values.length}
      RETURNING id
    `,
    values
  );

  return result.rows[0] || null;
}

async function softDeleteArticle(client, articleId, deletedBy) {
  const result = await client.query(
    `
      UPDATE articles
      SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
    `,
    [articleId, deletedBy]
  );

  return result.rowCount > 0;
}

async function ensureTags(client, tagList) {
  const normalizedTags = [...new Set(tagList.map((tag) => tag.trim()).filter(Boolean))];

  if (normalizedTags.length === 0) {
    return [];
  }

  await client.query(
    `
      INSERT INTO tags (name)
      SELECT UNNEST($1::text[])
      ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
    `,
    [normalizedTags]
  );

  const result = await client.query('SELECT id, name FROM tags WHERE name = ANY($1::text[])', [normalizedTags]);
  return result.rows;
}

async function setArticleTags(client, articleId, tagList, deletedBy = null) {
  const normalizedTags = [...new Set(tagList.map((tag) => tag.trim()).filter(Boolean))];
  const tags = await ensureTags(client, normalizedTags);
  const tagByName = tags.reduce((accumulator, tag) => {
    accumulator[tag.name] = tag;
    return accumulator;
  }, {});
  const orderedTags = normalizedTags.map((name, index) => ({
    name,
    position: index,
    id: tagByName[name] ? tagByName[name].id : null
  }));
  const tagIds = orderedTags.map((tag) => tag.id).filter((tagId) => tagId !== null);

  await client.query(
    `
      UPDATE article_tags
      SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
      WHERE article_id = $1
        AND deleted_at IS NULL
        AND (
          CARDINALITY($3::text[]) = 0
          OR tag <> ALL($3::text[])
        )
    `,
    [articleId, deletedBy, normalizedTags]
  );

  for (const tag of orderedTags) {
    await client.query(
      `
        INSERT INTO article_tags (article_id, tag_id, tag, position)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (article_id, tag_id)
        DO UPDATE SET tag = EXCLUDED.tag, position = EXCLUDED.position, deleted_at = NULL, deleted_by = NULL, updated_at = NOW()
      `,
      [articleId, tag.id, tag.name, tag.position]
    );
  }
}

async function favoriteArticle(client, articleId, userId) {
  await client.query(
    `
      INSERT INTO article_favorites (user_id, article_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, article_id)
      DO UPDATE SET deleted_at = NULL, deleted_by = NULL, updated_at = NOW()
    `,
    [userId, articleId]
  );
}

async function unfavoriteArticle(client, articleId, userId) {
  await client.query(
    `
      UPDATE article_favorites
      SET deleted_at = NOW(), deleted_by = $3, updated_at = NOW()
      WHERE user_id = $1 AND article_id = $2 AND deleted_at IS NULL
    `,
    [userId, articleId, userId]
  );
}

async function createComment(client, { articleId, authorId, body }) {
  const result = await client.query(
    `
      INSERT INTO comments (article_id, author_id, body)
      VALUES ($1, $2, $3)
      RETURNING id
    `,
    [articleId, authorId, body]
  );

  return result.rows[0];
}

async function listComments(articleId, viewerId = null) {
  const result = await query(
    `
      SELECT
        c.id,
        c.author_id,
        c.body,
        c.created_at,
        c.updated_at,
        u.username AS author_username,
        u.bio AS author_bio,
        u.image AS author_image,
        COALESCE(vf.following, FALSE) AS author_following
      FROM comments c
      INNER JOIN users u ON u.id = c.author_id
      LEFT JOIN LATERAL (
        SELECT TRUE AS following
        FROM follows f
        WHERE f.following_id = u.id AND f.follower_id = $2
        LIMIT 1
      ) vf ON TRUE
      WHERE c.article_id = $1 AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC, c.id ASC
    `,
    [articleId, viewerId]
  );

  return result.rows.map(mapComment);
}

async function findCommentById(commentId, viewerId = null) {
  const result = await query(
    `
      SELECT
        c.id,
        c.article_id,
        c.author_id,
        c.body,
        c.created_at,
        c.updated_at,
        u.username AS author_username,
        u.bio AS author_bio,
        u.image AS author_image,
        COALESCE(vf.following, FALSE) AS author_following
      FROM comments c
      INNER JOIN users u ON u.id = c.author_id
      LEFT JOIN LATERAL (
        SELECT TRUE AS following
        FROM follows f
        WHERE f.following_id = u.id AND f.follower_id = $2
        LIMIT 1
      ) vf ON TRUE
      WHERE c.id = $1 AND c.deleted_at IS NULL
      LIMIT 1
    `,
    [commentId, viewerId]
  );

  return mapComment(result.rows[0]);
}

async function findCommentRecordById(commentId) {
  const result = await query(
    `
      SELECT id, article_id, author_id, body
      FROM comments
      WHERE id = $1 AND deleted_at IS NULL
      LIMIT 1
    `,
    [commentId]
  );

  return result.rows[0] || null;
}

async function softDeleteComment(client, commentId, deletedBy) {
  const result = await client.query(
    `
      UPDATE comments
      SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
    `,
    [commentId, deletedBy]
  );

  return result.rowCount > 0;
}

async function listTags() {
  const result = await query(
    `
      SELECT DISTINCT COALESCE(t.name, at.tag) AS name
      FROM article_tags at
      LEFT JOIN tags t ON t.id = at.tag_id
      INNER JOIN articles a ON a.id = at.article_id AND a.deleted_at IS NULL
      WHERE at.deleted_at IS NULL
      ORDER BY name ASC
    `
  );

  return result.rows.map((row) => row.name);
}

module.exports = {
  createArticle,
  createComment,
  favoriteArticle,
  findArticleBySlug,
  findArticleRecordBySlug,
  findCommentById,
  findCommentRecordById,
  generateUniqueSlug,
  listArticles,
  listComments,
  listFeedArticles,
  listTags,
  pool,
  setArticleTags,
  softDeleteArticle,
  softDeleteComment,
  unfavoriteArticle,
  updateArticle
};