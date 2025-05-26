import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import '../styles/global.css'; 

export default function UserProfile() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Default je samo za primer, ker zdaj vzamemo iz baze
  const [stepGoal, setStepGoal] = useState(10000);
  const [newGoalInput, setNewGoalInput] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:3001/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setUser(response.data);

        // Nastavimo stepGoal iz baze, če obstaja
        if (response.data.stepGoal) {
          setStepGoal(response.data.stepGoal);
        }

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
  const progressPercentage = Math.min((steps / stepGoal) * 100, 100).toFixed(1);

  // Funkcija za posodabljanje cilja na backendu
  const handleGoalSave = async () => {
    const parsedGoal = parseInt(newGoalInput);
    if (!isNaN(parsedGoal) && parsedGoal > 0) {
      setSavingGoal(true);
      try {
        const token = localStorage.getItem('token');
        await axios.patch(`http://localhost:3001/api/users/${userId}`, 
          { stepGoal: parsedGoal }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setStepGoal(parsedGoal);
        setNewGoalInput('');
      } catch (error) {
        alert('Napaka pri shranjevanju cilja. Poskusi ponovno.');
        console.error(error);
      } finally {
        setSavingGoal(false);
      }
    } else {
      alert('Prosim vnesite veljavno pozitivno število.');
    }
  };

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

          <div className="stat-box"><strong>Koraki:</strong> {steps} / {stepGoal}</div>
          <div className="stat-box"><strong>Razdalja:</strong> {distance} km</div>
          <div className="stat-box"><strong>Porabljene kalorije:</strong> {calories} kcal</div>
          <div className="stat-box"><strong>Datum:</strong> {new Date(latestStat.date).toLocaleDateString()}</div>

          <hr />

          <div>
            <label htmlFor="stepGoalInput"><strong>Nastavi svoj cilj korakov:</strong></label><br />
            <input
              id="stepGoalInput"
              type="number"
              min="1"
              value={newGoalInput}
              onChange={e => setNewGoalInput(e.target.value)}
              placeholder="Vnesite nov cilj"
              disabled={savingGoal}
            />
            <button onClick={handleGoalSave} disabled={savingGoal} style={{ marginLeft: '8px' }}>
              {savingGoal ? 'Shranjujem...' : 'Shrani cilj'}
            </button>
          </div>
        </div>
      ) : (
        <p>Statistika za danes ni na voljo.</p>
      )}
    </div>
  </div>
  );
}
