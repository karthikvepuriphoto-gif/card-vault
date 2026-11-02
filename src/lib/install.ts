export function shouldOfferInstallHint(input: {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  standalone: boolean;
}): boolean {
  if (input.standalone) return false;
  const ios =
    /iPad|iPhone|iPod/.test(input.userAgent) || (input.platform === 'MacIntel' && input.maxTouchPoints > 1);
  const safari = /Safari/i.test(input.userAgent) && !/CriOS|FxiOS|EdgiOS|Chrome|Android/i.test(input.userAgent);
  return ios && safari;
}
