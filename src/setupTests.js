// Test setup file
// Configures global test environment

global.fetch = require('jest-fetch-mock');

// Mock Mapbox GL JS
jest.mock('mapbox-gl', () => {
  return {
    accessToken: '',
    Map: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      load: jest.fn(),
      setTerrain: jest.fn(),
      addControl: jest.fn(),
      removeControl: jest.fn()
    })),
    Marker: jest.fn().mockImplementation(() => ({
      setLngLat: jest.fn().mockReturnThis(),
      setPopup: jest.fn().mockReturnThis(),
      addTo: jest.fn()
    })),
    Popup: jest.fn().mockImplementation(() => ({
      setHTML: jest.fn().mockReturnThis(),
      setLngLat: jest.fn().mockReturnThis()
    })),
    NavigationControl: jest.fn(),
    ScaleControl: jest.fn()
  };
});

// Mock Zustand
jest.mock('zustand', () => {
  const actualZustand = require.requireActual('zustand');
  return (creator) => {
    const store = creator(
      () => ({}),
      () => ({}),
      () => ({})
    );
    return store;
  };
});

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn()
}));