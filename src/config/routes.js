// Route configuration for Swerve application
// Defines frontend routing paths

const ROUTES = {
  home: '/',
  route: '/route/:id',
  weather: '/weather',
  traffic: '/traffic',
  settings: '/settings',
  // Weather API routes
  weatherApi: {
    current: '/weather/current',
    forecast: '/weather/forecast',
    timeline: '/weather/timeline'
  },
  // Traffic API routes
  trafficApi: {
    cameras: '/traffic/cameras',
    incidents: '/traffic/incidents',
    live: '/traffic/live'
  },
  // Routing API routes
  routingApi: {
    optimized: '/routing/weather-optimized',
    alternative: '/routing/alternative'
  }
};

module.exports = ROUTES;