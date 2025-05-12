import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Popravi privzeto ikono Markera (Leaflet v CRA postavitvi sicer ne najde ikon)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

export default function Map() {
  const mockLocation = {
    latitude: 46.0569,  // Ljubljana center
    longitude: 14.5058,
    label: 'Mock GPS lokacija'
  };

  return (
    <div style={{ height: '50vh', width: '100%' }}>
      <MapContainer 
        center={[mockLocation.latitude, mockLocation.longitude]} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[mockLocation.latitude, mockLocation.longitude]}>
          <Popup>
            {mockLocation.label}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
