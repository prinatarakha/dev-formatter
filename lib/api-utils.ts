import { NextRequest, NextResponse } from 'next/server';

/**
 * Checks if the request comes from the allowed domain
 */
export function checkReferer(request: NextRequest): boolean {
  const referer = request.headers.get('referer');
  const allowedDomainsStr = process.env.WHITELISTED_DOMAINS;

  if (!allowedDomainsStr) {
    console.error('WHITELISTED_DOMAINS environment variable is not set');
    return false;
  }

  if (!referer) {
    return false;
  }

  const allowedDomains = allowedDomainsStr.split(",");

  try {
    const refererUrl = new URL(referer);
    const isAllowed = allowedDomains.some(domain => {
      const allowedUrl = new URL(domain);
      return refererUrl.hostname === allowedUrl.hostname;
    });
    return isAllowed;
  } catch (error) {
    console.error('Error parsing referer or domains:', error);
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

