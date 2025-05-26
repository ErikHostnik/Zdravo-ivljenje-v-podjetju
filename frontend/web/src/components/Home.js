import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../userContext';

export default function Home() {
  const { user } = useContext(UserContext);

  return (
    <div>
      <h1>Dobrodošel{user ? `, ${user.username}` : ''}!</h1>

      
    </div>
  );
}
