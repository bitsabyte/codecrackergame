// Updated App.js with persistent JWT storage and layout
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import backgroundImage from './assets/vault_background.webp';

const BACKEND_URL = "https://codecrackergamebackend.onrender.com";

const App = () => {
    const [username, setUsername] = useState('');
    const [guess, setGuess] = useState(Array(10).fill(''));
    const [feedback, setFeedback] = useState([]);
    const [status, setStatus] = useState('not-logged-in');
    const [attemptsLeft, setAttemptsLeft] = useState(3);
    const [token, setToken] = useState(null);

    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        if (savedToken) {
            setToken(savedToken);
            axios.get(`${BACKEND_URL}/status`, {
                headers: { Authorization: `Bearer ${savedToken}` },
            })
                .then((res) => setStatus(res.data.status))
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
                localStorage.setItem('token', res.data.token);
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
                } else if (res.data.status === 'game-over') {
                    setStatus('game-over');
                } else {
                    setFeedback(res.data.result);
                    setAttemptsLeft(res.data.attemptsLeft);
                    setToken(res.data.token);
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
        <div className="app-container" style={{ backgroundImage: `url(${backgroundImage})` }}>
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

            {status === 'game-over' && <h1 className="game-over">Game Over</h1>}
            {status === 'success' && <h1 className="success">Congratulations! You cracked the code!</h1>}
            {status === 'in-progress' && (
                <div className="game-container">
                    <div className="attempts">Attempts Left: {attemptsLeft}</div>
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
