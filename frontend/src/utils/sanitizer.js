/**
 * Minimal, zero-dependency HTML sanitizer for UI rendering.
 * Strips script tags, onerror/onclick handlers, iframe/object injections, and javascript: protocols
 * while preserving safe HTML formatting (tables, styles, images, code spans, links).
 */

const BLOCKED_TAGS = /<\s*(script|style|iframe|object|embed|applet|meta|link|base)\b[^>]*>.*?<\s*\/\s*\1\s*>|<\s*(script|style|iframe|object|embed|applet|meta|link|base)\b[^>]*>/gis;
const BLOCKED_EVENT_ATTRS = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_URLS = /(href|src)\s*=\s*["']?\s*javascript:[^"'>\s]+/gi;

export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';

  return html
    .replace(BLOCKED_TAGS, '')
    .replace(BLOCKED_EVENT_ATTRS, '')
    .replace(JAVASCRIPT_URLS, '$1="#"');
}
