import { UserContext } from "../userContext";
import { Link } from "react-router-dom";

function Header(props) {
    return (
        <header>
            <h1>{props.title}</h1>
            <nav>
                <ul>
                    <UserContext.Consumer>
                        {context => (
                            context.user ?
                                <>
                                    <li><Link to='/logout'>Logout</Link></li>
                                    <li><Link to="/map">Map</Link></li>
                                </>
                            :
                                <>
                                    <li><Link to='/register'>Register</Link></li>
                                    <li><Link to='/login'>Login</Link></li>
                                    
                                </>

                        )}
                    </UserContext.Consumer>
                </ul>
            </nav>
        </header >
    );
}

export default Header;