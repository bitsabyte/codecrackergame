
// Updated server.js with JWT and attempt tracking
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.SESSION_SECRET || 'secretstuff!';

app.use(bodyParser.json());
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));

let adminPassword = '1234567890'; // Default admin password

// Generate a JWT token
function generateToken(username, attempts) {
    return jwt.sign({ username, attempts }, SECRET_KEY, { expiresIn: '1h' });
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

// Login endpoint
app.post('/login', (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).send({ message: 'Username is required' });
    }

    const token = generateToken(username, 3); // Start with 3 attempts
    res.status(200).send({
        message: `Welcome, ${username}!`,
        token,
    });
});

// Set password endpoint (admin only)
app.post('/set-password', authenticateToken, (req, res) => {
    const { password } = req.body;
    if (password && password.length === 10) {
        adminPassword = password;
        res.status(200).send({ message: 'Password set successfully' });
    } else {
        res.status(400).send({ message: 'Password must be 10 digits long' });
    }
});

// Guess endpoint
app.post('/guess', authenticateToken, (req, res) => {
    const { guess } = req.body;

    if (!req.user || !req.user.username) {
        return res.status(403).send({ message: 'Please log in first.' });
    }

    const remainingAttempts = req.user.attempts - 1;

    const result = adminPassword.split('').map((digit, index) => {
        if (guess[index] === digit) return 'green';
        return 'red';
    });

    const isSuccess = result.every((color) => color === 'green');

    if (isSuccess) {
        return res.status(200).send({ message: 'Correct code!', status: 'success', result });
    }

    if (remainingAttempts <= 0) {
        return res.status(403).send({ message: 'No attempts left.', status: 'game-over' });
    }

    const newToken = generateToken(req.user.username, remainingAttempts);
    res.status(200).send({
        result,
        attemptsLeft: remainingAttempts,
        status: 'in-progress',
        token: newToken, // Return updated token
    });
});

// Server status endpoint
app.get('/status', authenticateToken, (req, res) => {
    res.status(200).send({ status: 'in-progress', message: 'Session is active' });
});

app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});
