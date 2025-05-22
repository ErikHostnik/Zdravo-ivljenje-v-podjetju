import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

export default function UserProfile() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');

        const response = await axios.get(`http://localhost:3001/api/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        console.log("Odgovor strežnika:", response.data);

        // Ker imaš vse podatke v response.data (user object), shrani ga direktno
        setUser(response.data);

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
  }, [userId]);

  if (loading) return <div>Nalaganje podatkov...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Profil uporabnika</h2>
      <p><strong>Uporabniško ime:</strong> {user?.username}</p>
      <p><strong>Email:</strong> {user?.email}</p>

      <hr />
      <h3>Statistika gibanja</h3>
      {/* Prikaz statistike, če obstaja */}
      {user?.dailyStats && user.dailyStats.length > 0 ? (
        <ul>
          {user.dailyStats.map((stat, idx) => (
            <li key={idx}>
              Datum: {new Date(stat.date).toLocaleDateString()}, Koraki: {stat.stepCount}, Razdalja: {stat.distance.toFixed(2)} km
            </li>
          ))}
        </ul>
      ) : (
        <p>Ni statistike na voljo.</p>
      )}
    </div>
  );
}
