// ✅ FIX: path dotenv sebelumnya terbalik — local load production, production load local
require('dotenv').config({
  path: process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.local'
});

// ✅ FIX: Jalankan worker email di proses yang sama agar queue langsung diproses
// (sebelumnya worker harus dijalankan manual dengan `npm run worker`)
require('./jobs/email.job');
const express = require('express');
const multer = require('multer');

const app = express();

// ================= MIDDLEWARE =================
app.use(express.json());
const { errorHandler } = require('./middlewares/error.middleware');


// ================= ROUTES =================
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const documentRoutes = require('./routes/document.routes');

app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/document', documentRoutes);

// ================= ERROR HANDLER =================
app.use(errorHandler);

// ================= START SERVER =================
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});