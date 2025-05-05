import { useEffect, useContext } from 'react';
import { UserContext } from '../userContext';
import { Navigate } from 'react-router-dom';

function Logout() {
    const userContext = useContext(UserContext);

    useEffect(() => {
        const logout = async () => {
            userContext.setUserContext(null);
            

            
            localStorage.removeItem('User'); // Odstrani uporabniške podatke iz localStorage
        }

        logout();
    }, [userContext]);  // Poskrbi, da se useEffect izvede, ko je uporabnik odjavljen

    return <Navigate replace to="/" />;
}

export default Logout;
