// src/components/Compare.js
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
        setError(err.response?.data?.message || err.message || 'Napaka pri nalaganju');
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

  // Pripravimo podatke za izračun statistike
  const now = new Date();
  const todayStr = now.toISOString().substring(0, 10);

  const prepareStats = (u) => {
    let todayEntry = null;
    if (Array.isArray(u.dailyStats)) {
      todayEntry = u.dailyStats.find((stat) => stat.date.substring(0, 10) === todayStr);
    }
    const steps = todayEntry ? todayEntry.stepCount : 0;
    const distance = todayEntry ? todayEntry.distance : 0;
    const calories = +(steps * 0.04).toFixed(2);
    const stepGoal = u.stepGoal || 0;

    return {
      username: u.username,
      email: u.email,
      steps,
      distance: +distance.toFixed(2),
      calories,
      stepGoal,
    };
  };

  const stats1 = prepareStats(user1);
  const stats2 = prepareStats(user2);

  return (
    <div className="user-profile" style={{ padding: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px', color: 'white' }}>
        Primerjava uporabnikov
      </h2>
      
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '30px',
        flexWrap: 'wrap'
      }}>
        {/* Kartica 1 - Preoblikovana z novim dizajnom */}
        <div style={{
          flex: '1',
          minWidth: '350px',
          maxWidth: '500px',
          backgroundColor: '#1F2235',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 6px 15px rgba(0,0,0,0.3)',
          border: '1px solid #3A3F67'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '20px',
            paddingBottom: '15px',
            borderBottom: '1px solid #3A3F67'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: '#4F536F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '15px',
              fontWeight: 'bold',
              fontSize: '20px',
              color: '#FFD700'
            }}>
              {stats1.username.charAt(0).toUpperCase()}
            </div>
            <h3 style={{ color: '#FFD700', margin: 0 }}>{stats1.username}</h3>
          </div>
          
          <div style={{ color: '#E0E0FF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span><strong>Email:</strong></span>
              <span>{stats1.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span><strong>Cilj korakov:</strong></span>
              <span>{stats1.stepGoal.toLocaleString('sl-SI')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span><strong>Koraki danes:</strong></span>
              <span>{stats1.steps.toLocaleString('sl-SI')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span><strong>Razdalja danes:</strong></span>
              <span>{stats1.distance.toLocaleString('sl-SI', { minimumFractionDigits: 2 })} km</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span><strong>Kalorije danes:</strong></span>
              <span>{stats1.calories.toLocaleString('sl-SI', { minimumFractionDigits: 2 })} kcal</span>
            </div>
          </div>
        </div>

        {/* Kartica 2 - Preoblikovana z novim dizajnom */}
        <div style={{
          flex: '1',
          minWidth: '350px',
          maxWidth: '500px',
          backgroundColor: '#1F2235',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 6px 15px rgba(0,0,0,0.3)',
          border: '1px solid #3A3F67'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '20px',
            paddingBottom: '15px',
            borderBottom: '1px solid #3A3F67'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: '#4F536F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '15px',
              fontWeight: 'bold',
              fontSize: '20px',
              color: '#FFD700'
            }}>
              {stats2.username.charAt(0).toUpperCase()}
            </div>
            <h3 style={{ color: '#FFD700', margin: 0 }}>{stats2.username}</h3>
          </div>
          
          <div style={{ color: '#E0E0FF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span><strong>Email:</strong></span>
              <span>{stats2.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span><strong>Cilj korakov:</strong></span>
              <span>{stats2.stepGoal.toLocaleString('sl-SI')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span><strong>Koraki danes:</strong></span>
              <span>{stats2.steps.toLocaleString('sl-SI')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span><strong>Razdalja danes:</strong></span>
              <span>{stats2.distance.toLocaleString('sl-SI', { minimumFractionDigits: 2 })} km</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span><strong>Kalorije danes:</strong></span>
              <span>{stats2.calories.toLocaleString('sl-SI', { minimumFractionDigits: 2 })} kcal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}