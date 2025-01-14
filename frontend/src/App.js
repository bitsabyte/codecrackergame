import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = "https://codecrackergamebackend.onrender.com";

const App = () => {
    const [username, setUsername] = useState('');
    const [guess, setGuess] = useState(Array(10).fill(''));
    const [feedback, setFeedback] = useState([]);
    const [status, setStatus] = useState('not-logged-in');
    const [attemptsLeft, setAttemptsLeft] = useState(3);

    useEffect(() => {
        axios.get(`${BACKEND_URL}/status`, { withCredentials: true })
            .then((res) => setStatus(res.data.status))
            .catch(() => setStatus('not-logged-in'));
    }, []);

    const handleLogin = () => {
        axios.post(`${BACKEND_URL}/login`, { username }, { withCredentials: true })
            .then((res) => {
                setAttemptsLeft(res.data.attemptsLeft);
                setStatus('in-progress');
            })
            .catch((err) => alert(err.response.data.message));
    };

    const handleSubmit = () => {
        axios.post(`${BACKEND_URL}/guess`, { guess }, { withCredentials: true })
            .then((res) => {
                if (res.data.status === 'success') setStatus('success');
                else if (res.data.status === 'game-over') setStatus('game-over');
                else {
                    setFeedback(res.data.result);
                    setAttemptsLeft(res.data.attemptsLeft);
                }
            })
            .catch((err) => alert(err.response.data.message));
    };

    if (status === 'not-logged-in') {
        return (
            <div>
                <h1>Code Cracker Game</h1>
                <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                <button onClick={handleLogin}>Login</button>
            </div>
        );
    }

    if (status === 'game-over') {
        return <h1>Game Over</h1>;
    }

    if (status === 'success') {
        return <h1>Congratulations! You cracked the code!</h1>;
    }

    return (
        <div>
            <h1>Attempts Left: {attemptsLeft}</h1>
            <div>
                {guess.map((digit, index) => (
                    <input key={index} maxLength="1" value={digit} onChange={(e) => {
                        const newGuess = [...guess];
                        newGuess[index] = e.target.value;
                        setGuess(newGuess);
                    }} />
                ))}
            </div>
            <button onClick={handleSubmit}>Submit</button>
        </div>
    );
};

export default App;
