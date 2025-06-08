// frontend/web/src/components/AnalyticsDashboard.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export default function AnalyticsDashboard() {
    const [stepsData, setStepsData] = useState([]);
    const [usersData, setUsersData] = useState([]);
    const days = 7;

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const token = localStorage.getItem('token');
                const [stepsRes, usersRes] = await Promise.all([
                    axios.get(`/api/analytics/global-steps?days=${days}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`/api/analytics/active-users-per-day?days=${days}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);
                setStepsData(stepsRes.data);
                setUsersData(usersRes.data);
            } catch (err) {
                console.error('Analytics fetch error:', err);
            }
        };
        fetchAll();
    }, []);

    const labels = stepsData.map(d => d.date);
    const stepsDataset = {
        label: 'Globalni koraki',
        data: stepsData.map(d => d.totalSteps),
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
        yAxisID: 'y1'
    };
    const usersDataset = {
        label: 'Aktivni uporabniki',
        data: usersData.map(d => d.count),
        borderColor: 'rgba(255,159,64,1)',
        backgroundColor: 'rgba(255,159,64,0.2)',
        yAxisID: 'y2'
    };

    const options = {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        stacked: false,
        plugins: {
            title: {
                display: true,
                text: 'Globalna Analitika (zadnjih 7 dni)',
                color: '#FFFFFF',
                font: { size: 20 }
            },
            legend: {
                labels: {
                    color: '#FFFFFF'
                }
            }
        },
        scales: {
            x: {
                ticks: { color: '#FFFFFF' },
                grid: { color: 'rgba(255,255,255,0.1)' }
            },
            y1: {
                type: 'linear',
                position: 'left',
                title: {
                    display: true,
                    text: 'Steps',
                    color: '#FFFFFF'
                },
                ticks: { color: '#FFFFFF' }
            },
            y2: {
                type: 'linear',
                position: 'right',
                title: {
                    display: true,
                    text: 'Active Users',
                    color: '#FFFFFF'
                },
                ticks: { color: '#FFFFFF' },
                grid: { drawOnChartArea: false }
            }
        }
    };

    return (
        <div style={{ padding: '20px', color: 'white' }}>
            <h2 style={{ color: '#FFFFFF' }}>Analitika Globalnih Podatkov</h2>
            <Line options={options} data={{ labels, datasets: [stepsDataset, usersDataset] }} />
        </div>
    );
}
