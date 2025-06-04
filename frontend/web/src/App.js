import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UserContext } from "./userContext";
import 'leaflet/dist/leaflet.css';

import Home from './components/Home';
import Header from "./components/Header";
import Login from "./components/Login";
import Logout from "./components/Logout";
import Register from './components/Register';
import UserProfile from './components/UserProfile';
import PathMap from './components/PathMap';
import Leaderboard from './components/Leaderboard';

function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const updateUserData = (userInfo) => {
    if (userInfo) {
      localStorage.setItem('user', JSON.stringify(userInfo));
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
    setUser(userInfo);
  };

  return (
    <BrowserRouter>
      <UserContext.Provider value={{
        user,
        setUserContext: updateUserData
      }}>
        <div className="App">
          <Header title="Fit Office" />
          <Routes>
            <Route path="/" element={<Home />} /> 
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/userProfile/:userId" element={<UserProfile />} />
            <Route path="/leaderboard" element={<Leaderboard/>} />
            <Route path="/path/:userId" element={<PathMap />} />
            <Route path="/logout" element={<Logout />} />
          </Routes>
        </div>
      </UserContext.Provider>
    </BrowserRouter>
  );
}

export default App;
