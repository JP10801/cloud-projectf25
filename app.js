const express = require('express');
const path = require('path');
const logger = require('morgan');
const fileUpload = require('express-fileupload');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const fs = require('fs');
const mime = require('mime-types');

const indexRouter = require('./routes/index');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(fileUpload());

// sessions & passport
app.use(session({ secret: process.env.SESSION_SECRET || 'supersecret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// Passport local strategy using environment variables USERNAME and PASSWORD
passport.use(new LocalStrategy(function(username, password, done){
  if (username === process.env.USERNAME && password === process.env.PASSWORD){
    return done(null, { username: process.env.USERNAME });
  }
  return done(null, false, { message: 'Incorrect username or password' });
}));

passport.serializeUser(function(user, done){
  process.nextTick(function(){ done(null, user); });
});

passport.deserializeUser(function(user, done){
  process.nextTick(function(){ done(null, user); });
});

// Helper: load rules.json (create default if missing)
function loadRules(){
  const base = process.env.PERSISTENT_STORAGE_DIR || path.join(__dirname, 'storage');
  const rulesFile = path.join(base, 'rules.json');
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  if (!fs.existsSync(rulesFile)){
    const defaultRules = {
      mappings: {
        ".doc": "MS Word",
        ".docx": "MS Word",
        ".xls": "MS Excel",
        ".xlsx": "MS Excel",
        ".pdf": "PDF",
        ".mp3": "Audio",
        ".wav": "Audio",
        ".mp4": "Video",
        ".mov": "Video"
      },
      folders: ["MS Word","MS Excel","PDF","Audio","Video","Other"]
    };
    fs.writeFileSync(rulesFile, JSON.stringify(defaultRules, null, 2));
    return defaultRules;
  }
  return JSON.parse(fs.readFileSync(rulesFile));
}

// Save rules
function saveRules(rules){
  const base = process.env.PERSISTENT_STORAGE_DIR || path.join(__dirname, 'storage');
  const rulesFile = path.join(base, 'rules.json');
  fs.writeFileSync(rulesFile, JSON.stringify(rules, null, 2));
}

// Enhanced storage path: places files into folders by type (creates folder automatically)
function storagePathForFile(filename, mimetype){
  const base = process.env.PERSISTENT_STORAGE_DIR || path.join(__dirname, 'storage');
  const rules = loadRules();
  const ext = path.extname(filename).toLowerCase();
  let folder = rules.mappings[ext];

  // try fallback using mimetype (if ext mapping not present)
  if (!folder && mimetype){
    if (mimetype.startsWith('image/')) folder = 'Images';
    else if (mimetype.startsWith('audio/')) folder = 'Audio';
    else if (mimetype.startsWith('video/')) folder = 'Video';
    else folder = null;
  }

  if (!folder){
    folder = rules.mappings[ext] || (ext ? ext.replace('.', '').toUpperCase() : 'Other');
    if (!rules.folders.includes(folder)){
      rules.folders.push(folder);
      rules.mappings[ext] = folder;
      saveRules(rules);
    }
  }

  const folderPath = path.join(base, folder);
  if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
  const safeName = path.basename(filename);
  return path.join(folderPath, safeName);
}

// Expose helpers via app.locals so routes can use them
app.locals.loadRules = loadRules;
app.locals.saveRules = saveRules;
app.locals.storagePathForFile = storagePathForFile;

// routes
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', { message: err.message, error: (app.get('env') === 'development') ? err : {} });
});

module.exports = app;
