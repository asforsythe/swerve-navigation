// Path configuration for Swerve application
// Defines routing paths and API endpoints

const PATHS = {
  // API endpoints
  api: {
    base: '/api',
    weather: {
      xweather: '/weather/xweather',
      current: '/weather/current'
    },
    traffic: {
      vizzion: '/traffic/cameras',
      cameras: '/traffic/live'
    },
    routing: '/routing/weather-optimized'
  },

  // Frontend routes
  routes: {
    home: '/',
    route: '/route/:id',
    weather: '/weather',
    traffic: '/traffic',
    settings: '/settings'
  },

  // Mapbox GL JS specific paths
  map: {
    style: 'mapbox://styles/mapbox/dark-v11',
    sources: {
      terrain: 'mapbox://mapbox.terrain-rgb',
      weather: 'mapbox://mapbox.weather'
    }
  }
};

module.exports = PATHS;