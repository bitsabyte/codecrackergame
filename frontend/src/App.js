
// Updated App.js to use JWTs with attempt tracking
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = "https://codecrackergamebackend.onrender.com";

const App = () => {
    const [username, setUsername] = useState('');
    const [guess, setGuess] = useState(Array(10).fill(''));
    const [feedback, setFeedback] = useState([]);
    const [status, setStatus] = useState('not-logged-in');
    const [attemptsLeft, setAttemptsLeft] = useState(3);
    const [token, setToken] = useState(null);

    useEffect(() => {
        if (token) {
            axios.get(`${BACKEND_URL}/status`, {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then((res) => setStatus(res.data.status))
                .catch(() => setStatus('not-logged-in'));
        }
    }, [token]);

    const handleLogin = () => {
        axios.post(`${BACKEND_URL}/login`, { username })
            .then((res) => {
                setToken(res.data.token);
                setStatus('in-progress');
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
                    setToken(res.data.token); // Update the token with remaining attempts
                }
            })
            .catch((err) => alert(err.response.data.message));
    };

    return (
        <div>
            {status === 'not-logged-in' && (
                <div>
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

            {status === 'game-over' && <h1>Game Over</h1>}
            {status === 'success' && <h1>Congratulations! You cracked the code!</h1>}
            {status === 'in-progress' && (
                <div>
                    <h1>Attempts Left: {attemptsLeft}</h1>
                    <div>
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
                    </div>
                    <button onClick={handleSubmit}>Submit</button>
                </div>
            )}
        </div>
    );
};

export default App;
