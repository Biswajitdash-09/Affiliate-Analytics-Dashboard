import { UAParser } from 'ua-parser-js';

/**
 * List of known bot user-agent patterns
 */
const BOT_PATTERNS = [
  'bot',
  'crawler',
  'spider',
  'scraper',
  'curl',
  'wget',
  'python',
  'java',
  'headless',
  'phantom',
  'selenium',
  'puppet',
  'jmeter',
  'httpclient',
  'httptest',
  'test',
  'validator',
  'validatorjs',
  'wilma',
  'curlhttpclient',
  'requests',
  'urlfetch',
  'webtest',
  'axish',
  'wget',
  'curl',
  'wget',
  'fetch',
  'monitor',
  'shockwave',
  'flash',
  'client',
  'client',
];

/**
 * Known bot hostnames/IPs (simplified list)
 */
const BOT_HOSTS = [
  'googlebot.com',
  'crawl.googlebot.com',
  'search.msn.com',
  'crawl.baidu.com',
  'crawl.yahoo.net',
];

/**
 * Suspicious referrer patterns (referrer spam)
 */
const SPAM_REFERRERS = [
  'trafficmonetize.org',
  'traffic2cash.com',
  'traffic-c.com',
  'simple-share-buttons.com',
  'buttons-for-website.com',
  'theguardlan.com',
  'get-free-traffic-now.com',
  'free-social-buttons.com',
  'share-buttons.xyz',
];

/**
 * Parse user-agent string and extract device/browser information
 * @param {string} userAgent - User-Agent header
 * @returns {Object} Parsed user agent data
 */
export const parseUserAgent = (userAgent = '') => {
  const parser = new UAParser(userAgent);
  return {
    browser: parser.getBrowser(),
    os: parser.getOS(),
    device: parser.getDevice(),
    engine: parser.getEngine(),
    ua: parser.getUA(),
  };
};

/**
 * Check if a user-agent string indicates a bot
 * @param {string} userAgent - User-Agent header
 * @returns {boolean} True if bot detected
 */
export const isBot = (userAgent = '') => {
  const ua = userAgent.toLowerCase();

  return BOT_PATTERNS.some(pattern => ua.includes(pattern));
};

/**
 * Check if a referrer is suspicious/spam
 * @param {string} referrer - Referrer header
 * @returns {boolean} True if referrer is spam
 */
export const isSpamReferrer = (referrer = '') => {
  if (!referrer) return false;
  const ref = referrer.toLowerCase();

  return SPAM_REFERRERS.some(spam => ref.includes(spam));
};

/**
 * Check if a hostname indicates a bot
 * @param {string} hostname - Remote hostname (if available)
 * @returns {boolean} True if hostname is a known bot
 */
export const isBotHost = (hostname = '') => {
  if (!hostname) return false;
  const host = hostname.toLowerCase();

  return BOT_HOSTS.some(botHost => host.endsWith(botHost));
};

/**
 * Comprehensive bot detection check
 * @param {Object} options - Detection options
 * @param {string} options.userAgent - User-Agent header
 * @param {string} options.referrer - Referrer header
 * @param {string} options.hostname - Remote hostname
 * @returns {Object} { isBot: boolean, isSpam: boolean, reason: string }
 */
export const detectBot = ({ userAgent = '', referrer = '', hostname = '' }) => {
  const reasons = [];

  // Check user-agent
  if (isBot(userAgent)) {
    reasons.push('bot_user_agent');
  }

  // Check referrer
  if (isSpamReferrer(referrer)) {
    reasons.push('spam_referrer');
  }

  // Check hostname (if available)
  if (hostname && isBotHost(hostname)) {
    reasons.push('bot_hostname');
  }

  // Check for headless browsers (multiple indicators)
  const ua = userAgent.toLowerCase();
  const headlessIndicators = [
    'headlesschrome',
    'headlessfirefox',
    'electron',
    'windows nt 6.1',
  ];

  const headlessCount = headlessIndicators.filter(indicator => ua.includes(indicator)).length;
  if (headlessCount >= 2) {
    reasons.push('headless_browser');
  }

  const isDetected = reasons.length > 0;

  return {
    isBot: isDetected,
    isSpam: reasons.includes('spam_referrer'),
    reason: reasons.join(',') || 'none',
  };
};

/**
 * Extract IP address from request headers
 * @param {Object} headers - Request headers
 * @returns {string} IP address
 */
export const extractIP = (headers = {}) => {
  // Check for forwarded headers (behind proxy/CDN)
  const forwarded = headers['x-forwarded-for'] || headers['forwarded'] || headers['x-real-ip'];

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first
    return forwarded.split(',')[0].trim();
  }

  // Fall back to direct connection IP
  return headers['remote-addr'] || 'unknown';
};

/**
 * Extract referrer from headers, preserving query params
 * @param {Object} headers - Request headers
 * @returns {string} Referrer URL
 */
export const extractReferrer = (headers = {}) => {
  const referrer = headers.referer || headers.referrer || '';
  return referrer;
};

export default {
  parseUserAgent,
  isBot,
  isSpamReferrer,
  isBotHost,
  detectBot,
  extractIP,
  extractReferrer,
};