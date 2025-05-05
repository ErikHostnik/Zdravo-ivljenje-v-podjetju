const axios = require('axios');

// Lokacija (npr. Ljubljana) - verjetn bomo pridobil pol podatke na lokacijo dirkento
const latitude = 46.0569;
const longitude = 14.5058;

const DATA_SOURCE_URL = 'https://api.open-meteo.com/v1/forecast';
const API_ENDPOINT = 'http://localhost:3000/api/weatherdata';

async function scrapeAndSendData() {
  try {
    const response = await axios.get(DATA_SOURCE_URL, {
      params: {
        latitude,
        longitude,
        current_weather: true,
        timezone: 'auto'
      }
    });

    const weather = response.data.current_weather;

    if (!weather) {
      console.log('⚠ Ni podatkov o trenutnem vremenu.');
      return;
    }

    // Pretvori kodo vremena v besedni opis
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

    const weatherData = {
      temperature: weather.temperature,
      weatherConditions: weatherCodes[weather.weathercode] || 'unknown',
      location: {
        lat: latitude,
        lon: longitude
      }
    };

    const result = await axios.post(API_ENDPOINT, weatherData);
    console.log('✔ Poslano v API:', result.data);

  } catch (err) {
    console.error('❌ Napaka pri pridobivanju ali pošiljanju podatkov:', err.message);
  }
}

scrapeAndSendData();
