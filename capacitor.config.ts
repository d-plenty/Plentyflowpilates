import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'family.plenty.plentyflow',
  appName: 'Plenty Flow',
  webDir: 'dist',
  ios: {
    // The app is one screen that never scrolls as a page: only its own lists do.
    scrollEnabled: false,
    contentInset: 'never',
  },
  plugins: {
    SystemBars: { insetsHandling: 'css', initialViewportFitValueHint: 'cover' },
  },
};

export default config;
