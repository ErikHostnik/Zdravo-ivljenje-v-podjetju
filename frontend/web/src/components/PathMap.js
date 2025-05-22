import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

// Popravi privzete ikonice za Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

export default function PathMap() {
  const { userId } = useParams();
  const [path, setPath] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestActivityPath = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log("Token:", token);

        // 1. Pridobi uporabnika z activities poljem
        const userRes = await axios.get(`http://localhost:3001/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const activityIds = userRes.data.activities;
        if (!activityIds || activityIds.length === 0) {
          console.warn("No activities found for user");
          setLoading(false);
          return;
        }

        // 2. Pridobi najnovejšo aktivnost
        const latestActivityIdRaw = activityIds[activityIds.length - 1];
        const latestActivityId = typeof latestActivityIdRaw === 'string'
          ? latestActivityIdRaw
          : (latestActivityIdRaw._id || latestActivityIdRaw.toString());

        console.log("Latest Activity ID:", latestActivityId);

        // 3. Pridobi SensorData (kjer so GPS točke v 'session', ne 'activity')
        const activityRes = await axios.get(`http://localhost:3001/api/sensordata/${latestActivityId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const sessionPoints = activityRes.data.session;
        console.log("SensorData response:", activityRes.data);

        // 4. Ustvari pot iz latitude/longitude parov
        const points = sessionPoints
          .filter(point => point.latitude && point.longitude)
          .map(point => [point.latitude, point.longitude]);

        setPath(points);
      } catch (error) {
        console.error("Napaka pri nalaganju poti:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestActivityPath();
  }, [userId]);

  return (
    <div style={{ height: '80vh', width: '100%' }}>
      {loading ? (
        <p>Loading path...</p>
      ) : (
        <MapContainer 
          center={path[0] || [46.0569, 14.5058]} 
          zoom={18} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {path.length > 0 && (
            <>
              <Marker position={path[0]}>
                <Popup>Začetek</Popup>
              </Marker>
              <Marker position={path[path.length - 1]}>
                <Popup>Konec</Popup>
              </Marker>
              <Polyline positions={path} color="blue" />
            </>
          )}
        </MapContainer>
      )}
    </div>
  );
}
