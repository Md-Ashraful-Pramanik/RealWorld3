require('dotenv').config();

const cors = require('cors');
const express = require('express');

const { initDb } = require('./config/db');
const articleRoutes = require('./routes/articleRoutes');
const auditRoutes = require('./routes/auditRoutes');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

app.get('/hello', (req, res) => {
  res.send('hello world');
});

app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', profileRoutes);
app.use('/api', articleRoutes);
app.use('/api', auditRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'not found' });
});

app.use((err, req, res, next) => {
  console.error(err);

  if (err.code === '23505') {
    return res.status(422).json({
      errors: {
        body: [err.detail || 'resource already exists']
      }
    });
  }

  const statusCode = err.statusCode || 500;
  const errors = err.details || {
    body: [statusCode === 500 ? 'internal server error' : err.message]
  };

  return res.status(statusCode).json({ errors });
});

async function startServer() {
  await initDb();

  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });
}

module.exports = {
  app,
  startServer
};