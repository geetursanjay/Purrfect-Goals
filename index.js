  const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ Serve the frontend from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Serve index.html on root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ MySQL DB connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'grs*mysql', // ⬅ Replace this!
  database: 'purrfect_goals'
});

db.connect(err => {
  if (err) {
    console.error('DB connection failed:', err);
  } else {
    console.log('Connected to MySQL database!');
  }
});

// ✅ POST: Register
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
  db.query(sql, [username, password], (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(400).send('Username already exists');
      return res.status(500).send('Database error');
    }
    res.send('Registered successfully');
  });
});

// ✅ POST: Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
  db.query(sql, [username, password], (err, result) => {
    if (err) return res.status(500).send('Database error');
    if (result.length > 0) {
      res.send('Login successful');
    } else {
      res.status(401).send('Invalid credentials');
    }
  });
});

  
  app.post('/save-profile', (req, res) => {
    const { username, name, age, gender } = req.body;
  
    const sql = 'INSERT INTO profiles (username, name, age, gender) VALUES (?, ?, ?, ?)';
    db.query(sql, [username, name, age, gender], (err, result) => {
      if (err) {
        console.error('Error saving profile:', err);
        return res.status(500).send('Failed to save profile');
      }
      res.send('Profile saved successfully');
    });
  });
  // ✅ POST: Update Step & Get Badge
app.post('/update-step', (req, res) => {
  const { stepId, goalId } = req.body;

  // 1. Mark step as completed
  const updateStepSQL = 'UPDATE steps SET is_completed = TRUE WHERE step_id = ?';

  db.query(updateStepSQL, [stepId], (err) => {
    if (err) return res.status(500).send('Error updating step');

    // 2. Get total and completed steps
    const totalSQL = 'SELECT COUNT(*) AS total FROM steps WHERE goal_id = ?';
    const doneSQL = 'SELECT COUNT(*) AS completed FROM steps WHERE goal_id = ? AND is_completed = TRUE';

    db.query(totalSQL, [goalId], (err, totalResult) => {
      if (err) return res.status(500).send('Error counting total steps');

      db.query(doneSQL, [goalId], (err, doneResult) => {
        if (err) return res.status(500).send('Error counting completed steps');

        const total = totalResult[0].total;
        const done = doneResult[0].completed;
        const percentage = (done / total) * 100;

        // 3. Determine badge
        let badge = '';
        if (percentage === 25) badge = '🐱 Cat';
        else if (percentage === 50) badge = '🐆 Leopard';
        else if (percentage === 75) badge = '🐈‍⬛ Panther';
        else if (percentage === 100) badge = '🦁 Lion';

        // 4. Send response
        res.json({ success: true, percentage, badge });
      });
    });
  });
});

// ✅ GET: Fetch user ID using username (used in dashboard)
app.get('/get-user-id', (req, res) => {
  const { username } = req.query;
  const sql = 'SELECT id FROM users WHERE username = ?';
  db.query(sql, [username], (err, result) => {
    if (err || result.length === 0) return res.status(404).send('User not found');
    res.json({ userId: result[0].id });
  });
});

// ✅ POST: Create Goal
app.post('/create-goal', (req, res) => {
  const { userId, goalName } = req.body;

  console.log("📥 Received goal:", userId, goalName);

  const sql = 'INSERT INTO goals (user_id, goal_name) VALUES (?, ?)';
  db.query(sql, [userId, goalName], (err, result) => {
    if (err) {
      console.error('❌ MySQL Error:', err);
      return res.status(500).send('Error saving goal');
    }
    res.json({ goalId: result.insertId });
  });
});

// ✅ POST: Add Step
app.post('/add-step', (req, res) => {
  const { goalId, stepName } = req.body;

  const sql = 'INSERT INTO steps (goal_id, step_name, is_completed) VALUES (?, ?, FALSE)';
  db.query(sql, [goalId, stepName], (err, result) => {
    if (err) {
      console.error('❌ Error saving step:', err);  // <- you'll see the real issue in console
      return res.status(500).send('Error saving step');
    }
    res.json({ stepId: result.insertId });
  });
});


app.listen(3000, () => {
  console.log('Server is running at http://localhost:3000');
});
