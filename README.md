# Swerve - Real-time Navigation with Weather-Aware Routing

## Overview
Swerve is a mobile-friendly navigation application that provides 110% reliable, visually appealing, and highly performant real-time routing with weather-aware optimization. The application leverages WebGL rendering and intelligent API integration to deliver the best navigation experience.

## Key Features
- **Real-time Weather Integration**: Hyper-local minute-by-minute weather forecasting
- **Weather-Aware Routing**: Dynamic route optimization based on precipitation, lightning, and severe weather
- **Live Traffic Cameras**: Interactive camera feeds along your route
- **3D Terrain Rendering**: Enhanced map visualization with terrain data
- **Mobile-First Design**: Responsive UI that works seamlessly on all devices
- **High Performance**: 60 FPS rendering with efficient data polling

## Architecture

### Technology Stack
- **Frontend**: React with Mapbox GL JS for WebGL rendering
- **State Management**: Zustand for lightweight, fast state management
- **Styling**: TailwindCSS for responsive mobile design
- **APIs**:
  - Mapbox GL JS (Rendering Engine)
  - Tomorrow.io (Primary Weather Data)
  - Xweather (Weather-Aware Routing)
  - Vizzion (Live Traffic Cameras)

### Data Flow
1. User sets destination → Route calculated
2. Spatial bounding box determines data requirements
3. Weather data fetched for route and surrounding area
4. Traffic cameras retrieved for visible route segments
5. Mapbox GL JS renders WebGL map with all overlays
6. Real-time updates every 2-5 minutes based on spatial polling

## Installation

### Prerequisites
- Node.js 16+
- npm or yarn
- API keys for required services

### Setup
```bash
# Clone repository
git clone <repository-url>
cd swerve

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env and add your API keys
nano .env

# Start development server
npm run dev
```

## Environment Variables

Create a `.env` file with the following variables:

```
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
MAPBOX_STYLE=mapbox://styles/mapbox/dark-v11
TOMORROW_IO_API_KEY=your_tomorrow_io_api_key
XWEATHER_API_KEY=your_xweather_api_key
VIZZION_API_KEY=your_vizzion_api_key
PORT=5000
```

## API Integration Details

### Mapbox GL JS
- WebGL-based rendering for 60 FPS performance
- Vector tiles for smooth zooming and panning
- Dark mode futuristic aesthetic
- 3D terrain support

### Tomorrow.io
- Hyper-local minute-by-minute forecasts
- Precipitation intensity and probability
- Weather intelligence with programmatic alerts
- 1km spatial resolution

### Xweather
- Weather-aware routing optimization
- Lightning and severe storm tracking
- Vehicle-vs-storm intersection calculations
- 25km alert radius

### Vizzion
- Aggregates 200+ transport agency feeds
- Optimized JPEG snapshots for mobile
- Precise lat/long coordinates
- 5-minute update intervals

## Performance Optimizations

### Spatial Bounding Box Strategy
- Only fetch data for immediate area + upcoming route
- Dynamic bounding box expansion as user travels
- 2-5 minute update intervals to save resources
- Reduces API costs and battery usage

### Caching
- 5-minute cache TTL for API responses
- Maximum 1000 cached items
- Reduces redundant API calls

### Concurrency Management
- Maximum 6 concurrent requests
- 3 weather API requests
- 3 camera API requests
- Prevents rate limiting

## Mobile Responsiveness

### Design Principles
- Fluid, responsive layouts with TailwindCSS
- Overlay panels never block WebGL map canvas
- Touch-friendly interactive elements
- Optimized for small screens

### Control Panels
- Weather information (temperature, precipitation)
- Route information (waypoints, status)
- Traffic camera feeds with live snapshots
- Alert notifications for severe weather

## Testing

### Test Scenarios
- API integration reliability under load
- Performance benchmarking
- Mobile responsiveness testing
- Offline capability validation
- Error handling and retry mechanisms

## Future Enhancements
- Offline map caching
- Alternative route suggestions based on weather
- Integration with vehicle telematics
- Multi-language support
- Accessibility improvements

## License
ISC