const axios = require('axios');

const lat = process.argv[2];
const lon = process.argv[3];

if (!lat || !lon) {
  console.error('❌ Latitude and longitude are required.');
  process.exit(1);
}

const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';

(async () => {
  try {
    const response = await axios.get(WEATHER_API_URL, {
      params: {
        latitude: lat,
        longitude: lon,
        current_weather: true,
        timezone: 'auto'
      }
    });

    const weather = response.data.current_weather;
    const weatherCodes = {
      0: 'clear', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast',
      45: 'fog', 48: 'depositing rime fog', 51: 'light drizzle',
      53: 'moderate drizzle', 55: 'dense drizzle', 61: 'light rain',
      63: 'moderate rain', 65: 'heavy rain', 71: 'light snow',
      73: 'moderate snow', 75: 'heavy snow', 80: 'rain showers',
      81: 'moderate rain showers', 82: 'violent rain showers',
      95: 'thunderstorm', 96: 'thunderstorm with hail',
    };

    const conditions = weatherCodes[weather.weathercode] || 'unknown';

    const weatherData = {
      temperature: weather.temperature,
      conditions: conditions
    };

    console.log(JSON.stringify(weatherData)); 
  } catch (error) {
    console.error('❌ Error fetching weather data:', error.message);
  }
})();
