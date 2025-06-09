import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function FlyToLocation({ position }) {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo(position, 15);
        }
    }, [position, map]);
    return null;
}

export default function AllSessions() {
    const [sessions, setSessions] = useState([]);
    const [userMap, setUserMap] = useState({});
    const [selectedSessionIndex, setSelectedSessionIndex] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const mapContainerRef = useRef(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const token = localStorage.getItem('token');
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const [sessRes, usersRes] = await Promise.all([
                    axios.get('/api/sensordata', { headers }),
                    axios.get('/api/users', { headers })
                ]);

                setSessions(sessRes.data || []);

                const userMapData = {};
                (usersRes.data || []).forEach(u => {
                    userMapData[u._id] = u.username;
                });
                setUserMap(userMapData);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError(err.response?.data?.message || err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedSessionIndex !== null && mapContainerRef.current) {
            mapContainerRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedSessionIndex]);

    if (loading) return <p>Nalaganje vseh sej…</p>;
    if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
    if (!sessions.length) return <p>Ni najdenih sej.</p>;

    const allPoints = sessions.flatMap(s => (s.session || s.activity || []).map(p => [p.latitude, p.longitude]));
    const selectedPts = selectedSessionIndex !== null
        ? (sessions[selectedSessionIndex].session || sessions[selectedSessionIndex].activity || []).map(p => [p.latitude, p.longitude])
        : null;

    return (
        <div style={{ padding: 20 }}>
            <h2>Vse naprave — surove seje</h2>

            {/* Map View */}
            <div style={{ height: 400, marginBottom: 20 }} ref={mapContainerRef}>
                <MapContainer
                    center={selectedPts?.[0] || allPoints[0] || [46.0569, 14.5058]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution="&copy; OpenStreetMap contributors"
                        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {selectedPts && <FlyToLocation position={selectedPts[0]} />}

                    {(selectedPts
                        ? [selectedPts]
                        : sessions.map(s => (s.session || s.activity || []).map(p => [p.latitude, p.longitude]))
                    ).map((line, i) => (
                        <Polyline
                            key={i}
                            positions={line}
                            weight={selectedPts ? 5 : 2}
                            opacity={selectedPts ? 1 : 0.7}
                        />
                    ))}

                    {/* Highlight start point with a red circle */}
                    {selectedPts && (
                        <CircleMarker
                            center={selectedPts[0]}
                            radius={10}
                            pathOptions={{ fillColor: 'red', color: 'red' }}
                        />
                    )}
                </MapContainer>
            </div>

            {/* Sessions Table */}
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
                                <td>
                                    <button
                                        onClick={() => setSelectedSessionIndex(idx)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'white',
                                            cursor: 'pointer',
                                            textDecoration: 'underline'
                                        }}
                                    >
                                        {username}
                                    </button>
                                </td>
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
