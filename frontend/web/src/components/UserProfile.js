import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await axios.get('/api/user/:id'); // ← popravi po potrebi
        setUser(response.data.user);
        setStats(response.data.stats);
      } catch (error) {
        console.error('Napaka pri pridobivanju podatkov:', error);
        setUser({
          username: "Napaka pri nalaganju",
          email: "ni podatkov"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  if (loading) return <div>Nalaganje podatkov...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Profil uporabnika</h2>
      <p><strong>Uporabniško ime:</strong> {user?.username}</p>
      <p><strong>Email:</strong> {user?.email}</p>
      <hr />
      <h3>Statistika gibanja</h3>
      {stats ? (
        <>
          <p><strong>Število korakov:</strong> {stats.steps}</p>
          <p><strong>Povprečna hitrost:</strong> {stats.avgSpeed} km/h</p>
          <p><strong>Najvišja hitrost:</strong> {stats.maxSpeed} km/h</p>
          <p><strong>Najnižja hitrost:</strong> {stats.minSpeed} km/h</p>
        </>
      ) : (
        <p>Ni statistike na voljo.</p>
      )}
    </div>
  );
}
