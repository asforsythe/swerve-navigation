const API_CONFIG = require('../config/api.config');
const PATHS = require('../config/paths');

class WeatherService {
  constructor() {
    this.xweather = {
      baseUrl: API_CONFIG.xweather.baseUrl,
      apiKey: API_CONFIG.xweather.apiKey
    };
  }

  /**
   * Fetch weather-aware routing data from Xweather
   * @param {Array} routePoints - Array of {lat, lng} coordinates
   * @returns {Promise<Object>} Weather-optimized routing data
   */
  async getXweatherRoute(routePoints) {
    const routeString = routePoints.map(p => `${p.lng},${p.lat}`).join(';');
    const url = `${API_CONFIG.xweather.routing.baseUrl}/route?points=${routeString}&optimize=${API_CONFIG.xweather.routing.optimizeForWeather}&stormBuffer=${API_CONFIG.xweather.routing.stormBufferRadius}`;
    
    const response = await fetch(url, {
      headers: {
        'apikey': this.xweather.apiKey,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Xweather API error: ${response.status}`);
    }
    
    return response.json();
  }
}

export default new WeatherService();