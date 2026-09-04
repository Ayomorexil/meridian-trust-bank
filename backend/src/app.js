const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const AppError = require("./utils/AppError");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const accountRoutes = require("./routes/accountRoutes");
const transferRoutes = require("./routes/transferRoutes");
const creditRoutes = require("./routes/creditRoutes");
const investmentRoutes = require("./routes/investmentRoutes");
const billRoutes = require("./routes/billRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const chatRoutes = require("./routes/chatRoutes");

const app = express();
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*", credentials: true }));
app.use(express.json({ limit: "1mb" }));
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use("/api", apiLimiter);

app.get("/api/health", (req, res) =>
  res.status(200).json({ status: "ok", service: "meridian-trust-api" }),
);

app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/credit", creditRoutes);
app.use("/api/investments", investmentRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);

app.all("*", (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server.`, 404));
});

app.use(errorHandler);

module.exports = app;

// const express = require('express');
// const cors = require('cors');
// const helmet = require('helmet');
// const morgan = require('morgan');
// const rateLimit = require('express-rate-limit');

// const AppError = require('./utils/AppError');
// const errorHandler = require('./middleware/errorHandler');

// const authRoutes = require('./routes/authRoutes');
// const accountRoutes = require('./routes/accountRoutes');
// const transferRoutes = require('./routes/transferRoutes');
// const creditRoutes = require('./routes/creditRoutes');
// const investmentRoutes = require('./routes/investmentRoutes');
// const billRoutes = require('./routes/billRoutes');
// const adminRoutes = require('./routes/adminRoutes');

// const app = express();

// app.set('trust proxy', 1);

// app.use(helmet());
// app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*', credentials: true }));
// app.use(express.json({ limit: '1mb' }));
// if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
// app.use('/api', apiLimiter);

// app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', service: 'meridian-trust-api' }));

// app.use('/api/auth', authRoutes);
// app.use('/api/accounts', accountRoutes);
// app.use('/api/transfers', transferRoutes);
// app.use('/api/credit', creditRoutes);
// app.use('/api/investments', investmentRoutes);
// app.use('/api/bills', billRoutes);
// app.use('/api/admin', adminRoutes);

// app.get("/", (req, res) => {
//   res.json({
//     status: "success",
//     message: "Meridian Trust API is running"
//   });
// });
// app.all('*', (req, res, next) => {
//   next(new AppError(`Cannot find ${req.originalUrl} on this server.`, 404));
// });

// app.use(errorHandler);

// module.exports = app;
