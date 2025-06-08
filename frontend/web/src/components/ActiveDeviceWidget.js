import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ActiveDeviceWidget() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const fetchCount = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/metrics/active-devices', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCount(res.data.count);
            } catch (err) {
                console.error('Error fetching active devices:', err);
            }
        };

        fetchCount();
        const interval = setInterval(fetchCount, 10000); // every 10s
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ color: '#00E0A3', marginLeft: '1rem' }}>
            📡 {count} devices online
        </div>
    );
}
