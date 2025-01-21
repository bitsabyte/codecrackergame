const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.SESSION_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL;
const PASSWORD = (process.env.ADMIN_PASSWORD).toUpperCase(); // Convert to uppercase

app.use(bodyParser.json());
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
}));

let activeSessions = {}; // Store active session data (token, attempts, timer)

function generateToken(username, attempts, startTime) {
    return jwt.sign({ username, attempts, startTime }, SECRET_KEY, { expiresIn: '10m' });
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(403).send({ message: 'Access denied. Token missing.' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).send({ message: 'Invalid token.' });
        req.user = user;
        next();
    });
}

// Login endpoint
app.post('/login', (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).send({ message: 'Username is required.' });
    }

    const startTime = Date.now();
    const token = generateToken(username, 3, startTime); // 3 attempts

    res.status(200).send({ token });
});

// Guess endpoint
app.post('/guess', authenticateToken, (req, res) => {
    const { guess } = req.body;

    if (!req.user || !req.user.username) {
        return res.status(403).send({ message: 'Please log in first.' });
    }

    if (!Array.isArray(guess) || guess.length !== 10) {
        return res.status(400).send({ message: 'Invalid guess format.' });
    }

    const normalizedGuess = guess.map((char) => char.toUpperCase()); // Convert guess to uppercase
    const result = PASSWORD.split('').map((digit, index) => {
        if (normalizedGuess[index] === digit) return 'green';
        return 'red';
    });

    const isCorrect = result.every((color) => color === 'green');

    const remainingTime = Math.max(
        0,
        10 * 60 * 1000 - (Date.now() - req.user.startTime)
    ) / 1000; // Remaining time in seconds

    if (isCorrect) {
        return res.status(200).send({
            message: 'Correct code!',
            status: 'success',
            remainingTime: Math.ceil(remainingTime), // Include remaining time in response
            result,
        });
    }

    req.user.attempts -= 1;

    if (req.user.attempts <= 0) {
        return res.status(403).send({ message: 'No attempts left.', status: 'game-over' });
    }

    const newToken = generateToken(req.user.username, req.user.attempts, req.user.startTime);

    res.status(200).send({
        result,
        attemptsLeft: req.user.attempts,
        status: 'in-progress',
        token: newToken,
    });
});

// Status endpoint
app.get('/status', authenticateToken, (req, res) => {
    res.status(200).send({
        status: req.user.attempts > 0 ? 'in-progress' : 'game-over',
        attemptsLeft: req.user.attempts,
        remainingTime: Math.max(0, (10 * 60 * 1000 - (Date.now() - req.user.startTime)) / 1000), // Remaining time in seconds
    });
});

app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});
