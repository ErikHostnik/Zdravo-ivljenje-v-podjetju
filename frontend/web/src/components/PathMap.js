// src/components/PathMap.js

import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

// Dodamo react-datepicker
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { registerLocale } from 'react-datepicker';
import sl from 'date-fns/locale/sl';
registerLocale('sl', sl);

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
  const [error, setError] = useState(null);

  // novo: izbrani datum za filtriranje
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    const fetchAllActivityPaths = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Manjka prijavni token.');

        const userRes = await axios.get(`http://localhost:3001/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const activityIdsRaw = userRes.data.activities || [];
        if (activityIdsRaw.length === 0) {
          setPaths([]);
          setLoading(false);
          return;
        }

        const activityIds = activityIdsRaw.map(id =>
          typeof id === 'string' ? id : (id._id ? id._id : String(id))
        );

        const fetches = activityIds.map(id =>
          axios.get(`http://localhost:3001/api/sensordata/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        );
        const results = await Promise.all(fetches);

        const allPaths = results.map((res, index) => {
          const sessionPoints = res.data.session || [];
          const points = sessionPoints
            .filter(p => p.latitude && p.longitude)
            .map(p => [p.latitude, p.longitude]);

          // poskušamo dobiti timestamp
          let dateVal = null;
          if (sessionPoints.length) {
            const p = sessionPoints.find(p => p.timestamp || p.date);
            dateVal = p ? (p.timestamp || p.date) : null;
          }
          const date = dateVal || res.data.date || res.data.createdAt || new Date().toISOString();

          return {
            id: activityIds[index],
            date, 
            // za enostavno primerjavo današnjega datuma
            justDate: new Date(date).toISOString().substring(0, 10),
            points,
            formattedDate: new Date(date).toLocaleString('sl-SI', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          };
        }).filter(p => p.points.length > 0);

        setPaths(allPaths);
        setCurrentPathIndex(allPaths.length - 1);
      } catch (error) {
        console.error("Napaka pri nalaganju poti:", error);
        setError(error.response?.data?.message || error.message || 'Napaka pri nalaganju poti');
      } finally {
        setLoading(false);
      }
    };

    fetchAllActivityPaths();
  }, [userId]);

  const handleActivityClick = index => setCurrentPathIndex(index);

  if (loading) {
    return <div style={loadingStyle}><p>Nalaganje aktivnosti...</p></div>;
  }
  if (error) {
    return <div style={loadingStyle}><p style={{ color: 'red' }}>Napaka: {error}</p></div>;
  }
  if (paths.length === 0) {
    return <div style={loadingStyle}><p>Ni shranjenih aktivnosti za prikaz.</p></div>;
  }

  // filtriramo po izbranem datumu
  const filteredPaths = selectedDate
    ? paths.filter(p => p.justDate === selectedDate.toISOString().substring(0, 10))
    : paths;

  // Če ni nobene aktivnosti za ta datum, prikažemo sporočilo
  if (filteredPaths.length === 0) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '80vh',
        color: 'white',
        backgroundColor: '#1F2235'
      }}>
        <p>Ni aktivnosti za izbrani datum.</p>
      </div>
    );
  }

  // poskrbimo, da je currentPathIndex veljaven
  const validIndex = Math.min(currentPathIndex, filteredPaths.length - 1);
  const currentPath = filteredPaths[validIndex];

  return (
    <div style={containerStyle}>
      {/* Levi stolpec: izbor datuma + seznam aktivnosti */}
      <div style={sidebarStyle}>
        <div style={{ marginBottom: '15px' }}>
          <h3 style={sidebarHeaderStyle}>Moje aktivnosti</h3>
          <DatePicker
            selected={selectedDate}
            onChange={date => {
              setSelectedDate(date);
              setCurrentPathIndex(0);
            }}
            placeholderText="Izberi datum"
            locale="sl"
            dateFormat="dd. MM. yyyy"
            isClearable
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginTop: '15px' }}>
          {filteredPaths.map((path, index) => (
            <div
              key={path.id}
              onClick={() => handleActivityClick(index)}
              style={{
                padding: '12px 15px',
                marginBottom: '10px',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: index === validIndex ? '#3A3F67' : '#2A2E4A',
                borderLeft: index === validIndex ? '4px solid #FFD700' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                fontWeight: index === validIndex ? 'bold' : 'normal',
                color: index === validIndex ? '#FFD700' : '#E0E0FF'
              }}>
                {path.formattedDate}
              </div>
              <div style={{
                fontSize: '0.85rem',
                marginTop: '5px',
                color: '#A0A0C0'
              }}>
                {path.points.length} točk
              </div>
            </div>
          ))}

          {filteredPaths.length === 0 && (
            <p style={{ color: '#E0E0FF' }}>Ni aktivnosti za izbrani datum.</p>
          )}
        </div>
      </div>

      {/* Desni del: zemljevid in info */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={currentPath.points[0] || [46.0569, 14.5058]}
          zoom={18}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={currentPath.points[0]}>
            <Popup>Začetek</Popup>
          </Marker>
          <Marker position={currentPath.points[currentPath.points.length - 1]}>
            <Popup>Konec</Popup>
          </Marker>
          <Polyline positions={currentPath.points} color="#4CAF50" weight={5} />
        </MapContainer>

        <div style={infoBoxStyle}>
          <div style={infoHeaderStyle}>
            <div style={infoAvatarStyle}>{validIndex + 1}</div>
            <h3 style={{ margin: 0, color: '#FFD700' }}>
              {currentPath.formattedDate}
            </h3>
          </div>
          <div style={{ color: '#E0E0FF' }}>
            <div style={infoRowStyle}>
              <span><strong>Število točk:</strong></span>
              <span>{currentPath.points.length}</span>
            </div>
            <div style={infoRowStyle}>
              <span><strong>Začetna točka:</strong></span>
              <span>
                {currentPath.points[0][0].toFixed(6)}, {currentPath.points[0][1].toFixed(6)}
              </span>
            </div>
            <div style={infoRowStyle}>
              <span><strong>Končna točka:</strong></span>
              <span>
                {currentPath.points.at(-1)[0].toFixed(6)}, {currentPath.points.at(-1)[1].toFixed(6)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// skupni stili
const loadingStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '80vh'
};
const containerStyle = {
  display: 'flex',
  height: '80vh',
  width: '100%',
  backgroundColor: '#1F2235',
  color: 'white'
};
const sidebarStyle = {
  width: '300px',
  overflowY: 'auto',
  borderRight: '1px solid #3A3F67',
  padding: '15px'
};
const sidebarHeaderStyle = {
  marginTop: 0,
  paddingBottom: '10px',
  borderBottom: '1px solid #3A3F67',
  color: '#FFD700'
};
const infoBoxStyle = {
  position: 'absolute',
  top: '10px',
  left: '10px',
  backgroundColor: 'rgba(31, 34, 53, 0.85)',
  padding: '15px',
  borderRadius: '8px',
  zIndex: 1000,
  color: 'white',
  border: '1px solid #3A3F67',
  maxWidth: '400px'
};
const infoHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '10px'
};
const infoAvatarStyle = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  backgroundColor: '#4F536F',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: '12px',
  fontWeight: 'bold',
  fontSize: '18px',
  color: '#FFD700'
};
const infoRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '8px'
};
