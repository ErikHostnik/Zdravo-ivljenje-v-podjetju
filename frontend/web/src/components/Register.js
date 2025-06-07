import { useState } from 'react';

function Register() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");

    async function handleRegister(e) {
        e.preventDefault();
        try {
            const res = await fetch("http://localhost:3001/api/users", {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username, password })
            });
            const data = await res.json();

            if (data._id !== undefined) {
                window.location.href = "/";
            } else {
                setError("Registracija ni uspela.");
                setUsername("");
                setPassword("");
                setEmail("");
            }
        } catch (err) {
            setError("Napaka pri povezavi s strežnikom.");
        }
    }

    return (
        <div className="login-container">
            <h2>Registracija</h2>
            <form onSubmit={handleRegister}>
                <div className="form-group">
                    <label>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Uporabniško ime</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Geslo</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Registriraj se</button>
                {error && <div className="error">{error}</div>}
            </form>
        </div>
    );
}

export default Register;
