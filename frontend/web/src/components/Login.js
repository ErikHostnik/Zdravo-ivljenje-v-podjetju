// components/Login.jsx
import { useContext, useState } from 'react';
import { UserContext } from '../userContext';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { user, setUserContext } = useContext(UserContext);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:3001/api/users/login", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (data.user && data.user._id && data.token) {
        // store token + user
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUserContext(data.user);
      } else {
        throw new Error("Invalid credentials");
      }
    } catch (err) {
      setUsername("");
      setPassword("");
      setError("Neveljavno uporabniško ime ali geslo");
    }
  }

  // if already logged in, redirect to home or profile
  if (user) return <Navigate replace to={`/userProfile/${user._id}`} />;

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto p-4 border rounded">
      <h2 className="text-lg mb-4">Prijava</h2>
      <input
        className="w-full mb-2 p-2 border rounded"
        type="text"
        placeholder="Uporabniško ime"
        value={username}
        onChange={e => setUsername(e.target.value)}
        required
      />
      <input
        className="w-full mb-2 p-2 border rounded"
        type="password"
        placeholder="Geslo"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
      />
      <button
        type="submit"
        className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Prijava
      </button>
      {error && <p className="mt-2 text-red-600">{error}</p>}
    </form>
  );
}
