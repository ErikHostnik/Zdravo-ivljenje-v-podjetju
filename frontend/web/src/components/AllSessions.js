import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function AllSessions() {
    const [sessions, setSessions] = useState([]);
    const [userMap, setUserMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const token = localStorage.getItem('token');
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                // Fetch all sessions and all users in parallel
                const [sessRes, usersRes] = await Promise.all([
                    axios.get('/api/sensordata', { headers }),
                    axios.get('/api/users', { headers })
                ]);

                const sessionsData = sessRes.data || [];
                setSessions(sessionsData);

                // Build userMap from all users
                const usersArray = usersRes.data || [];
                const map = {};
                usersArray.forEach(u => {
                    map[u._id] = u.username;
                });
                setUserMap(map);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError(err.response?.data?.message || err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) return <p>Nalaganje vseh sej…</p>;
    if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
    if (!sessions.length) return <p>Ni najdenih sej.</p>;

    // Flatten points for map bounds
    const allPoints = sessions.flatMap(s => (s.session || s.activity || []).map(p => [p.latitude, p.longitude]));

    return (
        <div style={{ padding: 20 }}>
            <h2>Vse naprave — surove seje</h2>

            {/* Map */}
            <div style={{ height: 400, marginBottom: 20 }}>
                <MapContainer
                    center={allPoints[0] || [46.0569, 14.5058]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution="&copy; OpenStreetMap contributors"
                        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {sessions.map((s, i) => {
                        const pts = s.session || s.activity || [];
                        return pts.length ? (
                            <Polyline
                                key={i}
                                positions={pts.map(p => [p.latitude, p.longitude])}
                                weight={2}
                                opacity={0.7}
                            />
                        ) : null;
                    })}
                </MapContainer>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th>Uporabnik</th>
                        <th>Točk</th>
                        <th>Prva aktivnost</th>
                        <th>Zadnja aktivnost</th>
                    </tr>
                </thead>
                <tbody>
                    {sessions.map((s, idx) => {
                        const pts = s.session || s.activity || [];
                        const first = pts[0]?.timestamp || '—';
                        const last = pts[pts.length - 1]?.timestamp || '—';
                        const username = userMap[s.user] || s.user;
                        return (
                            <tr key={idx} style={{ borderTop: '1px solid #ccc' }}>
                                <td>{username}</td>
                                <td>{pts.length}</td>
                                <td>{first !== '—' ? new Date(first).toLocaleString() : '—'}</td>
                                <td>{last !== '—' ? new Date(last).toLocaleString() : '—'}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
