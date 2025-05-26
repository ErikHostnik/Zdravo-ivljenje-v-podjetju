import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

import '../styles/global.css'; 

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function UserProfile() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [stepGoal, setStepGoal] = useState(10000);
  const [newGoalInput, setNewGoalInput] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:3001/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setUser(response.data);

        if (response.data.stepGoal) {
          setStepGoal(response.data.stepGoal);
        }

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const dataForMonth = response.data.dailyStats?.filter(stat => {
          const statDate = new Date(stat.date);
          return statDate.getMonth() === currentMonth && statDate.getFullYear() === currentYear;
        }) || [];

        dataForMonth.sort((a, b) => new Date(a.date) - new Date(b.date));

        setMonthlyData(dataForMonth);

      } catch (error) {
        console.error('Napaka pri pridobivanju podatkov:', error);
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

  const handleGoalSave = async () => {
    const parsedGoal = parseInt(newGoalInput);
    if (!isNaN(parsedGoal) && parsedGoal > 0) {
      setSavingGoal(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          alert("Manjka prijavni token. Prosim, prijavite se ponovno.");
          return;
        }
        await axios.put(`http://localhost:3001/api/users/${userId}`, 
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

  const chartData = {
    labels: monthlyData.map(stat => new Date(stat.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Koraki',
        data: monthlyData.map(stat => stat.stepCount),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
      {
        label: 'Razdalja (km)',
        data: monthlyData.map(stat => stat.distance),
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Mesečna statistika' },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
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
              <input id="stepGoalInput" type="number" min="1" value={newGoalInput} onChange={e => setNewGoalInput(e.target.value)} placeholder="Vnesite nov cilj" disabled={savingGoal}/>
              <button onClick={handleGoalSave} disabled={savingGoal} style={{ marginLeft: '8px' }}> {savingGoal ? 'Shranjujem...' : 'Shrani cilj'}</button>
            </div>
          </div>
        ) : (
          <p>Statistika za danes ni na voljo.</p>
        )}
      </div>

      <hr />

      <div className="monthly-stats">
        <h3>Mesečna statistika ({new Date().toLocaleString('sl-SI', { month: 'long', year: 'numeric' })})</h3>
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
