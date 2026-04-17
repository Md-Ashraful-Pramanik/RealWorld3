const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres'
});

function query(text, params) {
  return pool.query(text, params);
}

async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      bio TEXT DEFAULT NULL,
      image TEXT DEFAULT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50)');
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)');
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT');
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL');
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS image TEXT DEFAULT NULL');
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');

  await query(`
    CREATE TABLE IF NOT EXISTS follows (
      follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (follower_id, following_id),
      CHECK (follower_id <> following_id)
    )
  `);

  await query('ALTER TABLE follows ADD COLUMN IF NOT EXISTS follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE');
  await query('ALTER TABLE follows ADD COLUMN IF NOT EXISTS following_id INTEGER REFERENCES users(id) ON DELETE CASCADE');
  await query('ALTER TABLE follows ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');

  await query(`
    CREATE TABLE IF NOT EXISTS audits (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action VARCHAR(100) NOT NULL,
      method VARCHAR(10) NOT NULL,
      path TEXT NOT NULL,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query('ALTER TABLE audits ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE');
  await query('ALTER TABLE audits ADD COLUMN IF NOT EXISTS action VARCHAR(100)');
  await query('ALTER TABLE audits ADD COLUMN IF NOT EXISTS method VARCHAR(10)');
  await query('ALTER TABLE audits ADD COLUMN IF NOT EXISTS path TEXT');
  await query("ALTER TABLE audits ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb");
  await query('ALTER TABLE audits ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
  await query('ALTER TABLE audits ALTER COLUMN action TYPE VARCHAR(100)');
  await query('ALTER TABLE audits ALTER COLUMN method TYPE VARCHAR(10)');
  await query('ALTER TABLE audits ALTER COLUMN path TYPE TEXT');
  await query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'audits'
          AND column_name = 'status_code'
      ) THEN
        ALTER TABLE audits ALTER COLUMN status_code DROP NOT NULL;
      END IF;
    END
    $$;
  `);

  await query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(username)');
  await query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email)');
  await query('CREATE UNIQUE INDEX IF NOT EXISTS idx_follows_unique_pair ON follows(follower_id, following_id)');

  await query(`
    CREATE TABLE IF NOT EXISTS articles (
      id BIGSERIAL PRIMARY KEY,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slug VARCHAR(255) NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ DEFAULT NULL,
      deleted_by INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await query('ALTER TABLE articles ADD COLUMN IF NOT EXISTS author_id INTEGER REFERENCES users(id) ON DELETE CASCADE');
  await query('ALTER TABLE articles ADD COLUMN IF NOT EXISTS slug VARCHAR(255)');
  await query('ALTER TABLE articles ADD COLUMN IF NOT EXISTS title VARCHAR(255)');
  await query('ALTER TABLE articles ADD COLUMN IF NOT EXISTS description TEXT');
  await query('ALTER TABLE articles ADD COLUMN IF NOT EXISTS body TEXT');
  await query('ALTER TABLE articles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
  await query('ALTER TABLE articles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
  await query('ALTER TABLE articles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL');
  await query('ALTER TABLE articles ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL');

  await query(`
    CREATE TABLE IF NOT EXISTS tags (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query('ALTER TABLE tags ADD COLUMN IF NOT EXISTS name VARCHAR(100)');
  await query('ALTER TABLE tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
  await query('ALTER TABLE tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');

  await query(`
    CREATE TABLE IF NOT EXISTS article_tags (
      article_id BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      tag VARCHAR(100) NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ DEFAULT NULL,
      deleted_by INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
      PRIMARY KEY (article_id, tag_id)
    )
  `);

  await query('ALTER TABLE article_tags ADD COLUMN IF NOT EXISTS article_id BIGINT REFERENCES articles(id) ON DELETE CASCADE');
  await query('ALTER TABLE article_tags ADD COLUMN IF NOT EXISTS tag_id BIGINT REFERENCES tags(id) ON DELETE CASCADE');
  await query('ALTER TABLE article_tags ADD COLUMN IF NOT EXISTS tag VARCHAR(100)');
  await query('ALTER TABLE article_tags ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0');
  await query('ALTER TABLE article_tags ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
  await query('ALTER TABLE article_tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
  await query('ALTER TABLE article_tags ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL');
  await query('ALTER TABLE article_tags ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL');
  await query(`
    UPDATE article_tags at
    SET tag = COALESCE(at.tag, t.name)
    FROM tags t
    WHERE at.tag_id = t.id
      AND at.tag IS NULL
  `);
  await query('UPDATE article_tags SET position = 0 WHERE position IS NULL');

  await query(`
    CREATE TABLE IF NOT EXISTS article_favorites (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      article_id BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ DEFAULT NULL,
      deleted_by INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
      PRIMARY KEY (user_id, article_id)
    )
  `);

  await query('ALTER TABLE article_favorites ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE');
  await query('ALTER TABLE article_favorites ADD COLUMN IF NOT EXISTS article_id BIGINT REFERENCES articles(id) ON DELETE CASCADE');
  await query('ALTER TABLE article_favorites ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
  await query('ALTER TABLE article_favorites ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
  await query('ALTER TABLE article_favorites ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL');
  await query('ALTER TABLE article_favorites ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL');

  await query(`
    CREATE TABLE IF NOT EXISTS comments (
      id BIGSERIAL PRIMARY KEY,
      article_id BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ DEFAULT NULL,
      deleted_by INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await query('ALTER TABLE comments ADD COLUMN IF NOT EXISTS article_id BIGINT REFERENCES articles(id) ON DELETE CASCADE');
  await query('ALTER TABLE comments ADD COLUMN IF NOT EXISTS author_id INTEGER REFERENCES users(id) ON DELETE CASCADE');
  await query('ALTER TABLE comments ADD COLUMN IF NOT EXISTS body TEXT');
  await query('ALTER TABLE comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
  await query('ALTER TABLE comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
  await query('ALTER TABLE comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL');
  await query('ALTER TABLE comments ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL');

  await query('CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_slug_unique ON articles(slug)');
  await query('CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_name_unique ON tags(name)');
  await query(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_article_tags_unique_pair ON article_tags(article_id, tag_id)'
  );
  await query(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_article_favorites_unique_pair ON article_favorites(user_id, article_id)'
  );

  await query(
    'CREATE INDEX IF NOT EXISTS idx_articles_author_created ON articles(author_id, created_at DESC) WHERE deleted_at IS NULL'
  );
  await query(
    'CREATE INDEX IF NOT EXISTS idx_articles_slug_active ON articles(slug) WHERE deleted_at IS NULL'
  );
  await query(
    'CREATE INDEX IF NOT EXISTS idx_comments_article_created ON comments(article_id, created_at ASC) WHERE deleted_at IS NULL'
  );
  await query(
    'CREATE INDEX IF NOT EXISTS idx_article_favorites_article_active ON article_favorites(article_id) WHERE deleted_at IS NULL'
  );
  await query(
    'CREATE INDEX IF NOT EXISTS idx_article_favorites_user_active ON article_favorites(user_id) WHERE deleted_at IS NULL'
  );
  await query(
    'CREATE INDEX IF NOT EXISTS idx_article_tags_tag_active ON article_tags(tag_id) WHERE deleted_at IS NULL'
  );
}

module.exports = {
  pool,
  query,
  initDb
};