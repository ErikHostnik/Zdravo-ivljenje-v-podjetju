import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../userContext';

export default function Home() {
  const { user } = useContext(UserContext);

  return (
    <div>
      <h1>Dobrodošel{user ? `, ${user.username}` : ''}!</h1>

      {user
        ? (
          <Link to="/logout">Logout</Link>
        )
        : (
          <>
            <Link to="/login">Login</Link> |{' '}
            <Link to="/register">Register</Link> |{' '}
            <Link to="/map">Map</Link>
          </>
        )
      }
    </div>
  );
}
