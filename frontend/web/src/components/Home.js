import React, { useContext } from 'react';
import { UserContext } from '../userContext';
import { Link } from 'react-router-dom';
import '../styles/global.css'; 
import runningImg from '../assets/running.jpg'; 
import teamworkImg from '../assets/teamwork.jpg'; 
import goalsImg from '../assets/goals.jpg'; 

export default function Home() {
  const { user } = useContext(UserContext);

  return (
    <div className="home-container">
      <h1 className="home-title">
        Dobrodošel{user ? `, ${user.username}` : ''} v Fit Office!
      </h1>

      <p className="home-description">
        Naša aplikacija Fit Office spodbuja zdravo življenje v podjetju. Spremljaj svoje aktivnosti, primerjaj rezultate s sodelavci in ostani motiviran na poti do boljšega počutja.
      </p>

      <div className="home-cards">
        <div className="home-card">
          <img src={runningImg} alt="Running" />
          <h3>Spremljaj Aktivnosti</h3>
          <p>Beleži korake, razdalje in kalorije, ter spremljaj napredek na poti do boljšega zdravja.</p>
        </div>

        <div className="home-card">
          <img src={teamworkImg} alt="Teamwork" />
          <h3>Primerjaj z Ekipo</h3>
          <p>Oglej si rezultate svojih sodelavcev in se poveži z njimi preko skupnih izzivov.</p>
        </div>

        <div className="home-card">
          <img src={goalsImg} alt="Goals" />
          <h3>Postavljaj Cilje</h3>
          <p>Postavi si cilje, sledi napredku in dosezi osebne mejnike v aplikaciji.</p>
        </div>
      </div>

      {!user && (
        <p style={{ marginTop: '2rem' }}>
          <Link to="/login" style={{ color: 'var(--accent-color)', fontWeight: '600', textDecoration: 'underline' }}>  Prijavi se </Link> za začetek!
        </p>
      )}
    </div>
  );
}
