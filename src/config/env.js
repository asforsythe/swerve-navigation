// Environment configuration
// Export environment variables for use in the application

module.exports = {
  // Mapbox configuration
  MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN,
  MAPBOX_STYLE: process.env.MAPBOX_STYLE || 'mapbox://styles/mapbox/dark-v11',

  // Road511 Traffic API Configuration
  ROAD511_API_KEY: process.env.ROAD511_API_KEY,

  // Server configuration
  PORT: process.env.PORT || 3000
};