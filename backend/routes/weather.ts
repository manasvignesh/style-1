import { Router, Request, Response } from 'express';

const router = Router();

function getFallbackCoords(city: string) {
  const normalized = city.toLowerCase();
  if (normalized.includes('delhi')) return { latitude: 28.6139, longitude: 77.2090, city: 'Delhi' };
  if (normalized.includes('mumbai')) return { latitude: 19.0760, longitude: 72.8777, city: 'Mumbai' };
  if (normalized.includes('chennai')) return { latitude: 13.0827, longitude: 80.2707, city: 'Chennai' };
  if (normalized.includes('hyderabad')) return { latitude: 17.3850, longitude: 78.4867, city: 'Hyderabad' };
  if (normalized.includes('kolkata')) return { latitude: 22.5726, longitude: 88.3639, city: 'Kolkata' };
  return { latitude: 12.9716, longitude: 77.5946, city: 'Bengaluru' };
}

function describeWeatherCode(code: number) {
  if ([0, 1].includes(code)) return { main: 'Clear', condition: 'clear sky' };
  if ([2, 3].includes(code)) return { main: 'Clouds', condition: 'cloudy' };
  if ([45, 48].includes(code)) return { main: 'Mist', condition: 'misty' };
  if ([51, 53, 55, 56, 57].includes(code)) return { main: 'Drizzle', condition: 'light drizzle' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { main: 'Rain', condition: 'rainy' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { main: 'Snow', condition: 'snowy' };
  if ([95, 96, 99].includes(code)) return { main: 'Thunderstorm', condition: 'stormy' };
  return { main: 'Clear', condition: 'mild weather' };
}

router.get('/current', async (req: Request, res: Response): Promise<void> => {
  const apiKey = process.env.WEATHER_API_KEY;
  const lat = typeof req.query.lat === 'string' ? req.query.lat : '';
  const lon = typeof req.query.lon === 'string' ? req.query.lon : '';
  const city = typeof req.query.city === 'string' && req.query.city.trim()
    ? req.query.city.trim()
    : 'Bengaluru';

  try {
    if (apiKey) {
      const params = new URLSearchParams({
        appid: apiKey,
        units: 'metric',
      });

      if (lat && lon) {
        params.set('lat', lat);
        params.set('lon', lon);
      } else {
        params.set('q', city);
      }

      const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        res.json({
          city: data.name,
          country: data.sys?.country,
          tempC: Math.round(data.main?.temp),
          feelsLikeC: Math.round(data.main?.feels_like),
          humidity: data.main?.humidity,
          windKph: Math.round((data.wind?.speed || 0) * 3.6),
          main: data.weather?.[0]?.main || 'Clear',
          condition: data.weather?.[0]?.description || 'clear sky',
          source: 'openweathermap',
        });
        return;
      }
    }

    const fallback = lat && lon
      ? { latitude: Number(lat), longitude: Number(lon), city: 'your area' }
      : getFallbackCoords(city);
    const fallbackParams = new URLSearchParams({
      latitude: String(fallback.latitude),
      longitude: String(fallback.longitude),
      current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m',
    });
    const fallbackResponse = await fetch(`https://api.open-meteo.com/v1/forecast?${fallbackParams.toString()}`);
    const fallbackData = await fallbackResponse.json();

    if (!fallbackResponse.ok) {
      res.status(fallbackResponse.status).json({ error: fallbackData?.reason || 'Failed to fetch weather' });
      return;
    }

    const current = fallbackData.current;
    const description = describeWeatherCode(Number(current.weather_code));
    res.json({
      city: fallback.city,
      tempC: Math.round(current.temperature_2m),
      feelsLikeC: Math.round(current.apparent_temperature),
      humidity: current.relative_humidity_2m,
      windKph: Math.round(current.wind_speed_10m),
      ...description,
      source: 'open-meteo',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Weather service failed' });
  }
});

export default router;
