import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = "https://codecrackergamebackend.onrender.com";

const App = () => {
    const [username, setUsername] = useState('');
    const [guess, setGuess] = useState(Array(10).fill(''));
    const [feedback, setFeedback] = useState([]);
    const [status, setStatus] = useState('not-logged-in');
    const [attemptsLeft, setAttemptsLeft] = useState(3);
    const [token, setToken] = useState(null);
    const [remainingTime, setRemainingTime] = useState(0);

    const formatTime = (timeInSeconds) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = timeInSeconds % 60;
        return `${minutes} : ${seconds.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        if (savedToken) {
            setToken(savedToken);
            axios.get(`${BACKEND_URL}/status`, {
                headers: { Authorization: `Bearer ${savedToken}` },
            })
                .then((res) => {
                    setStatus(res.data.status);
                    setRemainingTime(res.data.remainingTime || 0);
                    setAttemptsLeft(res.data.attemptsLeft || 3); // Fetch actual attempts
                })
                .catch(() => {
                    setStatus('not-logged-in');
                    localStorage.removeItem('token');
                });
        }
    }, []);

    const handleLogin = () => {
        axios.post(`${BACKEND_URL}/login`, { username })
            .then((res) => {
                setToken(res.data.token);
                setStatus('in-progress');
                setAttemptsLeft(res.data.attemptsLeft);
                setRemainingTime(600); // Initialize timer on login
                localStorage.setItem('token', res.data.token);
                setGuess(Array(10).fill('')); // Clear guess input on new login
                setFeedback([]); // Clear feedback
            })
            .catch((err) => alert(err.response.data.message));
    };

    const handleSubmit = () => {
        axios.post(`${BACKEND_URL}/guess`, { guess }, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                if (res.data.status === 'success') {
                    setStatus('success');
                    setRemainingTime(res.data.remainingTime || 0);
                    localStorage.removeItem('token'); // Clear token for next player
                    setGuess(Array(10).fill('')); // Clear guess input
                } else if (res.data.status === 'game-over') {
                    setStatus('game-over');
                    setRemainingTime(0);
                } else {
                    setFeedback(res.data.result);
                    setAttemptsLeft(res.data.attemptsLeft);
                    setToken(res.data.token);
                    setRemainingTime(res.data.remainingTime || remainingTime);
                    localStorage.setItem('token', res.data.token);
                }
            })
            .catch((err) => alert(err.response.data.message));
    };

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to log out?")) {
            setToken(null);
            setStatus('not-logged-in');
            localStorage.removeItem('token');
        }
    };

    return (
        <div
            className="app-container"
            style={{
                backgroundColor: status === 'game-over' ? 'red' : '#b5c7a3',
                color: status === 'game-over' ? 'white' : 'inherit',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                textAlign: 'center',
            }}
        >
            {status === 'not-logged-in' && (
                <div className="login-container">
                    <h1>Code Cracker Game</h1>
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <button onClick={handleLogin}>Login</button>
                </div>
            )}

            {status === 'game-over' && (
                <h1>Game Over - You failed to find the code in 3 attempts or the time ran out</h1>
            )}
            {status === 'success' && (
                <h1 className="success">Congratulations! You cracked the code with {formatTime(remainingTime)} left!</h1>
            )}
            {status === 'in-progress' && (
                <div className="game-container">
                    <div className="attempts">Attempts Left: {attemptsLeft}</div>
                    <div className="timer" style={{ fontWeight: 'bold', fontSize: '24px' }}>Time Remaining: {formatTime(remainingTime)}</div>
                    <div className="code-entry">
                        {guess.map((digit, index) => (
                            <input
                                key={index}
                                maxLength="1"
                                value={digit}
                                onChange={(e) => {
                                    const newGuess = [...guess];
                                    newGuess[index] = e.target.value;
                                    setGuess(newGuess);
                                }}
                                style={{
                                    backgroundColor: feedback[index] === 'green' ? 'lightgreen' : feedback[index] === 'red' ? 'lightcoral' : 'white',
                                }}
                            />
                        ))}
                        <button onClick={handleSubmit}>Submit</button>
                    </div>
                    <button className="logout" onClick={handleLogout}>Logout</button>
                </div>
            )}
        </div>
    );
};

export default App;
