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
        
        if (!statusRes.ok) {
          throw new Error('Napaka pri pridobivanju statusa');
        }
        
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
          
          if (!verifyRes.ok) {
            throw new Error('Napaka pri verifikaciji');
          }
          
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
        body: JSON.stringify({ 
          username, 
          password,
          isMobile: false // Dodaj to za spletno prijavo
        })
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
    } catch (err) {
      setError("Neveljavno uporabniško ime ali geslo");
      setUsername("");
      setPassword("");
    }
  }

  if (user) {
    return <Navigate to={`/userProfile/${user._id}`} replace />;
  }

  return (
    <>
      {/* Prijavni obrazec */}
      <div className="login-container">
        <h2>🔒 Prijava</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Uporabniško ime</label>
            <input
              id="username"
              type="text"
              value={username}
              disabled={pending2FA}
              required
              onChange={e => setUsername(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Geslo</label>
            <input
              id="password"
              type="password"
              value={password}
              disabled={pending2FA}
              required
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={pending2FA}>
            {pending2FA ? '⌛ Čakam na potrditev 2FA...' : '➡️ Prijava'}
          </button>

          {error && <p className="error">{error}</p>}
        </form>
      </div>

      {/* Navodila za 2FA */}
      <div className="callout">
        <h3>🔑 Navodila za 2FA</h3>
        <ol>
          <li>Prijavite se v <strong>mobilni aplikaciji</strong>.</li>
          <li>Na mobilni aplikaciji nastavite 2FA - preverjanje obraza</li>
          <li>Nato vnesite enake podatke tukaj.</li>
          <li>Potrdite obvestilo na mobilni aplikaciji.</li>
          <li>Pošljite obraz in počakajte, da se prijava potrdi.</li>
        </ol>
        <em>Če ne prejmete obvestila, preverite internetno povezavo.</em>
      </div>
    </>
  );
}