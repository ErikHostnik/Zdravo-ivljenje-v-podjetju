import { UserContext } from "../userContext";
import { Link } from "react-router-dom";
import '../styles/global.css';

function Header({ title }) {
    return (
        <header className="header">
            <div className="header-container">
                <h1 className="header-title">{title}</h1>
                <nav>
                    <ul className="nav-list">
                        <UserContext.Consumer>
                            {context => (
                                context.user ? (
                                    <>
                                        <li><Link to="/">Home</Link></li>
                                        <li><Link to={`/path/${context.user._id}`}>Path</Link></li>
                                        <li><Link to={`/userProfile/${context.user._id}`}>Profile</Link></li>
                                        <li><Link to="/logout">Logout</Link></li>
                                    </>
                                ) : (
                                    <>
                                        <li><Link to="/register">Register</Link></li>
                                        <li><Link to="/login">Login</Link></li>
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
