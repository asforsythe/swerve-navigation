const API_CONFIG = require('../config/api.config');
const PATHS = require('../config/paths');

class TrafficService {
  constructor() {
    this.vizzion = {
      baseUrl: API_CONFIG.vizzion.baseUrl,
      apiKey: API_CONFIG.vizzion.apiKey
    };
  }

  /**
   * Fetch live traffic cameras for visible route segments
   * @param {Array} routePoints - Array of {lat, lng} coordinates
   * @returns {Promise<Object>} Traffic camera data
   */
  async fetchCameras(routePoints) {
    // Implementation for Road511 API
    const url = `${PATHS.api.traffic.cameras}?points=${routePoints.map(p => `${p.lat},${p.lng}`).join(';')}`;
    
    const response = await fetch(url, {
      headers: {
        'apikey': API_CONFIG.vizzion.apiKey,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Traffic API error: ${response.status}`);
    }
    
    return response.json();
  }

  /**
   * Fetch traffic incidents from TomTom API
   * @param {Array} routePoints - Array of {lat, lng} coordinates
   * @returns {Promise<Object>} Traffic incident data
   */
  async fetchIncidents(routePoints) {
    // Implementation for TomTom API
    const url = `${PATHS.api.traffic.incidents}?points=${routePoints.map(p => `${p.lat},${p.lng}`).join(';')}`;
    
    const response = await fetch(url, {
      headers: {
        'apikey': API_CONFIG.tomtom.apiKey,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`TomTom API error: ${response.status}`);
    }
    
    return response.json();
  }
}

export default new TrafficService();