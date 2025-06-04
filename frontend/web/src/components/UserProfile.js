
import React, { useEffect, useState, useMemo, useCallback } from 'react';
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

  const [activities, setActivities] = useState([]);

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  const [filteredActivities, setFilteredActivities] = useState([]);

  const [monthlyAverages, setMonthlyAverages] = useState({
    steps: 0,
    distance: 0,
    speed: 0,
    temperature: 0
  });

  
  const [chartMetric, setChartMetric] = useState('steps');

  const computeFilteredAndAverages = useCallback(() => {
    if (!activities || activities.length === 0) {
      setFilteredActivities([]);
      setMonthlyAverages({ steps: 0, distance: 0, speed: 0, temperature: 0 });
      return;
    }

    // Filtriramo aktivnosti za currentMonth in currentYear
    const filtered = activities.filter(act => {
      const actDate = new Date(act.timestamp);
      return (
        actDate.getMonth() === currentMonth &&
        actDate.getFullYear() === currentYear
      );
    });

    // Sortiramo filtrirane po timestamp naraščajoče
    filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    setFilteredActivities(filtered);

    // Če ni aktivnosti v izbranem mesecu
    if (filtered.length === 0) {
      setMonthlyAverages({ steps: 0, distance: 0, speed: 0, temperature: 0 });
      return;
    }

    // Izračun vsot vrednosti
    let sumSteps = 0;
    let sumDistance = 0;
    let sumSpeed = 0;
    let sumTemp = 0;
    let countTemp = 0;

    filtered.forEach(act => {
      sumSteps += act.steps || 0;
      sumDistance += act.distance || 0;
      sumSpeed += act.speed || 0;
      if (act.weather && typeof act.weather.temperature === 'number') {
        sumTemp += act.weather.temperature;
        countTemp++;
      }
    });

    const cnt = filtered.length;
    setMonthlyAverages({
      steps: (sumSteps / cnt).toFixed(1),
      distance: (sumDistance / cnt).toFixed(2),
      speed: (sumSpeed / cnt).toFixed(2),
      temperature: countTemp > 0 ? (sumTemp / countTemp).toFixed(1) : '–'
    });
  }, [activities, currentMonth, currentYear]);

  // 2) useEffect, ki kliče computeFilteredAndAverages
  useEffect(() => {
    computeFilteredAndAverages();
  }, [computeFilteredAndAverages]);

  // 3) Pridobivanje uporabnika in njegovih aktivnosti
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');

        // Pridobimo uporabnika
        const responseUser = await axios.get(
          `http://localhost:3001/api/users/${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setUser(responseUser.data);

        if (responseUser.data.stepGoal) {
          setStepGoal(responseUser.data.stepGoal);
        }

        // Pridobimo vse aktivnosti (SensorData) za danega uporabnika
        const responseActivities = await axios.get(
          `http://localhost:3001/api/activities/user/${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setActivities(responseActivities.data);
      } catch (error) {
        console.error('Napaka pri pridobivanju uporabnika ali aktivnosti:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  // 4) Poišči današnjo aktivnost z najvišjim timestamp
  const todayActivity = useMemo(() => {
    if (!activities || activities.length === 0) return null;

    const today = new Date();
    // Izluščimo vse aktivnosti za današnji datum
    const todaysAll = activities.filter(act => {
      const actDate = new Date(act.timestamp);
      return (
        actDate.getDate() === today.getDate() &&
        actDate.getMonth() === today.getMonth() &&
        actDate.getFullYear() === today.getFullYear()
      );
    });

    if (todaysAll.length === 0) return null;
    return todaysAll.reduce((maxAct, curr) =>
      new Date(curr.timestamp) > new Date(maxAct.timestamp) ? curr : maxAct
    );
  }, [activities]);

  const stepsToday = todayActivity ? todayActivity.steps : 0;
  const distanceToday = todayActivity ? (todayActivity.distance || 0).toFixed(2) : '0.00';
  const caloriesToday = todayActivity ? (todayActivity.steps * 0.04).toFixed(2) : '0.00';
  const progressPercentage = Math.min((stepsToday / stepGoal) * 100, 100).toFixed(1);

  // 5) Shranjevanje novega cilja korakov
  const handleGoalSave = async () => {
    const parsedGoal = parseInt(newGoalInput);
    if (!isNaN(parsedGoal) && parsedGoal > 0) {
      setSavingGoal(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          alert('Manjka prijavni token. Prosim, prijavite se ponovno.');
          setSavingGoal(false);
          return;
        }
        await axios.put(
          `http://localhost:3001/api/users/${userId}`,
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

  
  // 6) Navigacija po mesecih
  
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };


  const chartData = useMemo(() => {
    if (!filteredActivities || filteredActivities.length === 0) {
      return { labels: [], datasets: [] };
    }

    const labels = filteredActivities.map(act => {
      const d = new Date(act.timestamp);
      return d.toLocaleDateString('sl-SI');
    });

    const dataValues = filteredActivities.map(act => {
      switch (chartMetric) {
        case 'steps':
          return act.steps || 0;
        case 'distance':
          return act.distance || 0;
        case 'speed':
          return act.speed || 0;
        case 'temperature':
          return act.weather && typeof act.weather.temperature === 'number'
            ? act.weather.temperature
            : 0;
        default:
          return 0;
      }
    });

    let labelName = '';
    switch (chartMetric) {
      case 'steps':
        labelName = 'Koraki';
        break;
      case 'distance':
        labelName = 'Razdalja (km)';
        break;
      case 'speed':
        labelName = 'Hitrost (m/s)';
        break;
      case 'temperature':
        labelName = 'Temperatura (°C)';
        break;
      default:
        labelName = '';
    }

    return {
      labels,
      datasets: [
        {
          label: labelName,
          data: dataValues,
          backgroundColor: 'rgba(75, 192, 192, 0.6)'
        }
      ]
    };
  }, [filteredActivities, chartMetric]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: `Metrika: ${
          chartMetric === 'steps'
            ? 'Koraki'
            : chartMetric === 'distance'
            ? 'Razdalja (km)'
            : chartMetric === 'speed'
            ? 'Hitrost (m/s)'
            : 'Temperatura (°C)'
        }`
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };


  if (loading) {
    return <div className="user-profile">Nalaganje podatkov...</div>;
  }

  
  return (
    <div className="user-profile" style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h2>Profil uporabnika</h2>
      <p>
        <strong>Uporabniško ime:</strong> {user?.username}
      </p>
      <p>
        <strong>Email:</strong> {user?.email}
      </p>

      <hr style={{ margin: '20px 0' }} />

      {/* ===== Statistika današnjega dne ===== */}
      <div className="stat-section" style={{ marginBottom: '40px' }}>
        <h3>Statistika današnjega dne ({new Date().toLocaleDateString('sl-SI')})</h3>
        {todayActivity ? (
          <div>
            <div className="progress-bar-container" style={{ marginBottom: '12px' }}>
              <div
                className="progress-bar"
                style={{
                  width: `${progressPercentage}%`,
                  backgroundColor: progressPercentage >= 100 ? '#4caf50' : '#4bb0d6',
                  color: '#fff',
                  padding: '6px 0',
                  textAlign: 'center',
                  borderRadius: '4px'
                }}
              >
                {progressPercentage}% ({stepsToday} / {stepGoal})
              </div>
            </div>

            <div className="stat-box" style={{ margin: '6px 0' }}>
              <strong>Koraki:</strong> {stepsToday} / {stepGoal}
            </div>
            <div className="stat-box" style={{ margin: '6px 0' }}>
              <strong>Razdalja:</strong> {distanceToday} km
            </div>
            <div className="stat-box" style={{ margin: '6px 0' }}>
              <strong>Porabljene kalorije:</strong> {caloriesToday} kcal
            </div>
            <div className="stat-box" style={{ margin: '6px 0' }}>
              <strong>Čas meritve:</strong>{' '}
              {new Date(todayActivity.timestamp).toLocaleTimeString('sl-SI')}
            </div>
            <div className="stat-box" style={{ margin: '6px 0' }}>
              <strong>GPS koordinate:</strong>{' '}
              {todayActivity.latitude.toFixed(6)}, {todayActivity.longitude.toFixed(6)}
            </div>
            <div className="stat-box" style={{ margin: '6px 0' }}>
              <strong>Višina:</strong> {todayActivity.altitude.toFixed(2)} m
            </div>
            <div className="stat-box" style={{ margin: '6px 0' }}>
              <strong>Hitrost:</strong> {todayActivity.speed.toFixed(2)} m/s
            </div>
            <div className="stat-box" style={{ margin: '6px 0' }}>
              <strong>Vreme:</strong>{' '}
              {todayActivity.weather?.temperature.toFixed(1)} °C,{' '}
              {todayActivity.weather?.conditions}
            </div>

            <hr style={{ margin: '20px 0' }} />

            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label htmlFor="stepGoalInput" style={{ marginRight: '8px' }}>
                <strong>Nastavi svoj cilj korakov:</strong>
              </label>
              <input
                id="stepGoalInput"
                type="number"
                min="1"
                value={newGoalInput}
                onChange={e => setNewGoalInput(e.target.value)}
                placeholder="Vnesite nov cilj"
                disabled={savingGoal}
                style={{
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  width: '120px'
                }}
              />
              <button
                onClick={handleGoalSave}
                disabled={savingGoal}
                style={{
                  marginLeft: '12px',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  backgroundColor: '#4bb0d6',
                  color: '#fff',
                  border: 'none',
                  cursor: savingGoal ? 'not-allowed' : 'pointer'
                }}
              >
                {savingGoal ? 'Shranjujem...' : 'Shrani cilj'}
              </button>
            </div>
          </div>
        ) : (
          <p>Statistika za danes ni na voljo.</p>
        )}
      </div>

      <hr style={{ margin: '20px 0' }} />

      {/* ===== Mesečna statistika: navigacija, povprečja, graf, tabela ===== */}
      <div className="monthly-stats">
        {/* Navigacija med meseci */}
        <div
          className="month-navigation"
          style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}
        >
          <button
            onClick={handlePrevMonth}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              marginRight: '12px',
              cursor: 'pointer'
            }}
          >
            &laquo; Prejšnji
          </button>
          <div style={{ flexGrow: 1, textAlign: 'center', fontWeight: 'bold' }}>
            {new Date(currentYear, currentMonth).toLocaleString('sl-SI', {
              month: 'long',
              year: 'numeric'
            })}
          </div>
          <button
            onClick={handleNextMonth}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              marginLeft: '12px',
              cursor: 'pointer'
            }}
          >
            Naslednji &raquo;
          </button>
        </div>

        {/* Povprečne vrednosti za mesec */}
        <div className="monthly-averages" style={{ marginBottom: '20px' }}>
          <h3>Povprečne vrednosti za ta mesec</h3>
          <div className="stat-box" style={{ margin: '6px 0' }}>
            <strong>Koraki (povp.):</strong> {monthlyAverages.steps}
          </div>
          <div className="stat-box" style={{ margin: '6px 0' }}>
            <strong>Razdalja (km, povp.):</strong> {monthlyAverages.distance}
          </div>
          <div className="stat-box" style={{ margin: '6px 0' }}>
            <strong>Hitrost (m/s, povp.):</strong> {monthlyAverages.speed}
          </div>
          <div className="stat-box" style={{ margin: '6px 0' }}>
            <strong>Temperatura (°C, povp.):</strong> {monthlyAverages.temperature}
          </div>
        </div>

        {/* Izbira metrike za graf */}
        <div
          className="metric-selector"
          style={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}
        >
          <label htmlFor="metricSelect" style={{ marginRight: '8px' }}>
            <strong>Izberi metriko za graf:</strong>
          </label>
          <select
            id="metricSelect"
            value={chartMetric}
            onChange={e => setChartMetric(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              cursor: 'pointer'
            }}
          >
            <option value="steps">Koraki</option>
            <option value="distance">Razdalja (km)</option>
            <option value="speed">Hitrost (m/s)</option>
            <option value="temperature">Temperatura (°C)</option>
          </select>
        </div>

        {/* Stolpični graf */}
        {filteredActivities.length > 0 ? (
          <Bar data={chartData} options={chartOptions} />
        ) : (
          <p>Za ta mesec ni dovolj podatkov za prikaz grafa.</p>
        )}

        {/* Tabela vseh aktivnosti za izbrani mesec */}
        <div className="monthly-table" style={{ marginTop: '30px' }}>
          <h3>
            Tabela dnevnih aktivnosti (
            {new Date(currentYear, currentMonth).toLocaleString('sl-SI', {
              month: 'long',
              year: 'numeric'
            })}
            )
          </h3>
          {filteredActivities.length > 0 ? (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginTop: '12px'
              }}
            >
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>
                    Datum
                  </th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>
                    Koraki
                  </th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>
                    Razdalja (km)
                  </th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>
                    Hitrost (m/s)
                  </th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>
                    Temperatura (°C)
                  </th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>
                    Vreme
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((act, idx) => {
                  const d = new Date(act.timestamp);
                  return (
                    <tr key={idx}>
                      <td
                        style={{
                          border: '1px solid #ddd',
                          padding: '8px',
                          textAlign: 'center'
                        }}
                      >
                        {d.toLocaleDateString('sl-SI')}
                      </td>
                      <td
                        style={{
                          border: '1px solid #ddd',
                          padding: '8px',
                          textAlign: 'center'
                        }}
                      >
                        {act.steps}
                      </td>
                      <td
                        style={{
                          border: '1px solid #ddd',
                          padding: '8px',
                          textAlign: 'center'
                        }}
                      >
                        {act.distance != null
                          ? act.distance.toFixed(2)
                          : '0.00'}
                      </td>
                      <td
                        style={{
                          border: '1px solid #ddd',
                          padding: '8px',
                          textAlign: 'center'
                        }}
                      >
                        {act.speed != null ? act.speed.toFixed(2) : '0.00'}
                      </td>
                      <td
                        style={{
                          border: '1px solid #ddd',
                          padding: '8px',
                          textAlign: 'center'
                        }}
                      >
                        {act.weather &&
                        typeof act.weather.temperature === 'number'
                          ? act.weather.temperature.toFixed(1)
                          : '–'}
                      </td>
                      <td
                        style={{
                          border: '1px solid #ddd',
                          padding: '8px',
                          textAlign: 'center'
                        }}
                      >
                        {act.weather?.conditions || '–'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p>Ni podatkov za prikaz mesečne tabele.</p>
          )}
        </div>
      </div>
    </div>
  );
}
