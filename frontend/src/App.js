// Updated App.js with alphanumeric input protection for login and digit input fixes
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
    const [errorMessage, setErrorMessage] = useState('');

    const calculateProgress = (time) => {
        const totalTime = 600; // Total timer duration in seconds (10 minutes)
        const percentage = Math.max(0, (time / totalTime) * 100);
        return percentage;
    };

    const getProgressColor = (percentage) => {
        if (percentage > 50) return 'green';
        if (percentage > 20) return 'orange';
        return 'red';
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

    useEffect(() => {
        if (status === 'in-progress') {
            const interval = setInterval(() => {
                axios.get(`${BACKEND_URL}/status`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                    .then((res) => {
                        setRemainingTime(res.data.remainingTime || 0);
                        setAttemptsLeft(res.data.attemptsLeft || 0);

                        if (res.data.remainingTime <= 0 || res.data.status === 'game-over') {
                            setStatus('game-over');
                            clearInterval(interval);
                        }
                    })
                    .catch(() => {
                        clearInterval(interval);
                        setStatus('not-logged-in');
                        localStorage.removeItem('token');
                    });
            }, 5000);

            return () => clearInterval(interval);
        }
    }, [status, token]);

    const handleUsernameChange = (e) => {
        const value = e.target.value;
        if (/^[a-zA-Z0-9]*$/.test(value)) { // Only allow alphanumeric characters
            setUsername(value);
            setErrorMessage(''); // Clear error if valid input
        } else {
            setErrorMessage('Only alphanumeric characters are allowed.');
        }
    };

    const handleLogin = () => {
        if (!username) {
            setErrorMessage('Username is required');
            return;
        }

        axios.post(`${BACKEND_URL}/login`, { username })
            .then((res) => {
                setToken(res.data.token);
                setStatus('in-progress');
                setAttemptsLeft(res.data.attemptsLeft);
                setRemainingTime(600); // Initialize timer on login
                localStorage.setItem('token', res.data.token);
                setGuess(Array(10).fill('')); // Clear guess input on new login
                setFeedback([]); // Clear feedback
                setErrorMessage(''); // Clear error message
            });
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
            });
    };

    const handleLogout = () => {
        setToken(null);
        setStatus('not-logged-in');
        localStorage.removeItem('token');
    };

    const handleDigitInput = (e, index) => {
        const value = e.target.value;
        if (/^\d?$/.test(value)) { // Allow only single numeric characters or empty input
            const newGuess = [...guess];
            newGuess[index] = value;
            setGuess(newGuess);
            // Automatically focus on the next input
            if (value !== '' && index < 9) {
                document.getElementById(`digit-${index + 1}`).focus();
            }
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
                flexDirection: 'column',
                position: 'relative',
            }}
        >
            {status === 'not-logged-in' && (
                <div className="login-container">
                    <h1>Code Cracker Game</h1>
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={handleUsernameChange}
                        style={{
                            borderRadius: '4px',
                            padding: '10px',
                            marginBottom: '10px',
                        }}
                    />
                    {errorMessage && <div className="error-message">{errorMessage}</div>}
                    <button onClick={handleLogin} style={{
                        borderRadius: '20px',
                        padding: '10px 20px',
                        margin: '10px',
                        cursor: 'pointer',
                    }}>Login</button>
                </div>
            )}

            {status === 'game-over' && (
                <h1>Game Over - You failed to find the code in 3 attempts or the time ran out</h1>
            )}
            {status === 'success' && (
                <h1 className="success">Congratulations! You cracked the code with {Math.floor(remainingTime / 60)}:{String(remainingTime % 60).padStart(2, '0')} left!</h1>
            )}
            {status === 'in-progress' && (
                <div className="game-container">
                    <div className="attempts">Attempts Left: {attemptsLeft}</div>
                    <div className="timer-bar" style={{
                        width: '80%',
                        height: '20px',
                        backgroundColor: '#ddd',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        margin: '10px auto',
                    }}>
                        <div style={{
                            width: `${calculateProgress(remainingTime)}%`,
                            height: '100%',
                            backgroundColor: getProgressColor(calculateProgress(remainingTime)),
                            transition: 'width 1s ease, background-color 1s ease',
                        }}></div>
                    </div>
                    <div className="code-entry">
                        {guess.map((digit, index) => (
                            <input
                                key={index}
                                id={`digit-${index}`}
                                maxLength="1"
                                value={digit}
                                onChange={(e) => handleDigitInput(e, index)}
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                    border: '1px solid rgba(0, 0, 0, 0.1)',
                                    borderRadius: '4px',
                                    width: '40px',
                                    height: '40px',
                                    fontSize: '20px',
                                    textAlign: 'center',
                                    margin: '5px',
                                }}
                            />
                        ))}
                        <button onClick={handleSubmit} style={{
                            borderRadius: '20px',
                            padding: '10px 20px',
                            marginTop: '20px',
                            cursor: 'pointer',
                        }}>🗝</button>
                    </div>
                    <button className="logout" onClick={handleLogout} style={{
                        borderRadius: '20px',
                        padding: '10px 20px',
                        position: 'absolute',
                        bottom: '20px',
                        cursor: 'pointer',
                    }}>Logout</button>
                </div>
            )}
        </div>
    );
};

export default App;
