const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json());
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'defaultsecret',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 600000 },
    })
);

let adminPassword = '1234567890';

app.post('/set-password', (req, res) => {
    const { password } = req.body;
    if (password && password.length === 10) {
        adminPassword = password;
        res.status(200).send({ message: 'Password set successfully' });
    } else {
        res.status(400).send({ message: 'Password must be 10 digits long' });
    }
});

app.post('/login', (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).send({ message: 'Username is required' });
    }

    req.session.username = username;
    if (!req.session.attempts) {
        req.session.attempts = 3;
    }

    res.status(200).send({
        message: `Welcome, ${username}!`,
        attemptsLeft: req.session.attempts,
    });
});

app.post('/guess', (req, res) => {
    const { guess } = req.body;

    if (!req.session.username) {
        return res.status(403).send({ message: 'Please log in first.' });
    }

    if (req.session.attempts <= 0) {
        return res.status(403).send({ message: 'No attempts left.', status: 'game-over' });
    }

    req.session.attempts--;

    const result = adminPassword.split('').map((digit, index) => {
        if (guess[index] === digit) return 'green';
        return 'red';
    });

    const isSuccess = result.every((color) => color === 'green');

    if (isSuccess) {
        req.session.isWinner = true;
        return res.status(200).send({ message: 'Correct code!', status: 'success', result });
    }

    if (req.session.attempts <= 0) {
        return res.status(403).send({ message: 'No attempts left.', status: 'game-over' });
    }

    res.status(200).send({ result, attemptsLeft: req.session.attempts, status: 'in-progress' });
});

app.get('/status', (req, res) => {
    if (!req.session.username) {
        return res.status(403).send({ status: 'not-logged-in' });
    }
    if (req.session.isWinner) {
        return res.status(200).send({ status: 'success' });
    }
    if (req.session.attempts <= 0) {
        return res.status(200).send({ status: 'game-over' });
    }
    res.status(200).send({ status: 'in-progress', attemptsLeft: req.session.attempts });
});

app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});
