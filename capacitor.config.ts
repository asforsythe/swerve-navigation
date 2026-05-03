import type { CapacitorConfig } from '@capacitor/cli';

// To enable live-reload while iterating in the iOS Simulator or on a tethered
// iPhone, uncomment the `server` block below and run `npx cap copy ios`.
// Caveat: pointing `server.url` at HTTP makes the WebView treat the page as
// an HTTP origin, which loses secure-context APIs (crypto.randomUUID,
// geolocation, etc.). For testing those, leave `server` undefined so Capacitor
// serves the bundled `build/` from `capacitor://localhost` (a secure origin).

const config: CapacitorConfig = {
  appId: 'com.swerve.app',
  appName: 'Swerve',
  webDir: 'build',
  ios: {
    contentInset: 'always',
    backgroundColor: '#000000',
    scheme: 'Swerve',
  },
  // server: {
  //   url: 'http://192.168.1.53:3000',
  //   cleartext: true,
  // },
};

export default config;
