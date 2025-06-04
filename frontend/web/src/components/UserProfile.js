import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, subMonths, subDays, eachDayOfInterval, parseISO } from 'date-fns';
import { sl } from 'date-fns/locale';
import {
  getWeeklyData,
  getYearlyData,
  getLifetimeStats,
  getMonthlyData
} from '../utils/statsHelpers';

import '../styles/global.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Mini helper za izračun avg/min/max iz seznama števil
const calculateSpeedStatsInline = (speeds) => {
  const filtered = speeds.filter(s => s !== undefined && s !== null);
  if (filtered.length === 0) {
    return { avgSpeed: 0, minSpeed: 0, maxSpeed: 0 };
  }
  const minSpeed = Math.min(...filtered);
  const maxSpeed = Math.max(...filtered);
  const sum = filtered.reduce((acc, v) => acc + v, 0);
  const avgSpeed = sum / filtered.length;
  return { avgSpeed, minSpeed, maxSpeed };
};

export default function UserProfile() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stepGoal, setStepGoal] = useState(10000);
  const [newGoalInput, setNewGoalInput] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: subMonths(new Date(), 1),
    end: new Date()
  });
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `http://localhost:3001/api/users/${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setUser(response.data);

        if (response.data.stepGoal) {
          setStepGoal(response.data.stepGoal);
        }
      } catch (error) {
        console.error('Napaka pri pridobivanju podatkov:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  // Memoized statistik
  const stats = useMemo(() => {
    if (!user || !user.dailyStats) return [];
    return [...user.dailyStats].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [user]);

  const filteredStats = useMemo(() => {
    return stats.filter(stat => {
      const statDate = new Date(stat.date);
      return statDate >= dateRange.start && statDate <= dateRange.end;
    });
  }, [stats, dateRange]);

  const weeklyData = useMemo(() => getWeeklyData(stats), [stats]);
  const yearlyData = useMemo(
    () => getYearlyData(stats, yearFilter),
    [stats, yearFilter]
  );
  const lifetimeStats = useMemo(() => getLifetimeStats(stats), [stats]);

  // Izračunanje tedenske povzetne statistike
  const weeklySummary = useMemo(() => {
    if (!weeklyData || weeklyData.length === 0) {
      return {
        totalSteps: 0,
        totalDistance: 0,
        totalAltitude: 0,
        avgSpeed: 0,
        minSpeed: 0,
        maxSpeed: 0
      };
    }
    const totalSteps = weeklyData.reduce((acc, d) => acc + d.stepCount, 0);
    const totalDistance = weeklyData.reduce((acc, d) => acc + d.distance, 0);
    const totalAltitude = weeklyData.reduce(
      (acc, d) => acc + (d.altitudeDistance || 0),
      0
    );
    const speeds = weeklyData.map(d => d.avgSpeed || 0);
    const { avgSpeed, minSpeed, maxSpeed } = calculateSpeedStatsInline(speeds);
    return { totalSteps, totalDistance, totalAltitude, avgSpeed, minSpeed, maxSpeed };
  }, [weeklyData]);

  // Izračunanje mesečne povzetne statistike (na izbranem intervalu dateRange)
  const monthlySummary = useMemo(() => {
    if (!filteredStats || filteredStats.length === 0) {
      return {
        totalSteps: 0,
        totalDistance: 0,
        totalAltitude: 0,
        avgSpeed: 0,
        minSpeed: 0,
        maxSpeed: 0
      };
    }
    const totalSteps = filteredStats.reduce((acc, d) => acc + d.stepCount, 0);
    const totalDistance = filteredStats.reduce((acc, d) => acc + d.distance, 0);
    const totalAltitude = filteredStats.reduce(
      (acc, d) => acc + (d.altitudeDistance || 0),
      0
    );
    const speeds = filteredStats.map(d => d.avgSpeed || 0);
    const { avgSpeed, minSpeed, maxSpeed } = calculateSpeedStatsInline(speeds);
    return { totalSteps, totalDistance, totalAltitude, avgSpeed, minSpeed, maxSpeed };
  }, [filteredStats]);

  // Izračunanje letne povzetne statistike (za izbrano leto)
  const yearlySummary = useMemo(() => {
    const yearStats = stats.filter(stat => {
      const statDate = new Date(stat.date);
      return statDate.getFullYear() === yearFilter;
    });
    if (yearStats.length === 0) {
      return {
        totalSteps: 0,
        totalDistance: 0,
        totalAltitude: 0,
        avgSpeed: 0,
        minSpeed: 0,
        maxSpeed: 0
      };
    }
    const totalSteps = yearStats.reduce((acc, d) => acc + d.stepCount, 0);
    const totalDistance = yearStats.reduce((acc, d) => acc + d.distance, 0);
    const totalAltitude = yearStats.reduce(
      (acc, d) => acc + (d.altitudeDistance || 0),
      0
    );
    const speeds = yearStats.map(d => d.avgSpeed || 0);
    const { avgSpeed, minSpeed, maxSpeed } = calculateSpeedStatsInline(speeds);
    return { totalSteps, totalDistance, totalAltitude, avgSpeed, minSpeed, maxSpeed };
  }, [stats, yearFilter]);

  const latestStat = stats.length > 0 ? stats[stats.length - 1] : null;

  const steps = latestStat ? latestStat.stepCount : 0;
  const distance = latestStat ? latestStat.distance.toFixed(2) : '0.00';
  const calories = (steps * 0.04).toFixed(2);
  const progressPercentage = Math.min((steps / stepGoal) * 100, 100).toFixed(1);

  const speedDisplay =
    latestStat && latestStat.avgSpeed !== undefined && latestStat.avgSpeed !== null
      ? `${latestStat.avgSpeed.toFixed(2)} km/h`
      : 'Ni podatka';

  const altitudeDisplay =
    latestStat && latestStat.altitudeDistance !== undefined && latestStat.altitudeDistance !== null
      ? `${latestStat.altitudeDistance.toFixed(0)} m`
      : 'Ni podatka';

  const handleGoalSave = async () => {
    const parsedGoal = parseInt(newGoalInput);
    if (!isNaN(parsedGoal) && parsedGoal > 0) {
      setSavingGoal(true);
      try {
        const token = localStorage.getItem('token');
        await axios.put(
          `http://localhost:3001/api/users/${userId}`,
          { stepGoal: parsedGoal },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setStepGoal(parsedGoal);
        setNewGoalInput('');
      } catch (error) {
        alert('Napaka pri shranjevanju cilja. Poskusi ponovno.');
      } finally {
        setSavingGoal(false);
      }
    } else {
      alert('Prosim vnesite veljavno pozitivno število.');
    }
  };

  // Konfiguracija za grafikone
  const monthlyChartData = {
    labels: filteredStats.map(stat =>
      format(new Date(stat.date), 'dd. MMM', { locale: sl })
    ),
    datasets: [
      {
        label: 'Koraki',
        data: filteredStats.map(stat => stat.stepCount),
        backgroundColor: 'rgba(75, 192, 192, 0.6)'
      },
      {
        label: 'Razdalja (km)',
        data: filteredStats.map(stat => stat.distance),
        backgroundColor: 'rgba(153, 102, 255, 0.6)'
      }
    ]
  };

  const weeklyChartData = {
    labels: weeklyData.map(day =>
      format(new Date(day.date), 'EEE', { locale: sl })
    ),
    datasets: [
      {
        label: 'Koraki',
        data: weeklyData.map(day => day.stepCount),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.3
      }
    ]
  };

  const yearlyChartData = {
    labels: yearlyData.map(data => data.month),
    datasets: [
      {
        label: 'Povprečni koraki',
        data: yearlyData.map(data => data.avgSteps),
        backgroundColor: 'rgba(255, 159, 64, 0.6)'
      },
      {
        label: 'Skupna razdalja (km)',
        data: yearlyData.map(data => data.totalDistance),
        backgroundColor: 'rgba(54, 162, 235, 0.6)'
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: context => {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            return `${label}: ${Number(value).toLocaleString('sl-SI')}`;
          }
        }
      }
    },
    scales: {
      y: { beginAtZero: true }
    }
  };

  if (loading) {
    return <div className="user-profile">Nalaganje podatkov...</div>;
  }

  return (
    <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      <h2
        style={{
          textAlign: 'center',
          marginBottom: '30px',
          color: 'white',
          fontSize: '2rem'
        }}
      >
        Profil uporabnika
      </h2>

      {/* Osnovni podatki */}
      <div
        style={{
          backgroundColor: '#1F2235',
          padding: '30px',
          borderRadius: '12px',
          marginBottom: '30px',
          color: '#E0E0FF'
        }}
      >
        <p>
          <strong>Uporabniško ime:</strong> {user.username}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
      </div>

      {/* Dnevna statistika */}
      <div
        style={{
          backgroundColor: '#1F2235',
          padding: '30px',
          borderRadius: '12px',
          marginBottom: '30px',
          color: '#E0E0FF'
        }}
      >
        <h3>Današnja statistika</h3>

        {latestStat ? (
          <>
            <div style={{ margin: '20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>0</span>
                <span>{stepGoal.toLocaleString('sl-SI')} korakov</span>
              </div>
              <div
                style={{
                  backgroundColor: '#333',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  margin: '10px 0'
                }}
              >
                <div
                  style={{
                    backgroundColor: '#4CAF50',
                    width: `${progressPercentage}%`,
                    padding: '10px',
                    color: 'white',
                    textAlign: 'center'
                  }}
                >
                  {steps.toLocaleString('sl-SI')}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>{progressPercentage}%</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '20px' }}>
              <div>
                <strong>Razdalja:</strong>
                <br />
                {distance} km
              </div>
              <div>
                <strong>Kalorije:</strong>
                <br />
                {calories}
              </div>
              <div>
                <strong>Hitrost:</strong>
                <br />
                {speedDisplay}
              </div>
              <div>
                <strong>Višina:</strong>
                <br />
                {altitudeDisplay}
              </div>
              <div>
                <strong>Datum:</strong>
                <br />
                {new Date(latestStat.date).toLocaleDateString('sl-SI')}
              </div>
            </div>

            <div style={{ marginTop: '30px' }}>
              <label htmlFor="stepGoalInput">
                <strong>Nastavi dnevni cilj korakov:</strong>
              </label>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <input
                  id="stepGoalInput"
                  type="number"
                  min="1"
                  value={newGoalInput}
                  onChange={e => setNewGoalInput(e.target.value)}
                  placeholder="Vnesite nov cilj"
                  disabled={savingGoal}
                  style={{ padding: '5px' }}
                />
                <button onClick={handleGoalSave} disabled={savingGoal}>
                  {savingGoal ? 'Shranjujem...' : 'Shrani cilj'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <p>Statistika za danes ni na voljo.</p>
        )}
      </div>

      {/* Življenjska statistika */}
      <div
        style={{
          backgroundColor: '#1F2235',
          padding: '30px',
          borderRadius: '12px',
          marginBottom: '30px',
          color: '#E0E0FF'
        }}
      >
        <h3>Življenjska statistika</h3>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-around',
            marginTop: '20px',
            rowGap: '20px'
          }}
        >
          <div>
            <strong>Skupaj korakov:</strong>
            <br />
            {lifetimeStats.totalSteps.toLocaleString('sl-SI')}
          </div>
          <div>
            <strong>Skupaj prehojeno:</strong>
            <br />
            {lifetimeStats.totalDistance.toFixed(2)} km
          </div>
          <div>
            <strong>Porabljenih kalorij:</strong>
            <br />
            {lifetimeStats.totalCalories.toFixed(0)}
          </div>
          <div>
            <strong>Dnevov s podatki:</strong>
            <br />
            {lifetimeStats.daysCount}
          </div>
          <div>
            <strong>Povprečna hitrost:</strong>
            <br />
            {lifetimeStats.avgSpeed.toFixed(2)} km/h
          </div>
          <div>
            <strong>Minimalna hitrost:</strong>
            <br />
            {lifetimeStats.minSpeed.toFixed(2)} km/h
          </div>
          <div>
            <strong>Maksimalna hitrost:</strong>
            <br />
            {lifetimeStats.maxSpeed.toFixed(2)} km/h
          </div>
          <div>
            <strong>Skupna višina:</strong>
            <br />
            {lifetimeStats.totalAltitudeDistance.toFixed(0)} m
          </div>
        </div>
      </div>

      {/* Tedenska statistika */}
      <div
        style={{
          backgroundColor: '#1F2235',
          padding: '30px',
          borderRadius: '12px',
          marginBottom: '30px',
          color: '#E0E0FF'
        }}
      >
        <h3>Tedenska statistika</h3>
        <Line data={weeklyChartData} options={chartOptions} />
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-around',
            marginTop: '20px',
            rowGap: '20px'
          }}
        >
          <div>
            <strong>Skupaj korakov (7 dni):</strong>
            <br />
            {weeklySummary.totalSteps.toLocaleString('sl-SI')}
          </div>
          <div>
            <strong>Skupna razdalja (7 dni):</strong>
            <br />
            {weeklySummary.totalDistance.toFixed(2)} km
          </div>
          <div>
            <strong>Skupna višina (7 dni):</strong>
            <br />
            {weeklySummary.totalAltitude.toFixed(0)} m
          </div>
          <div>
            <strong>Povprečna hitrost (7 dni):</strong>
            <br />
            {weeklySummary.avgSpeed.toFixed(2)} km/h
          </div>
          <div>
            <strong>Minimalna hitrost (7 dni):</strong>
            <br />
            {weeklySummary.minSpeed.toFixed(2)} km/h
          </div>
          <div>
            <strong>Maksimalna hitrost (7 dni):</strong>
            <br />
            {weeklySummary.maxSpeed.toFixed(2)} km/h
          </div>
        </div>
      </div>

      {/* Mesečna statistika */}
      <div
        style={{
          backgroundColor: '#1F2235',
          padding: '30px',
          borderRadius: '12px',
          marginBottom: '30px',
          color: '#E0E0FF'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Mesečna statistika</h3>
          <div>
            <DatePicker
              selected={dateRange.start}
              onChange={date => setDateRange(prev => ({ ...prev, start: date }))}
              selectsStart
              startDate={dateRange.start}
              endDate={dateRange.end}
              locale={sl}
              dateFormat="dd. MMM yyyy"
            />
            <span style={{ margin: '0 10px' }}>do</span>
            <DatePicker
              selected={dateRange.end}
              onChange={date => setDateRange(prev => ({ ...prev, end: date }))}
              selectsEnd
              startDate={dateRange.start}
              endDate={dateRange.end}
              minDate={dateRange.start}
              locale={sl}
              dateFormat="dd. MMM yyyy"
            />
          </div>
        </div>
        <Bar data={monthlyChartData} options={chartOptions} />
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-around',
            marginTop: '20px',
            rowGap: '20px'
          }}
        >
          <div>
            <strong>Skupaj korakov (izbran mesec):</strong>
            <br />
            {monthlySummary.totalSteps.toLocaleString('sl-SI')}
          </div>
          <div>
            <strong>Skupna razdalja (izbran mesec):</strong>
            <br />
            {monthlySummary.totalDistance.toFixed(2)} km
          </div>
          <div>
            <strong>Skupna višina (izbran mesec):</strong>
            <br />
            {monthlySummary.totalAltitude.toFixed(0)} m
          </div>
          <div>
            <strong>Povprečna hitrost (izbran mesec):</strong>
            <br />
            {monthlySummary.avgSpeed.toFixed(2)} km/h
          </div>
          <div>
            <strong>Minimalna hitrost (izbran mesec):</strong>
            <br />
            {monthlySummary.minSpeed.toFixed(2)} km/h
          </div>
          <div>
            <strong>Maksimalna hitrost (izbran mesec):</strong>
            <br />
            {monthlySummary.maxSpeed.toFixed(2)} km/h
          </div>
        </div>
      </div>

      {/* Letna statistika */}
      <div
        style={{
          backgroundColor: '#1F2235',
          padding: '30px',
          borderRadius: '12px',
          color: '#E0E0FF'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Letna statistika ({yearFilter})</h3>
          <div>
            <button onClick={() => setYearFilter(yearFilter - 1)}>&lt;</button>
            <span style={{ margin: '0 10px' }}>{yearFilter}</span>
            <button
              onClick={() => setYearFilter(yearFilter + 1)}
              disabled={yearFilter >= new Date().getFullYear()}
            >
              &gt;
            </button>
          </div>
        </div>
        <Bar data={yearlyChartData} options={chartOptions} />
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-around',
            marginTop: '20px',
            rowGap: '20px'
          }}
        >
          <div>
            <strong>Skupaj korakov ({yearFilter}):</strong>
            <br />
            {yearlySummary.totalSteps.toLocaleString('sl-SI')}
          </div>
          <div>
            <strong>Skupna razdalja ({yearFilter}):</strong>
            <br />
            {yearlySummary.totalDistance.toFixed(2)} km
          </div>
          <div>
            <strong>Skupna višina ({yearFilter}):</strong>
            <br />
            {yearlySummary.totalAltitude.toFixed(0)} m
          </div>
          <div>
            <strong>Povprečna hitrost ({yearFilter}):</strong>
            <br />
            {yearlySummary.avgSpeed.toFixed(2)} km/h
          </div>
          <div>
            <strong>Minimalna hitrost ({yearFilter}):</strong>
            <br />
            {yearlySummary.minSpeed.toFixed(2)} km/h
          </div>
          <div>
            <strong>Maksimalna hitrost ({yearFilter}):</strong>
            <br />
            {yearlySummary.maxSpeed.toFixed(2)} km/h
          </div>
        </div>
      </div>
    </div>
  );
}
