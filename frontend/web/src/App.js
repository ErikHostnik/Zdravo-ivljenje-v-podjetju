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
    // Ob začetnem nalaganju preverimo, če so podatki v localStorage
    const storedUser = localStorage.getItem('User');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const updateUserData = (userInfo) => {
    if (userInfo) {
      localStorage.setItem('User', JSON.stringify(userInfo));  // Shrani v localStorage
    } else {
      localStorage.removeItem('User');  // Odstrani iz localStorage, če se uporabnik odjavi
    }
    setUser(userInfo);  // Posodobi stanje uporabnika
  };

  return (
    <BrowserRouter>
      <UserContext.Provider value={{
        user: user,
        setUserContext: updateUserData
      }}>
        <div className="App">
        <Header title="Zdravo življenje v podjetju"></Header>
          <Routes>
            <Route path="/login" exact element={<Login />} />
            <Route path="/register" exact element={<Register />} />
            <Route path="/map" exact element={<Map />} />
            <Route path="/userProfile" exact element={<UserProfile />} />
            <Route path="/logout" element={<Logout />} />
          </Routes>
        </div>
      </UserContext.Provider>
    </BrowserRouter>
  );
}

export default App;
