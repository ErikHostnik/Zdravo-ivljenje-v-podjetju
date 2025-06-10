import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/global.css';

export default function Leaderboard() {
  const [usersData, setUsersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState('steps');
  const [error, setError] = useState(null);

  // Shranjujemo največ dva izbrana userId
  const [selectedUsers, setSelectedUsers] = useState([]);

  const navigate = useNavigate();

  const sortOptions = [
    { key: 'steps',     label: 'Koraki (danes)' },
    { key: 'distance',  label: 'Razdalja (km)' },
    { key: 'calories',  label: 'Kalorije' },
    { key: 'speed',     label: 'Hitrost (km/h)' },
    { key: 'altitude',  label: 'Višina (m)' },
    { key: 'progress',  label: 'Napredek (%)' },
  ];

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Manjka prijavni token. Prosim, prijavite se.');

        const res = await axios.get('http://localhost:3001/api/users', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const allUsers = res.data;
        const now = new Date();
        const todayStr = now.toISOString().substring(0, 10);

        const processed = allUsers.map(u => {
          let todayEntry = null;
          if (Array.isArray(u.dailyStats)) {
            todayEntry = u.dailyStats.find(stat => stat.date.substring(0, 10) === todayStr);
          }

          const steps = todayEntry?.stepCount ?? 0;
          const distance = todayEntry?.distance ?? 0;
          const calories = +(steps * 0.04).toFixed(2);

          const duration = todayEntry?.durationSeconds ?? 0;
          const speed = duration > 0 ? +(distance / (duration / 3600)).toFixed(2) : 0;
          const altitude = todayEntry?.altitudeDistance ?? 0;

          // napredek
          const stepGoal = u.stepGoal ?? 0;
          const progress = stepGoal > 0
            ? Math.min(100, Math.round((steps / stepGoal) * 100))
            : 0;

          return {
            userId:    u._id,
            username:  u.username,
            steps,
            distance: +distance.toFixed(2),
            calories,
            speed,
            altitude,
            progress,
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

  const sorted = [...usersData].sort((a, b) => {
    const aVal = a[sortKey] ?? 0;
    const bVal = b[sortKey] ?? 0;
    return bVal - aVal;
  });

  // Toggle izbire uporabnika (doda ali odstrani iz selectedUsers)
  const toggleSelection = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      }
      if (prev.length >= 2) return prev;
      return [...prev, userId];
    });
  };

  const renderMetric = user => {
    switch (sortKey) {
      case 'steps':
        return <strong>Koraki:</strong>;
      case 'distance':
        return <strong>Razdalja:</strong>;
      case 'calories':
        return <strong>Kalorije:</strong>;
      case 'speed':
        return <strong>Hitrost:</strong>;
      case 'altitude':
        return <strong>Višina:</strong>;
      case 'progress':
        return <strong>Napredek:</strong>;
      default:
        return null;
    }
  };

  const renderValue = user => {
    const v = user[sortKey] ?? 0;
    const locale = sortKey === 'distance' || sortKey === 'speed'
      ? v.toLocaleString('sl-SI', { minimumFractionDigits: 2 })
      : v.toLocaleString('sl-SI');
    const unit = sortKey === 'distance'
      ? ' km'
      : sortKey === 'speed'
        ? ' km/h'
        : sortKey === 'altitude'
          ? ' m'
          : sortKey === 'progress'
            ? '%'
            : sortKey === 'calories'
              ? ' kcal'
              : '';
    return `${locale}${unit}`;
  };

  return (
    <div className="user-profile">
      <h2 style={{ color: 'white' }}>Leaderboard (danes)</h2>

      {/* Izbira za sortiranje in gumb za primerjavo*/}
      <div
        className="leaderboard-controls"
        style={{
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <div>
          <label htmlFor="sortKeySelect" style={{ color: 'white' }}>
            <strong>Razvrsti po:</strong>
          </label>
          <select
            id="sortKeySelect"
            value={sortKey}
            onChange={e => setSortKey(e.target.value)}
            style={{
              marginLeft: '8px',
              padding: '4px 8px',
              fontSize: '1rem',
              backgroundColor: '#1F2235',
              color: 'white',
              border: '1px solid #444'
            }}
          >
            {sortOptions.map(opt => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <button
          disabled={selectedUsers.length !== 2}
          onClick={() => {
            const [id1, id2] = selectedUsers;
            navigate(`/compare/${id1}/${id2}`);
          }}
          style={{
            marginLeft: 'auto',
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
      
      {/* Seznam z uporabniki */}
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
            <div style={{ marginTop: '6px', fontSize: '1rem', color: '#00E0A3' }}>
              {renderMetric(user)} {renderValue(user)}
            </div>
          </div>
        );
      })}

    </div>
  );
}
