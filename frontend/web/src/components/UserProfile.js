import React from 'react';

export default function UserProfile() {
  const user = JSON.parse(localStorage.getItem('user')) || {
    username: "Neznan uporabnik",
    email: "ni e-pošte"
  };

  const testStats = {
    steps: 12345,
    avgSpeed: 1.5, // km/h
    maxSpeed: 3.2,
    minSpeed: 0.8
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Profil uporabnika</h2>
      <p><strong>Uporabniško ime:</strong> {user.username}</p>
      <p><strong>Email:</strong> {user.email}</p>
      <hr />
      <h3>Statistika gibanja</h3>
      <p><strong>Število korakov:</strong> {testStats.steps}</p>
      <p><strong>Povprečna hitrost:</strong> {testStats.avgSpeed} km/h</p>
      <p><strong>Najvišja hitrost:</strong> {testStats.maxSpeed} km/h</p>
      <p><strong>Najnižja hitrost:</strong> {testStats.minSpeed} km/h</p>
    </div>
  );
}
