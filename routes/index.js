const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const passport = require('passport');

// simple auth middleware for protecting routes
function isAuthenticated(req, res, next){
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.redirect('/login');
}

// render login page
router.get('/login', function(req, res){
  res.render('login');
});

// handle login
router.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), function(req,res){
  res.redirect('/');
});

// logout
router.post('/logout', function(req,res){
  req.logout(function(err){
    if (err) console.error(err);
    res.redirect('/login');
  });
});

// render index page (protected)
router.get('/', isAuthenticated, function(req, res, next){
  const rules = req.app.locals.loadRules();
  res.render('index', { title: 'File Drop', folders: rules.folders });
});

// Download static files by folder/filename (protected)
router.get('/:folder/:filename', isAuthenticated, function(req, res, next){
  const base = process.env.PERSISTENT_STORAGE_DIR || path.join(__dirname, '..', 'storage');
  const filepath = path.join(base, req.params.folder, req.params.filename);
  if (!fs.existsSync(filepath)) return res.sendStatus(404);
  // update access time
  fs.utimesSync(filepath, new Date(), new Date());
  return res.download(filepath);
});

// Delete (protected)
router.delete('/:folder/:filename', isAuthenticated, function(req, res){
  const base = process.env.PERSISTENT_STORAGE_DIR || path.join(__dirname, '..', 'storage');
  const filepath = path.join(base, req.params.folder, req.params.filename);
  fs.unlink(filepath, function(err){
    if (err) return res.sendStatus(500);
    return res.sendStatus(200);
  });
});

// API: list files with search & sort (protected)
router.get('/api/files', isAuthenticated, function(req, res){
  const base = process.env.PERSISTENT_STORAGE_DIR || path.join(__dirname, '..', 'storage');
  const folder = req.query.folder || null;
  const search = req.query.search || null;
  const sort = req.query.sort || 'name'; // name, created, accessed, size

  const target = folder ? path.join(base, folder) : base;
  if (!fs.existsSync(target)) return res.json({ files: [] });

  let files = [];
  if (folder){
    const names = fs.readdirSync(target);
    names.forEach(name => {
      const fpath = path.join(target, name);
      if (fs.statSync(fpath).isFile()){
        const stats = fs.statSync(fpath);
        files.push({ name, folder, size: stats.size, created: stats.birthtimeMs, accessed: stats.atimeMs });
      }
    });
  } else {
    const folders = fs.readdirSync(base);
    folders.forEach(f => {
      const folderPath = path.join(base, f);
      if (fs.statSync(folderPath).isDirectory()){
        const names = fs.readdirSync(folderPath);
        names.forEach(name => {
          const fpath = path.join(folderPath, name);
          if (fs.statSync(fpath).isFile()){
            const stats = fs.statSync(fpath);
            files.push({ name, folder: f, size: stats.size, created: stats.birthtimeMs, accessed: stats.atimeMs });
          }
        });
      }
    });
  }

  if (search){
    const s = search.toLowerCase();
    files = files.filter(f => f.name.toLowerCase().includes(s));
  }

  files.sort((a,b) => {
    switch(sort){
      case 'size': return a.size - b.size;
      case 'created': return a.created - b.created;
      case 'accessed': return a.accessed - b.accessed;
      default: return a.name.localeCompare(b.name);
    }
  });

  res.json({ files });
});

// create folder (protected)
router.post('/api/folders', isAuthenticated, function(req, res){
  const base = process.env.PERSISTENT_STORAGE_DIR || path.join(__dirname, '..', 'storage');
  const folderName = req.body.name;
  if (!folderName) return res.status(400).json({ error: 'Missing folder name' });
  const folderPath = path.join(base, folderName);
  if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

  const rules = req.app.locals.loadRules();
  if (!rules.folders.includes(folderName)){
    rules.folders.push(folderName);
    req.app.locals.saveRules(rules);
  }

  res.json({ ok: true });
});

// add rule (ext -> folder) (protected)
router.post('/api/rules', isAuthenticated, function(req, res){
  const ext = (req.body.ext || '').toLowerCase();
  const folder = req.body.folder;
  if (!ext || !folder) return res.status(400).json({ error: 'Missing ext or folder' });
  const rules = req.app.locals.loadRules();
  rules.mappings[ext] = folder;
  if (!rules.folders.includes(folder)) rules.folders.push(folder);
  req.app.locals.saveRules(rules);
  res.json({ ok: true });
});

// upload endpoint (protected) — supports multiple files
router.post('/upload', isAuthenticated, function(req, res){
  if (!req.files) return res.status(400).send('No files uploaded');
  const files = Array.isArray(req.files.newFile) ? req.files.newFile : [req.files.newFile];
  const results = [];
  files.forEach(f => {
    const dest = req.app.locals.storagePathForFile(f.name, f.mimetype);
    try {
      f.mv(dest);
      results.push({ name: f.name, ok: true });
    } catch(err){
      results.push({ name: f.name, ok: false, error: err.message });
    }
  });
  res.json({ results });
});

module.exports = router;
