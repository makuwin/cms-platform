export function getCookieValue(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.trim().split('=');
    if (key === name) {
      return rest.length > 0 ? decodeURIComponent(rest.join('=')) : '';
    }
  }

  return null;
}
