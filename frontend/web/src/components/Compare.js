import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import '../styles/global.css';

export default function Compare() {
  const { id1, id2 } = useParams();
  const [user1, setUser1] = useState(null);
  const [user2, setUser2] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // korenski API: vrne podrobnosti uporabnika (vključno z dailyStats, stepGoal ipd.)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Manjka prijavni token.');

        const [res1, res2] = await Promise.all([
          axios.get(`http://localhost:3001/api/users/${id1}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`http://localhost:3001/api/users/${id2}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setUser1(res1.data);
        setUser2(res2.data);
      } catch (err) {
        console.error('Napaka pri nalaganju uporabnikov:', err);
        setError(err.message || 'Napaka pri nalaganju');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [id1, id2]);

  if (loading) {
    return (
      <div className="user-profile">
        <em>Nalaganje podatkov za primerjavo...</em>
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
  if (!user1 || !user2) {
    return (
      <div className="user-profile">
        <p>En ali oba uporabnika nista najdena.</p>
      </div>
    );
  }

  // Pomagajmo si z datumom za današnji vnos
  const now = new Date();
  const todayStr = now.toISOString().substring(0, 10);

  const prepareStats = (u) => {
    // Najdemo današnjo statistiko:
    let todayEntry = null;
    if (Array.isArray(u.dailyStats)) {
      todayEntry = u.dailyStats.find((stat) => stat.date.substring(0,10) === todayStr);
    }
    const steps = todayEntry ? todayEntry.stepCount : 0;
    const distance = todayEntry ? todayEntry.distance : 0;
    const calories = +(steps * 0.04).toFixed(2);
    // Vzemimo tudi stepGoal iz u.stepGoal (če obstaja) in npr. prejšnje dneve itd.
    const stepGoal = u.stepGoal || 0;

    return {
      username: u.username,
      email: u.email,
      steps,
      distance: +distance.toFixed(2),
      calories,
      stepGoal,
      // Dodaj tudi npr. maxDistanceEver, maxAltitude, ipd. če obstajajo v podatkih
      // maxDistanceEver: Math.max(...(u.dailyStats.map(s => s.distance || 0)))
    };
  };

  const stats1 = prepareStats(user1);
  const stats2 = prepareStats(user2);

  return (
    <div className="user-profile" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
      {/* Kartica za prvega uporabnika */}
      <div className="stat-section" style={{ flex: '1 1 300px' }}>
        <h3>{stats1.username}</h3>
        <div className="stat-box"><strong>Email:</strong> {stats1.email}</div>
        <div className="stat-box"><strong>Cilj korakov:</strong> {stats1.stepGoal}</div>
        <div className="stat-box"><strong>Koraki danes:</strong> {stats1.steps.toLocaleString('sl-SI')}</div>
        <div className="stat-box"><strong>Razdalja danes:</strong> {stats1.distance.toLocaleString('sl-SI', { minimumFractionDigits: 2 })} km</div>
        <div className="stat-box"><strong>Kalorije danes:</strong> {stats1.calories.toLocaleString('sl-SI', { minimumFractionDigits: 2 })} kcal</div>
        {/* Če želite še dodatne vrstice, jih dodajte tukaj */}
      </div>

      {/* Kartica za drugega uporabnika */}
      <div className="stat-section" style={{ flex: '1 1 300px' }}>
        <h3>{stats2.username}</h3>
        <div className="stat-box"><strong>Email:</strong> {stats2.email}</div>
        <div className="stat-box"><strong>Cilj korakov:</strong> {stats2.stepGoal}</div>
        <div className="stat-box"><strong>Koraki danes:</strong> {stats2.steps.toLocaleString('sl-SI')}</div>
        <div className="stat-box"><strong>Razdalja danes:</strong> {stats2.distance.toLocaleString('sl-SI', { minimumFractionDigits: 2 })} km</div>
        <div className="stat-box"><strong>Kalorije danes:</strong> {stats2.calories.toLocaleString('sl-SI', { minimumFractionDigits: 2 })} kcal</div>
        {/* Dodajte ostale vrstice po potrebi */}
      </div>
    </div>
  );
}
