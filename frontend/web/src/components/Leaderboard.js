import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/global.css';

export default function Leaderboard() {
  const [usersData, setUsersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState('steps');
  const [error, setError] = useState(null);

  // Možni ključi za sortiranje, z labelami za UI
  const sortOptions = [
    { key: 'steps', label: 'Koraki (danes)' },
    { key: 'distance', label: 'Razdalja (km)' },
    { key: 'calories', label: 'Porabljene kalorije' },
  ];

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Manjka prijavni token. Prosim, prijavite se.');
        }

        const res = await axios.get('http://localhost:3001/api/users', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const allUsers = res.data;
        const now = new Date();
        const todayStr = now.toISOString().substring(0, 10); // npr. "2025-06-04"

        const processed = allUsers.map((u) => {
          let todayEntry = null;
          if (Array.isArray(u.dailyStats)) {
            todayEntry = u.dailyStats.find((stat) => {
              return stat.date.substring(0, 10) === todayStr;
            });
          }

          const steps = todayEntry ? todayEntry.stepCount : 0;
          const distance = todayEntry ? todayEntry.distance : 0;
          const calories = +(steps * 0.04).toFixed(2);

          return {
            userId: u._id,
            username: u.username,
            steps,
            distance: +distance.toFixed(2),
            calories,
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

  if (loading) {
    return (
      <div className="user-profile">
        <em>Nalaganje seznama...</em>
      </div>
    );
  }
  if (error) {
    return (
      <div className="user-profile">
        <strong>Napaka:</strong> {error}
      </div>
    );
  }

  // Razvrstimo po izbranem ključu v padajočem vrstnem redu
  const sorted = [...usersData].sort((a, b) => {
    const aVal = a[sortKey] ?? 0;
    const bVal = b[sortKey] ?? 0;
    return bVal - aVal;
  });

  // Funkcija, ki vrne JSX z izbrano metriko
  const renderMetric = (user) => {
    switch (sortKey) {
      case 'steps':
        return (
          <div className="stat-box">
            <strong>Koraki:</strong> {user.steps.toLocaleString('sl-SI')}
          </div>
        );
      case 'distance':
        return (
          <div className="stat-box">
            <strong>Razdalja:</strong> {user.distance.toLocaleString('sl-SI', { minimumFractionDigits: 2 })} km
          </div>
        );
      case 'calories':
        return (
          <div className="stat-box">
            <strong>Kalorije:</strong> {user.calories.toLocaleString('sl-SI', { minimumFractionDigits: 2 })} kcal
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="user-profile">
      <h2>Leaderboard (danes)</h2>

      {/* Dropdown za menjavo kriterija sortiranja */}
      <div className="leaderboard-controls" style={{ marginBottom: '16px' }}>
        <label htmlFor="sortKeySelect"><strong>Razvrsti po:</strong> </label>
        <select
          id="sortKeySelect"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          style={{ marginLeft: '8px', padding: '4px 8px', fontSize: '1rem' }}
        >
          {sortOptions.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Zdaj za vsakega uporabnika ustvarimo “kartico” z izbrano metriko */}
      {sorted.map((user, idx) => (
        <div className="stat-section" key={user.userId} style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '8px' }}>
            #{idx + 1} {user.username}
          </h3>
          {renderMetric(user)}
        </div>
      ))}
    </div>
  );
}
