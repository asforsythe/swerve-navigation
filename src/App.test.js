// Basic test for Swerve application components

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

describe('Swerve Application', () => {
  let dom;
  let document;

  beforeAll(() => {
    // Setup JSDOM environment
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="map"></div></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable'
    });
    
    document = dom.window.document;
    global.document = document;
    global.window = dom.window;
    global.navigator = dom.window.navigator;
  });

  test('should load MapOverlay component structure', () => {
    const mapOverlayPath = path.join(__dirname, 'components/MapOverlay.js');
    expect(fs.existsSync(mapOverlayPath)).toBe(true);
  });

  test('should have required API configuration', () => {
    const apiConfigPath = path.join(__dirname, 'config/api.config.js');
    expect(fs.existsSync(apiConfigPath)).toBe(true);
  });

  test('should initialize with required dependencies', () => {
    const packageJson = require('../package.json');
    expect(packageJson.dependencies).toHaveProperty('mapbox-gl');
    expect(packageJson.dependencies).toHaveProperty('zustand');
  });
});