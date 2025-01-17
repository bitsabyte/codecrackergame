// Updated server.js with correct timer and session handling for game-over state
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.SESSION_SECRET || 'secretstuff!';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://your-frontend.com';

app.use(bodyParser.json());
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
}));

let adminPassword = '1234567890'; // Default admin password

// Generate a JWT token
function generateToken(username, attempts, startTime) {
    return jwt.sign({ username, attempts, startTime }, SECRET_KEY, { expiresIn: '10m' });
}

// Middleware to authenticate requests using JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(403).send({ message: 'Access denied. Token missing.' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).send({ message: 'Invalid token.' });
        req.user = user; // Attach user information to the request
        next();
    });
}

// Middleware to check remaining time
function checkTimer(req, res, next) {
    const currentTime = Date.now();
    const remainingTime = Math.max(0, 10 * 60 * 1000 - (currentTime - req.user.startTime));

    if (remainingTime === 0) {
        return res.status(403).send({ message: 'Time is up!', status: 'game-over', remainingTime: 0 });
    }

    req.remainingTime = remainingTime; // Pass the remaining time to subsequent handlers
    next();
}

// Login endpoint
app.post('/login', (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).send({ message: 'Username is required' });
    }

    const startTime = Date.now(); // Record login time
    const token = generateToken(username, 3, startTime);
    res.status(200).send({ message: `Welcome, ${username}!`, token });
});

// Guess endpoint
app.post('/guess', authenticateToken, checkTimer, (req, res) => {
    const { guess } = req.body;

    if (!req.user || !req.user.username) {
        return res.status(403).send({ message: 'Please log in first.' });
    }

    const result = adminPassword.split('').map((digit, index) => {
        if (guess[index] === digit) return 'green';
        return 'red';
    });

    const isSuccess = result.every((color) => color === 'green');

    if (isSuccess) {
        return res.status(200).send({
            message: 'Correct code!',
            status: 'success',
            remainingTime: Math.ceil(req.remainingTime / 1000),
            result,
        });
    }

    req.user.attempts -= 1;

    if (req.user.attempts <= 0) {
        return res.status(403).send({ message: 'No attempts left.', status: 'game-over', remainingTime: Math.ceil(req.remainingTime / 1000) });
    }

    const newToken = generateToken(req.user.username, req.user.attempts, req.user.startTime);

    res.status(200).send({
        result,
        attemptsLeft: req.user.attempts,
        status: 'in-progress',
        token: newToken,
        remainingTime: Math.ceil(req.remainingTime / 1000),
    });
});

// Status endpoint
app.get('/status', authenticateToken, checkTimer, (req, res) => {
    const status = req.user.attempts > 0 && req.remainingTime > 0 ? 'in-progress' : 'game-over';

    res.status(200).send({
        status,
        remainingTime: Math.ceil(req.remainingTime / 1000),
        attemptsLeft: req.user.attempts,
        message: 'Session is active',
    });
});

app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});
