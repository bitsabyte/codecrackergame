import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = "https://codecrackergamebackend.onrender.com";

const App = () => {
    const [username, setUsername] = useState('');
    const [guess, setGuess] = useState(Array(10).fill(''));
    const [feedback, setFeedback] = useState(Array(10).fill(''));
    const [status, setStatus] = useState('not-logged-in');
    const [attemptsLeft, setAttemptsLeft] = useState(3);
    const [token, setToken] = useState(null);
    const [remainingTime, setRemainingTime] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');

    const calculateProgress = (time) => {
        const totalTime = 600; // Total timer duration in seconds (10 minutes)
        return Math.max(0, (time / totalTime) * 100); // Calculate percentage
    };

    const getProgressBarClass = (percentage) => {
        if (percentage < 20) return 'low'; // Red for low time
        if (percentage < 50) return 'medium'; // Orange for medium time
        return ''; // Green for high time
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
                    setAttemptsLeft(res.data.attemptsLeft || 3);
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

                        if (res.data.status === 'game-over') {
                            setStatus('game-over');
                            clearInterval(interval);
                            localStorage.removeItem('token'); // End session
                        }
                    })
                    .catch((err) => {
                        clearInterval(interval);
                        if (err.response && err.response.status === 403 && err.response.data.status === 'game-over') {
                            setStatus('game-over');
                            localStorage.removeItem('token'); // End session
                        } else {
                            setStatus('not-logged-in');
                            localStorage.removeItem('token');
                        }
                    });
            }, 5000);

            return () => clearInterval(interval);
        }
    }, [status, token]);

    const handleUsernameChange = (e) => {
		const value = e.target.value;
		if (/^[a-zA-Z0-9 ]*$/.test(value)) {
			setUsername(value);
			setErrorMessage('');
		} else {
			setErrorMessage('Only alphanumeric characters and spaces are allowed.');
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
                setFeedback(Array(10).fill('')); // Clear feedback
                setErrorMessage('');
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
                    localStorage.removeItem('token');
                    setGuess(Array(10).fill(''));
                    setFeedback(Array(10).fill('green'));
                } else if (res.data.status === 'game-over') {
                    setStatus('game-over');
                    setRemainingTime(0);
                    localStorage.removeItem('token'); // End session
                } else {
                    setFeedback(res.data.result); // Update feedback for digit correctness
                    setAttemptsLeft(res.data.attemptsLeft);
                    setToken(res.data.token);
                    setRemainingTime(res.data.remainingTime || remainingTime);
                    localStorage.setItem('token', res.data.token);
                }
            })
            .catch((err) => {
                if (err.response && err.response.status === 403 && err.response.data.status === 'game-over') {
                    setStatus('game-over');
                    setRemainingTime(0);
                    localStorage.removeItem('token'); // End session
                } else {
                    console.error('Unexpected error:', err);
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
        if (/^[a-zA-Z0-9]?$/.test(value)) { // Allow alphanumeric characters and empty input
            const newGuess = [...guess];
            newGuess[index] = value.toUpperCase(); // Convert to uppercase
            setGuess(newGuess);
            if (value !== '' && index < 9) {
                const nextInput = document.getElementById(`digit-${index + 1}`);
                if (nextInput) {
                    nextInput.focus();
                    nextInput.select(); // Select the text for easy overwrite
                }
            }
        }
    };

    return (
        <div className={`app-container ${status === 'game-over' ? 'game-over' : 'in-progress'}`}>
            {status === 'in-progress' && (
                <div className="timer-bar-container">
                    <div
                        className={`timer-bar ${getProgressBarClass(calculateProgress(remainingTime))}`}
                        style={{ width: `${calculateProgress(remainingTime)}%` }}
                    ></div>
                </div>
            )}

            {status === 'not-logged-in' && (
                <div className="login-container">
					<h1>Find the Campaign</h1>
					<input
						type="text"
						placeholder="Super hero team name"
						value={username}
						onChange={handleUsernameChange}
					/>
					<button onClick={handleLogin}>
						Start Deciphering
					</button>
					{errorMessage && <div className="error-message">{errorMessage}</div>}
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
                    <div className="code-entry">
                        {guess.map((digit, index) => (
                            <input
                                key={index}
                                id={`digit-${index}`}
                                maxLength="1"
                                value={digit}
                                onChange={(e) => handleDigitInput(e, index)}
                                className={feedback[index] === 'green' ? 'correct' : feedback[index] === 'red' ? 'incorrect' : ''}
                                onFocus={(e) => e.target.select()} // Auto-select text
                            />
                        ))}
                        <button onClick={handleSubmit}>🗝</button>
                    </div>
                    <button className="logout" onClick={handleLogout}>Logout</button>
                </div>
            )}
        </div>
    );
};

export default App;
