require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const createError = require('http-errors');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();


app.use(bodyParser.urlencoded({
  extended: true,
  limit: '10mb'
}));
app.use(bodyParser.json({
  limit: '10mb'
}));


const mongoDB = process.env.MONGODB_URI;

mongoose.connect(mongoDB, {
  dbName: 'zdravozivpodjetja',
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('[MongoDB] Connected to database:', mongoose.connection.name);
})
.catch(err => {
  console.error('[MongoDB] Connection error:', err);
  process.exit(1);
});


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: mongoDB,
    dbName: 'zdravozivpodjetja',
    collectionName: 'sessions'
  }),
  cookie: {
    httpOnly: true,
    sameSite: 'lax'
  }
}));


app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});


const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');

app.use(cors({
  credentials: true,
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (!allowedOrigins.includes(origin)) {
      return callback(
        new Error('The CORS policy does not allow access from this origin.'),
        false
      );
    }

    callback(null, true);
  }
}));


const userRoutes = require('./routes/UserRoutes');
const sensorDataRoutes = require('./routes/SensorDataRoutes');
const twoFactorRoutes = require('./routes/TwoFactorRoutes');
const streamRoutes = require('./routes/StreamRoutes');

app.use('/api/users', userRoutes);
app.use('/api/sensordata', sensorDataRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/stream', streamRoutes);



app.use((req, res, next) => {
  next(createError(404, 'Not Found'));
});


app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    message: err.message,
    error: req.app.get('env') === 'development' ? err : {}
  });
});

module.exports = app;
