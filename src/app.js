require('dotenv').config({
  path: process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.local'
});

// Nonaktifkan email job worker di dev jika DISABLE_QUEUE=true
if (process.env.DISABLE_QUEUE !== 'true') {
  require('./jobs/email.job');
} else {
  console.log('[DEV] Email job worker dinonaktifkan');
}

const express = require('express');

const app = express();

// ================= MIDDLEWARE =================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
const { errorHandler } = require('./middlewares/error.middleware');


// ================= ROUTES =================
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const documentRoutes = require('./routes/document.routes');
const scheduleRoutes = require('./routes/schedule.routes');
const dosenRoutes = require('./routes/dosen.routes');
const adminRoutes = require('./routes/admin.routes');

app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/document', documentRoutes);
app.use('/schedule', scheduleRoutes);
app.use('/dosen', dosenRoutes);
app.use('/admin', adminRoutes);

// ================= ERROR HANDLER =================
app.use(errorHandler);

// ================= START SERVER =================
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});