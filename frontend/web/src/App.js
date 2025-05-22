// App.js
import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UserContext } from "./userContext";
import 'leaflet/dist/leaflet.css';

import Header from "./components/Header";
import Login from "./components/Login";
import Logout from "./components/Logout";
import Register from './components/Register';
import Map from './components/Map';
import UserProfile from './components/UserProfile';

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
          <Header title="Zdravo življenje v podjetju" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/map" element={<Map />} />
            <Route path="/userProfile/:userId" element={<UserProfile />} />
            <Route path="/logout" element={<Logout />} />
          </Routes>
        </div>
      </UserContext.Provider>
    </BrowserRouter>
  );
}

export default App;
