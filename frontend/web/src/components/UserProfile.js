import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import '../styles/global.css'; 

export default function UserProfile() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const DAILY_STEP_GOAL = 10000;

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:3001/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setUser(response.data);
      } catch (error) {
        console.error('Napaka pri pridobivanju podatkov:', error);
        setUser({
          username: 'Napaka pri nalaganju',
          email: 'ni podatkov'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  if (loading) return <div className="user-profile">Nalaganje podatkov...</div>;

  const latestStat = user?.dailyStats && user.dailyStats.length > 0
    ? user.dailyStats[user.dailyStats.length - 1]
    : null;

  const steps = latestStat ? latestStat.stepCount : 0;
  const distance = latestStat ? latestStat.distance.toFixed(2) : '0.00';
  const calories = (steps * 0.04).toFixed(2);
  const progressPercentage = Math.min((steps / DAILY_STEP_GOAL) * 100, 100).toFixed(1);

  return (
    <div className="user-profile">
      <h2>Profil uporabnika</h2>
      <p><strong>Uporabniško ime:</strong> {user?.username}</p>
      <p><strong>Email:</strong> {user?.email}</p>

      <hr />

      <div className="stat-section">
        <h3>Statistika današnjega dne</h3>

        {latestStat ? (
          <div>
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${progressPercentage}%` }}>
                {progressPercentage}%
              </div>
            </div>

            <div className="stat-box">
              <strong>Koraki:</strong> {steps} / {DAILY_STEP_GOAL}
            </div>
            <div className="stat-box">
              <strong>Razdalja:</strong> {distance} km
            </div>
            <div className="stat-box">
              <strong>Porabljene kalorije:</strong> {calories} kcal
            </div>
            <div className="stat-box">
              <strong>Datum:</strong> {new Date(latestStat.date).toLocaleDateString()}
            </div>
          </div>
        ) : (
          <p>Statistika za danes ni na voljo.</p>
        )}
      </div>
    </div>
  );
}
