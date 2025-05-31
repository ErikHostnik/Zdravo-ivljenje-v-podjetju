const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const createError = require('http-errors');
const bodyParser = require('body-parser');

const app = express();


// Routers
const userRoutes = require('./routes/UserRoutes');
const sensorDataRoutes = require('./routes/SensorDataRoutes');
const twoFactorRoutes = require('./routes/TwoFactorRoutes');

app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));

// MongoDB connection URI
const mongoDB = 'mongodb+srv://root:hojladrijadrom@zdravozivpodjetja.1hunr7p.mongodb.net/zdravozivpodjetja?retryWrites=true&w=majority&appName=ZdravoZivPodjetja';

// Connect to MongoDB
mongoose.connect(mongoDB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
}).catch(err => console.log(err));

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
  secret: 'shhhh-secret',
  resave: true,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: mongoDB })
}));

// Set session to response locals
app.use(function (req, res, next) {
  res.locals.session = req.session;
  next();
});


var cors = require('cors');
var allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://192.168.0.11:3001', 'http://192.168.0.11:3000','http://192.168.0.40:3001','http://192.168.0.40:3001'];
app.use(cors({
  credentials: true,
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      var msg = "The CORS policy does not allow access from the specified Origin.";
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));



// Use routers
app.use('/api/users', userRoutes);
app.use('/api/sensordata', sensorDataRoutes);
app.use('/api/2fa', twoFactorRoutes);

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404, 'Not Found'));
});

// Error handler - return JSON, not HTML
app.use(function (err, req, res, next) {
  res.status(err.status || 500).json({
    message: err.message,
    error: req.app.get('env') === 'development' ? err : {}
  });
});

module.exports = app;
