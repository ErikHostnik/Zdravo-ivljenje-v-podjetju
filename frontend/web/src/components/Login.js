import { useContext, useState, useEffect } from 'react';
import { UserContext } from '../userContext';
import { Navigate, useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const { user, setUserContext } = useContext(UserContext);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [pending2FA, setPending2FA] = useState(false);
  const [twoFactorRequestId, setTwoFactorRequestId] = useState(null);

  useEffect(() => {
    if (!pending2FA || !twoFactorRequestId) return;
    const interval = setInterval(async () => {
      try {
        const statusRes = await fetch(
          `http://localhost:3001/api/2fa/${twoFactorRequestId}/status`
        );
        const statusData = await statusRes.json();

        if (statusData.approved) {
          const verifyRes = await fetch(
            "http://localhost:3001/api/users/verify2fa",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ requestId: twoFactorRequestId })
            }
          );
          const verifyData = await verifyRes.json();
          if (verifyData.user && verifyData.token) {
            localStorage.setItem("token", verifyData.token);
            localStorage.setItem("user", JSON.stringify(verifyData.user));
            setUserContext(verifyData.user);
            clearInterval(interval);
            navigate(`/userProfile/${verifyData.user._id}`, { replace: true });
          } else {
            throw new Error("Napaka pri dokončanju prijave");
          }
        }
        if (statusData.rejected) {
          setError("2FA zahteva zavrnjena.");
          setPending2FA(false);
          setTwoFactorRequestId(null);
          clearInterval(interval);
        }
      } catch (err) {
        setError("Napaka pri preverjanju 2FA.");
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [pending2FA, twoFactorRequestId, setUserContext, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("http://localhost:3001/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (data.pending2FA && data.twoFactorRequestId) {
        setPending2FA(true);
        setTwoFactorRequestId(data.twoFactorRequestId);
      } else if (data.user && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setUserContext(data.user);
        navigate(`/userProfile/${data.user._id}`, { replace: true });
      } else {
        throw new Error("Neveljavni podatki");
      }
    } catch {
      setError("Neveljavno uporabniško ime ali geslo");
      setUsername("");
      setPassword("");
    }
  }

  if (user) {
    return <Navigate to={`/userProfile/${user._id}`} replace />;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto p-4 border rounded">
      <h2 className="text-lg mb-4">Prijava</h2>
      <input
        className="w-full mb-2 p-2 border rounded"
        placeholder="Uporabniško ime"
        value={username}
        disabled={pending2FA}
        required
        onChange={e => setUsername(e.target.value)}
      />
      <input
        className="w-full mb-2 p-2 border rounded"
        type="password"
        placeholder="Geslo"
        value={password}
        disabled={pending2FA}
        required
        onChange={e => setPassword(e.target.value)}
      />
      <button
        className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        disabled={pending2FA}
      >
        {pending2FA ? "Čakam na 2FA potrditev..." : "Prijava"}
      </button>
      {error && <p className="mt-2 text-red-600">{error}</p>}
    </form>
  );
}
