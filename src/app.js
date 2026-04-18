require('dotenv').config({
  path: process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.local'
});

if (process.env.DISABLE_QUEUE !== 'true') {
  require('./jobs/email.job');
} else {
  console.log('📭 [DEV MODE] Email job worker dinonaktifkan (DISABLE_QUEUE=true)');
}

const express = require('express');

const app = express();
app.set('trust proxy', 1);

// ================= MIDDLEWARE =================
app.use(express.json());
const { errorHandler } = require('./middlewares/error.middleware');

// ================= ROUTES =================
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const documentRoutes = require('./routes/document.routes');
const scheduleRoutes = require('./routes/schedule.routes');

app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/document', documentRoutes);
app.use('/schedule', scheduleRoutes);

// ================= ERROR HANDLER =================
app.use(errorHandler);

// ================= START SERVER =================
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
