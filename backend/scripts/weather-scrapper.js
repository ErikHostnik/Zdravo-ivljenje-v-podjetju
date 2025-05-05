const axios = require('axios');

// Dinamična lokacija - simulirano (v praksi bi to prihajalo iz mobilne naprave)
const latitude = 46.5547;
const longitude = 15.6459;

// Open-Meteo API
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';


const BACKEND_API = 'http://localhost:3001/api/sensordata';

async function fetchAndSendWeatherSensorData() {
  try {
    // Pridobi trenutno vreme za lokacijo
    const weatherResponse = await axios.get(WEATHER_API_URL, {
      params: {
        latitude,
        longitude,
        current_weather: true,
        timezone: 'auto'
      }
    });

    const weather = weatherResponse.data.current_weather;

    if (!weather) {
      console.log('⚠ Ni podatkov o trenutnem vremenu.');
      return;
    }

    // Mapa za opis vremenskih kod
    const weatherCodes = {
      0: 'clear',
      1: 'mainly clear',
      2: 'partly cloudy',
      3: 'overcast',
      45: 'fog',
      48: 'depositing rime fog',
      51: 'light drizzle',
      53: 'moderate drizzle',
      55: 'dense drizzle',
      61: 'light rain',
      63: 'moderate rain',
      65: 'heavy rain',
      71: 'light snow',
      73: 'moderate snow',
      75: 'heavy snow',
      80: 'rain showers',
      81: 'moderate rain showers',
      82: 'violent rain showers',
      95: 'thunderstorm',
      96: 'thunderstorm with hail',
    };

    const conditions = weatherCodes[weather.weathercode] || 'unknown';

    // Simulirani podatki
    const sensorPayload = {
      user: 'USER_ID', // simulirano 
      timestamp: new Date(),
      steps: 3120, 
      temperature: 22.1, 
      speed: 4.2, // km/h
      location: {
        lat: latitude,
        lon: longitude
      },
      weather: {
        temperature: weather.temperature,
        conditions
      }
    };

    // Pošlji na backend
    const result = await axios.post(BACKEND_API, sensorPayload);
    console.log('✔ Podatki uspešno poslani:', result.data);

  } catch (err) {
    console.error('❌ Napaka pri zajemu ali pošiljanju podatkov:', err.message);
  }
}

// Zagon
fetchAndSendWeatherSensorData();
