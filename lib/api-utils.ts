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

const BOT_USER_AGENTS = [
  'bot',
  'spider',
  'crawler',
  'curl',
  'wget',
  'headless', // Often used by automated testing/scripting tools
];

export function checkUserAgent(request: NextRequest) {
  const userAgent = request.headers.get('User-Agent');
  const url = request.nextUrl.pathname;

  if (!userAgent) {
    // Often, a lack of a User-Agent or Referer header can also indicate a script
    // or poorly configured client, which you might want to block.
    console.warn(`Blocked request for missing User-Agent on ${url}`);
    return false;
  }

  const loweredCasedUserAgent = userAgent.toLowerCase();

  // Ensure the request looks like it's coming from a standard browser.
  const isBot = BOT_USER_AGENTS.some(bot => loweredCasedUserAgent.includes(bot));

  // A simple, heuristic check for a "browser-like" User-Agent
  // Modern browsers usually include 'Mozilla' and 'Chrome' or 'Safari'/'Firefox'.
  // You might need to adjust this depending on the expected clients.
  const isBrowserLike = userAgent.includes('Mozilla') && 
                        (userAgent.includes('Chrome') || 
                          userAgent.includes('Safari') || 
                          userAgent.includes('Firefox'));

  if (isBot || !isBrowserLike) {
    console.warn(`Blocked request for non-browser User-Agent: ${userAgent} on ${url}`);
    return false;
  }

  // If both checks pass, allow the request to proceed
  return true;
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

