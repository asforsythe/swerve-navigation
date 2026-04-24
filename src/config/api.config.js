// API Configuration for Swerve
// Centralized configuration for all external API integrations

const API_CONFIG = {
  // Mapbox GL JS Configuration
  mapbox: {
    accessToken: process.env.MAPBOX_ACCESS_TOKEN,
    style: process.env.MAPBOX_STYLE || 'mapbox://styles/mapbox/dark-v11',
    version: '2.14.1',
    maxZoom: 22,
    minZoom: 0,
    attribution: '© Mapbox © OpenStreetMap'
  },

  // Tomorrow.io Weather API Configuration
  tomorrowio: {
    apiKey: process.env.TOMORROW_IO_API_KEY,
    baseUrl: 'https://api.tomorrow.io/v4',
    defaultLocation: {
      lat: 37.7749,
      lng: -122.4194
    },
    // High-resolution precipitation data settings
    precipitation: {
      fields: ['precipitationIntensity', 'precipitationProbability', 'weatherCode']
    },
    // Spatial resolution in meters
    spatialResolution: 1000,
    // Update frequency in milliseconds (2-5 minutes)
    updateInterval: 300000 // 5 minutes
  },

  // Xweather API Configuration
  xweather: {
    apiKey: process.env.XWEATHER_API_KEY,
    baseUrl: 'https://weather.api.xweather.com',
    routing: {
      baseUrl: 'https://routing.api.xweather.com',
      // Optimize for weather-aware routing
      optimizeForWeather: true,
      // Consider storm proximity in routing
      stormBufferRadius: 5000 // 5km buffer
    },
    lightning: {
      updateInterval: 60000, // 1 minute for severe weather
      alertRadius: 25000 // 25km alert radius
    }
  },

  // Vizzion Traffic API Configuration
  vizzion: {
    baseUrl: 'https://api.vizzion.com',
    apiKey: process.env.VIZZION_API_KEY
  },

  // Road511 API Configuration
  road511: {
    baseUrl: 'https://api.road511.com',
    apiKey: process.env.ROAD511_API_KEY
  },

  // TomTom API Configuration
  tomtom: {
    baseUrl: 'https://api.tomtom.com',
    apiKey: process.env.TOMTOM_API_KEY
  }
};

module.exports = API_CONFIG;
