import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/global.css';

export default function Leaderboard() {
  const [usersData, setUsersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState('steps');
  const [error, setError] = useState(null);

  // Možni ključi za sortiranje, s prilagoditvami label za UI
  const sortOptions = [
    { key: 'steps', label: 'Koraki (danes)' },
    { key: 'distance', label: 'Razdalja (km)' },
    { key: 'calories', label: 'Porabljene kalorije' },
    // Če bi imel še npr. povprečni čas (pace), lahko dodaš:
    // { key: 'pace', label: 'Povprečni čas na km (min/km)' },
    // In podobno za max altitude, če bi izračunali.
  ];

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Manjka prijavni token. Prosim, prijavite se.');
        }

        const res = await axios.get(
          'http://localhost:3001/api/users',
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Predpostavimo, da res.data predstavlja polje uporabnikov:
        // [{ _id, username, email, dailyStats: [ { date, stepCount, distance }, ... ] }, ...]
        const allUsers = res.data;

        // Dobimo dnešnji datum v obliki "YYYY-MM-DD", da lahko filtriramo
        const now = new Date();
        const todayStr = now.toISOString().substring(0, 10); // npr. "2025-06-04"

        const processed = allUsers.map((u) => {
          let todayEntry = null;
          if (Array.isArray(u.dailyStats)) {
            todayEntry = u.dailyStats.find((stat) => {
              // stat.date je ISO niz, npr. "2025-06-04T00:00:00.000Z"
              return stat.date.substring(0, 10) === todayStr;
            });
          }

          const steps = todayEntry ? todayEntry.stepCount : 0;
          const distance = todayEntry ? todayEntry.distance : 0; // v km
          const calories = +(steps * 0.04).toFixed(2);
          // Če hočeš izračunati povprečni čas (pace), bi potrebovali še čas:
          // Recimo, da bi v dailyStats imeli poleg distance km tudi totalTimeMinutes.
          // const pace = todayEntry && todayEntry.totalTimeMinutes && todayEntry.distance > 0
          //   ? +(todayEntry.totalTimeMinutes / todayEntry.distance).toFixed(2)
          //   : null;

          return {
            userId: u._id,
            username: u.username,
            steps,
            distance: +distance.toFixed(2),
            calories,
            // pace, // če obstaja
            // … poljubne druge metrike …
          };
        });

        setUsersData(processed);
      } catch (err) {
        console.error('Napaka pri nalaganju uporabnikov:', err);
        setError(err.message || 'Napaka pri nalaganju');
      } finally {
        setLoading(false);
      }
    };

    fetchAllUsers();
  }, []);

  // 3) Če je loading ali error, pokažemo ustrezno sporočilo
  if (loading) {
    return <div className="leaderboard"><em>Nalaganje seznama...</em></div>;
  }
  if (error) {
    return <div className="leaderboard"><strong>Napaka:</strong> {error}</div>;
  }

  // 4) Razvrsti usersData po sortKey padajoče
  const sorted = [...usersData].sort((a, b) => {
    // Za vsak key privzeto urejamo po vrednosti descending (največje zgoraj)
    const aVal = a[sortKey] ?? 0;
    const bVal = b[sortKey] ?? 0;
    return bVal - aVal;
  });

  return (
    <div className="leaderboard">
      <h2>Leaderboard (danes)</h2>

      {/* 5) Dropdown za menjavo kriterija */}
      <div className="leaderboard-controls">
        <label htmlFor="sortKeySelect"><strong>Razvrsti po:</strong> </label>
        <select
          id="sortKeySelect"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
        >
          {sortOptions.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 6) Prikaz seznama uporabnikov v tabeli */}
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Uporabnik</th>
            <th>Koraki</th>
            <th>Razdalja (km)</th>
            <th>Kalorije</th>
            {/* <th>Pace (min/km)</th> // če izračunaš */}
          </tr>
        </thead>
        <tbody>
          {sorted.map((user, idx) => (
            <tr key={user.userId}>
              <td>{idx + 1}</td>
              <td>{user.username}</td>
              <td>{user.steps.toLocaleString('sl-SI')}</td>
              <td>{user.distance.toLocaleString('sl-SI', { minimumFractionDigits: 2 })}</td>
              <td>{user.calories.toLocaleString('sl-SI', { minimumFractionDigits: 2 })}</td>
              {/* <td>{user.pace ? user.pace : '-'}</td> */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
