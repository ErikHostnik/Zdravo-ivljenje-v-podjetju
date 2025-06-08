import React from 'react';
import { UserContext } from "../userContext";
import { Link } from "react-router-dom";
import '../styles/global.css';
import ActiveDeviceWidget from './ActiveDeviceWidget';

function Header({ title }) {
    return (
        <header className="header">
            <div className="header-container">
                <h1 className="header-title">{title}</h1>

                {/* only show device count when a user is logged in */}
                <UserContext.Consumer>
                    {({ user }) => user && <ActiveDeviceWidget />}
                </UserContext.Consumer>

                <nav>
                    <ul className="nav-list">
                        <UserContext.Consumer>
                            {context => (
                                context.user ? (
                                    <>
                                        <li><Link to="/">Domov</Link></li>
                                        <li><Link to={`/path/${context.user._id}`}>Zemljevid</Link></li>
                                        <li><Link to={`/userProfile/${context.user._id}`}>Profil</Link></li>
                                        <li><Link to="/leaderboard">Lestvica najboljših</Link></li>
                                        <li><Link to="/logout">Odjava</Link></li>
                                    </>
                                ) : (
                                    <>
                                        <li><Link to="/register">Registracija</Link></li>
                                        <li><Link to="/login">Prijava</Link></li>
                                    </>
                                )
                            )}
                        </UserContext.Consumer>
                    </ul>
                </nav>
            </div>
        </header>
    );
}

export default Header;
