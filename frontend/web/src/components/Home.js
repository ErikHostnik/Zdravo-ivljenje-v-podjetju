import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../userContext';
import './Home.css'; // Dodajmo tudi CSS

export default function Home() {
  const { user } = useContext(UserContext);

  return (
    <div className="home-container">
      <div className="welcome-section">
        <h1>Dobrodošel{user ? `, ${user.username}` : ''} v <span className="highlight">Fit Office</span>!</h1>
        <p className="intro-text">
          Naša aplikacija spodbuja zdrav način življenja v podjetju – sledenje aktivnostim, doseganje ciljev in motiviranje sodelavcev.
        </p>
        
      </div>

      <div className="features-section">
        <div className="feature-card">
          <img src="https://source.unsplash.com/featured/?walking" alt="Začni svojo aktivnost" />
          <h3>Začni svojo aktivnost</h3>
          <p>Izberi svojo pot – hoja, tek ali kolesarjenje – in aplikacija bo zabeležila tvoje rezultate.</p>
        </div>
        <div className="feature-card">
          <img src="https://source.unsplash.com/featured/?statistics" alt="Spremljaj napredek" />
          <h3>Spremljaj napredek</h3>
          <p>Preglej svoje korake, prehojeno razdaljo, porabljene kalorije in še več!</p>
        </div>
        <div className="feature-card">
          <img src="https://source.unsplash.com/featured/?teamwork" alt="Poveži se z ekipo" />
          <h3>Poveži se z ekipo</h3>
          <p>Oglej si dosežke svojih sodelavcev in skupaj dosezite cilje zdravega življenja.</p>
        </div>
      </div>

      {user && (
        <div className="start-button">
          <Link to={`/path/${user._id}`} className="btn primary">Začni Aktivnost</Link>
        </div>
      )}
    </div>
  );
}
