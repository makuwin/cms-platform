import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const url = new URL(request.url);
  const enable = url.searchParams.get('enable') !== 'false';
  const destination = url.searchParams.get('redirect') ?? '/';

  if (enable) {
    cookies.set('preview', 'true', {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 30,
    });
  } else {
    cookies.delete('preview', { path: '/' });
  }

  return redirect(destination);
};
