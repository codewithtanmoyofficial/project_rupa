require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const connectDB = require('./config/db');
const Permission = require('./models/Permission');
const User = require('./models/User');
const { DEFAULT_PERMISSIONS } = require('./utils/permissions');
const { notFound, errorHandler } = require('./middleware/error');
const { seedDatabase } = require('../seed');

const isProd = process.env.NODE_ENV === 'production';

// Development convenience: run without a .env file. Production must set real secrets.
if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  if (isProd) {
    console.error('Missing JWT_ACCESS_SECRET / JWT_REFRESH_SECRET. Set them in server/.env.');
    process.exit(1);
  }
  process.env.JWT_ACCESS_SECRET ||= 'dev-only-access-secret-change-me';
  process.env.JWT_REFRESH_SECRET ||= 'dev-only-refresh-secret-change-me';
  console.warn('! JWT secrets not set - using insecure development defaults (copy server/.env.example to server/.env).');
}

const app = express();
app.use(cors({ origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(','), credentials: true }));
app.use(express.json());
app.use(cookieParser());
if (!isProd) app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/students', require('./routes/student.routes'));
app.use('/api/teachers', require('./routes/teacher.routes'));
app.use('/api/courses', require('./routes/course.routes'));
app.use('/api/attendance', require('./routes/attendance.routes'));
app.use('/api/results', require('./routes/result.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api', require('./routes/role.routes')); // /api/roles, /api/permissions

// Serve the built React app (client/dist) so ONE server = whole app on http://localhost:5000
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
const hasClient = fs.existsSync(path.join(clientDist, 'index.html'));
if (hasClient) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(async () => {
    // make sure every role has a permission document (keeps existing edits)
    for (const [role, matrix] of Object.entries(DEFAULT_PERMISSIONS)) {
      await Permission.updateOne({ role }, { $setOnInsert: { role, matrix } }, { upsert: true });
    }
    // first run on an empty database -> load the demo data automatically (set AUTO_SEED=false to disable)
    if (process.env.AUTO_SEED !== 'false' && (await User.countDocuments()) === 0) {
      console.log('Empty database detected - loading demo data...');
      await seedDatabase();
    }
    const server = app.listen(PORT, () => {
      console.log(`\nAPI ready:  http://localhost:${PORT}/api/health`);
      console.log(hasClient ? `Open the app: http://localhost:${PORT}` : 'UI not built yet. Run "npm run build" (or "npm run dev" and open http://localhost:5173)');
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
        console.error(`\n✖ Port ${PORT} is ${err.code === 'EADDRINUSE' ? 'already in use' : 'blocked'}. Close the other program, or use another port:\n   create server/.env with  PORT=5050  and open http://localhost:5050`);
      } else {
        console.error(err);
      }
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error('Server not started:', err.message);
    process.exit(1);
  });
