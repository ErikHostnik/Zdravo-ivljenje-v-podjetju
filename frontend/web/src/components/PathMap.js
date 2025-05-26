import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

export default function PathMap() {
  const { userId } = useParams();
  const [paths, setPaths] = useState([]);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllActivityPaths = async () => {
      try {
        const token = localStorage.getItem('token');

        const userRes = await axios.get(`http://localhost:3001/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const activityIdsRaw = userRes.data.activities || [];
        if (activityIdsRaw.length === 0) {
          setPaths([]);
          setLoading(false);
          return;
        }

        const activityIds = activityIdsRaw.map(id => {
          if (typeof id === 'string') return id;
          if (typeof id === 'object' && id._id) return id._id;
          return String(id);
        });

        const fetches = activityIds.map(id =>
          axios.get(`http://localhost:3001/api/sensordata/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        );

        const results = await Promise.all(fetches);

        const allPaths = results.map(res => {
          const sessionPoints = res.data.session || [];
          const points = sessionPoints
            .filter(p => p.latitude && p.longitude)
            .map(p => [p.latitude, p.longitude]);

          let dateFromSession = null;
          if (sessionPoints.length > 0) {
            dateFromSession = sessionPoints.find(p => p.timestamp || p.date);
            if (dateFromSession) {
              dateFromSession = dateFromSession.timestamp || dateFromSession.date;
            }
          }

          const date = dateFromSession || res.data.date || res.data.createdAt || new Date().toISOString();

          return { date, points };
        }).filter(p => p.points.length > 0);

        setPaths(allPaths);
        setCurrentPathIndex(allPaths.length - 1);
      } catch (error) {
        console.error("Napaka pri nalaganju poti:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllActivityPaths();
  }, [userId]);

  const handlePrev = () => {
    setCurrentPathIndex(prev => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    setCurrentPathIndex(prev => Math.min(prev + 1, paths.length - 1));
  };

  if (loading) return <p>Loading path...</p>;
  if (paths.length === 0) return <p>Ni poti za prikaz.</p>;

  const currentPath = paths[currentPathIndex];
  const currentDateFormatted = new Date(currentPath.date).toLocaleString('sl-SI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div style={{ height: '80vh', width: '100%', position: 'relative' }}>
      <MapContainer 
        center={currentPath.points[0] || [46.0569, 14.5058]} 
        zoom={18} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {currentPath.points.length > 0 && (
          <>
            <Marker position={currentPath.points[0]}>
              <Popup>Začetek</Popup>
            </Marker>
            <Marker position={currentPath.points[currentPath.points.length - 1]}>
              <Popup>Konec</Popup>
            </Marker>
            <Polyline positions={currentPath.points} color="blue" />
          </>
        )}
      </MapContainer>

      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        backgroundColor: 'white',
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        zIndex: 1000,
      }}>
        <button onClick={handlePrev} disabled={currentPathIndex === 0}>←</button>
        <span style={{ color: 'black', fontWeight: 'bold' }}>
          {currentDateFormatted}
        </span>
        <button onClick={handleNext} disabled={currentPathIndex === paths.length - 1}>→</button>
      </div>
    </div>
  );
}
