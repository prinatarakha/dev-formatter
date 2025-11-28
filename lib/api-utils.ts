import { NextRequest, NextResponse } from 'next/server';

/**
 * Checks if the request comes from the allowed domain
 */
export function checkReferer(request: NextRequest): boolean {
  const referer = request.headers.get('referer');
  const allowedDomain = process.env.DEV_FORMATTER_DOMAIN;

  if (!allowedDomain) {
    console.error('DEV_FORMATTER_DOMAIN environment variable is not set');
    return false;
  }

  if (!referer) {
    return false;
  }

  try {
    const refererUrl = new URL(referer);
    const allowedUrl = new URL(allowedDomain);
    return refererUrl.hostname === allowedUrl.hostname;
  } catch (error) {
    console.error('Error parsing referer or domain:', error);
    return false;
  }
}

/**
 * Creates an unauthorized response
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { message: 'Assalamualaikum, you are not authorized to access this resource. Thank you ya. - rakha' },
    { status: 401 }
  );
}

