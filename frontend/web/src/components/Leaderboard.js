import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/global.css';

export default function Leaderboard() {
  const [usersData, setUsersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState('steps');
  const [error, setError] = useState(null);

  // V tem polju hranimo največ dva userId za primerjavo
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Možni ključi za sortiranje
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
        const todayStr = now.toISOString().substring(0, 10); // "2025-06-04"

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

  // Razvrstimo po izbranem ključu (padajoče)
  const sorted = [...usersData].sort((a, b) => {
    const aVal = a[sortKey] ?? 0;
    const bVal = b[sortKey] ?? 0;
    return bVal - aVal;
  });

  // Toggle izbire: če je že izbran, ga odstranimo; če ni in je manj kot 2, ga dodamo
  const toggleSelection = (userId) => {
    setSelectedUsers((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      if (prev.length >= 2) return prev;
      return [...prev, userId];
    });
  };

  // Funkcija za prikaz posamične metrike, glede na sortKey
  const renderMetric = (user) => {
    switch (sortKey) {
      case 'steps':
        return (
          <div style={{ fontSize: '1rem', color: '#00E0A3' }}>
            <strong>Koraki:</strong> {user.steps.toLocaleString('sl-SI')}
          </div>
        );
      case 'distance':
        return (
          <div style={{ fontSize: '1rem', color: '#00E0A3' }}>
            <strong>Razdalja:</strong> {user.distance.toLocaleString('sl-SI', { minimumFractionDigits: 2 })} km
          </div>
        );
      case 'calories':
        return (
          <div style={{ fontSize: '1rem', color: '#00E0A3' }}>
            <strong>Kalorije:</strong> {user.calories.toLocaleString('sl-SI', { minimumFractionDigits: 2 })} kcal
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="user-profile">
      <h2 style={{ color: 'white' }}>Leaderboard (danes)</h2>

      {/* Dropdown za izbiro sortiranja */}
      <div className="leaderboard-controls" style={{ marginBottom: '16px' }}>
        <label htmlFor="sortKeySelect" style={{ color: 'white' }}>
          <strong>Razvrsti po:</strong>
        </label>
        <select
          id="sortKeySelect"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          style={{
            marginLeft: '8px',
            padding: '4px 8px',
            fontSize: '1rem',
            backgroundColor: '#1F2235',
            color: 'white',
            border: '1px solid #444'
          }}
        >
          {sortOptions.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Seznam kartic; klik na kartico izbere/odznači uporabnika */}
      {sorted.map((user, idx) => {
        const isSelected = selectedUsers.includes(user.userId);
        return (
          <div
            key={user.userId}
            className="stat-section"
            onClick={() => toggleSelection(user.userId)}
            style={{
              marginBottom: '12px',
              cursor: 'pointer',
              padding: '12px',
              borderRadius: '8px',
              border: isSelected ? '2px solid #00E0A3' : '1px solid #444',
              backgroundColor: isSelected ? '#252A3B' : '#1F2235'
            }}
          >
            <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>
              #{idx + 1} {user.username}
            </h3>
            <div style={{ marginTop: '6px' }}>{renderMetric(user)}</div>
          </div>
        );
      })}

      {/* Gumb za primerjavo, omogočen le, če sta dva izbrana */}
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <button
          disabled={selectedUsers.length !== 2}
          onClick={() => {
            const [id1, id2] = selectedUsers;
            // Uporabi useNavigate ali window.location:
            window.location.href = `/compare/${id1}/${id2}`;
          }}
          style={{
            padding: '8px 16px',
            fontSize: '1rem',
            backgroundColor: selectedUsers.length === 2 ? '#00E0A3' : '#555',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedUsers.length === 2 ? 'pointer' : 'not-allowed'
          }}
        >
          Primerjaj izbrana dva
        </button>
      </div>
    </div>
  );
}
