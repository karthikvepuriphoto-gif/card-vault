import { describe, expect, it } from 'vitest';
import { shouldOfferInstallHint } from './install';

const iphoneSafari =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

describe('install hint', () => {
  it('shows on iPhone Safari until the app is on the Home Screen', () => {
    expect(
      shouldOfferInstallHint({ userAgent: iphoneSafari, platform: 'iPhone', maxTouchPoints: 5, standalone: false }),
    ).toBe(true);
    expect(
      shouldOfferInstallHint({ userAgent: iphoneSafari, platform: 'iPhone', maxTouchPoints: 5, standalone: true }),
    ).toBe(false);
  });

  it('stays quiet on a desktop browser', () => {
    expect(
      shouldOfferInstallHint({
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        platform: 'Linux',
        maxTouchPoints: 0,
        standalone: false,
      }),
    ).toBe(false);
  });
});
