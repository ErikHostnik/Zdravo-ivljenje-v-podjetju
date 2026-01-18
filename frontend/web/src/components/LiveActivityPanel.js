import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl
});

const API_BASE = 'http://localhost:3001';
const MAX_POINTS = 300;

export default function LiveActivityPanel({ userId }) {
  const [connected, setConnected] = useState(false);
  const [last, setLast] = useState(null);
  const [samples, setSamples] = useState([]);
  const [path, setPath] = useState([]);
  const [savedInfo, setSavedInfo] = useState(null);
  const esRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !userId) return;

    const url = `${API_BASE}/api/stream/live/${encodeURIComponent(userId)}?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    const onStatus = () => setConnected(true);
    const onSample = (ev) => {
      setConnected(true);
      let obj;
      try { obj = JSON.parse(ev.data); } catch { return; }
      setLast(obj);

      setSamples(prev => {
        const next = prev.length >= MAX_POINTS ? prev.slice(prev.length - (MAX_POINTS - 1)) : prev.slice();
        next.push(obj);
        return next;
      });

      setPath(prev => {
        const pt = [obj.lat, obj.lon];
        const next = prev.length >= (MAX_POINTS * 2) ? prev.slice(prev.length - (MAX_POINTS * 2 - 1)) : prev.slice();
        next.push(pt);
        return next;
      });
    };

    const onSaved = (ev) => {
      let obj;
      try { obj = JSON.parse(ev.data); } catch { return; }
      setSavedInfo(obj);
    };

    es.addEventListener('status', onStatus);
    es.addEventListener('sample', onSample);
    es.addEventListener('saved', onSaved);
    es.onerror = () => setConnected(false);

    return () => {
      try { es.close(); } catch {}
      esRef.current = null;
    };
  }, [userId]);

  const chartData = useMemo(() => {
    const labels = samples.map((s, i) => s.id ?? i);
    return {
      labels,
      datasets: [
        { label: 'x', data: samples.map(s => s.x), tension: 0.2, pointRadius: 0 },
        { label: 'y', data: samples.map(s => s.y), tension: 0.2, pointRadius: 0 },
        { label: 'z', data: samples.map(s => s.z), tension: 0.2, pointRadius: 0 },
        { label: '|v|', data: samples.map(s => s.mag), tension: 0.2, pointRadius: 0 }
      ]
    };
  }, [samples]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    animation: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#FFFFFF' }
      }
    },
    scales: {
      x: {
        ticks: { color: '#FFFFFF' },
        grid: { color: '#FFFFFF' }
      },
      y: {
        beginAtZero: false,
        ticks: { color: '#FFFFFF' },
        grid: { color: '#FFFFFF' }
      }
    }
  }), []);

  const center = last ? [last.lat, last.lon] : (path[0] ? path[0] : [46.0569, 14.5058]);

  return (
    <div style={{ backgroundColor: '#1f3135', padding: 20, borderRadius: 12, marginBottom: 30, color: '#E0E0FF' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h3 style={{ margin: 0 }}>🟢 Live aktivnost</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontWeight: 700, color: connected ? '#4CAF50' : '#FF5252' }}>
            {connected ? 'Povezano' : 'Ni povezave'}
          </div>
          {savedInfo?.activityId ? (
            <div style={{ color: '#FFC107' }}>Shranjeno: {savedInfo.activityId}</div>
          ) : null}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginTop: 16 }}>
        <div style={{ backgroundColor: '#7caabba6', borderRadius: 12, padding: 12 }}>
          <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 700 }}>📈 Meritve v realnem času</div>
            <div style={{ opacity: 0.9 }}>
              {last ? `koraki: ${last.stepCount} | razdalja: ${Number(last.distance).toFixed(2)} | avg: ${Number(last.avgSpeed).toFixed(2)}` : 'čakam na podatke...'}
            </div>
          </div>
          <Line data={chartData} options={chartOptions} />
        </div>

        <div style={{ backgroundColor: '#14162A', borderRadius: 12, padding: 12 }}>
          <div style={{ marginBottom: 10, fontWeight: 700 }}>🗺️ Pot (pathMap)</div>
          <div style={{ height: 360, borderRadius: 12, overflow: 'hidden' }}>
            <MapContainer center={center} zoom={18} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {path.length > 1 ? <Polyline positions={path} /> : null}
              {last ? <Marker position={[last.lat, last.lon]} /> : null}
            </MapContainer>
          </div>
          {last ? (
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>Lat</b><span>{Number(last.lat).toFixed(6)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>Lon</b><span>{Number(last.lon).toFixed(6)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>Step</b><span>{last.step ? 'DA' : 'NE'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>|v|</b><span>{Number(last.mag).toFixed(3)}</span></div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
