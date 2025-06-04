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
  const [error, setError] = useState(null);

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

        const allPaths = results.map((res, index) => {
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
          
          return { 
            id: activityIds[index],
            date, 
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

  const handleActivityClick = (index) => {
    setCurrentPathIndex(index);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '80vh' 
      }}>
        <p>Nalaganje aktivnosti...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '80vh' 
      }}>
        <p style={{ color: 'red' }}>Napaka: {error}</p>
      </div>
    );
  }

  if (paths.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '80vh' 
      }}>
        <p>Ni shranjenih aktivnosti za prikaz.</p>
      </div>
    );
  }

  const currentPath = paths[currentPathIndex];

  return (
    <div style={{ 
      display: 'flex', 
      height: '80vh', 
      width: '100%',
      backgroundColor: '#1F2235',
      color: 'white'
    }}>
      {/* Seznam aktivnosti na levi */}
      <div style={{ 
        width: '300px', 
        overflowY: 'auto', 
        borderRight: '1px solid #3A3F67',
        padding: '15px'
      }}>
        <h3 style={{ 
          marginTop: 0, 
          paddingBottom: '10px', 
          borderBottom: '1px solid #3A3F67',
          color: '#FFD700'
        }}>
          Moje aktivnosti
        </h3>
        
        <div style={{ marginTop: '15px' }}>
          {paths.map((path, index) => (
            <div
              key={path.id}
              onClick={() => handleActivityClick(index)}
              style={{
                padding: '12px 15px',
                marginBottom: '10px',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: index === currentPathIndex ? '#3A3F67' : '#2A2E4A',
                borderLeft: index === currentPathIndex ? '4px solid #FFD700' : 'none',
                transition: 'all 0.2s ease',
                ':hover': {
                  backgroundColor: '#3A3F67'
                }
              }}
            >
              <div style={{ 
                fontWeight: index === currentPathIndex ? 'bold' : 'normal',
                color: index === currentPathIndex ? '#FFD700' : '#E0E0FF'
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
        </div>
      </div>

      {/* Zemljevid na desni */}
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
          {currentPath.points.length > 0 && (
            <>
              <Marker position={currentPath.points[0]}>
                <Popup>Začetek</Popup>
              </Marker>
              <Marker position={currentPath.points[currentPath.points.length - 1]}>
                <Popup>Konec</Popup>
              </Marker>
              <Polyline positions={currentPath.points} color="#4CAF50" weight={5} />
            </>
          )}
        </MapContainer>

        {/* Informacije o trenutni aktivnosti */}
        <div style={{
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
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <div style={{
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
            }}>
              {currentPathIndex + 1}
            </div>
            <h3 style={{ 
              margin: 0,
              color: '#FFD700'
            }}>
              {currentPath.formattedDate}
            </h3>
          </div>
          
          <div style={{ color: '#E0E0FF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span><strong>Število točk:</strong></span>
              <span>{currentPath.points.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span><strong>Začetna točka:</strong></span>
              <span>
                {currentPath.points[0][0].toFixed(6)}, {currentPath.points[0][1].toFixed(6)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span><strong>Končna točka:</strong></span>
              <span>
                {currentPath.points[currentPath.points.length - 1][0].toFixed(6)}, 
                {currentPath.points[currentPath.points.length - 1][1].toFixed(6)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}