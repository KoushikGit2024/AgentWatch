import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * SEO helper. Absolute URLs (canonical, og:url, og:image, JSON-LD url, sitemap)
 * can only be correct once the real domain is known, so they are generated from
 * VITE_SITE_URL (see .env.example) rather than guessed. Without it, the build
 * still succeeds and simply omits those tags.
 */
function seo(siteUrl) {
  const base = siteUrl ? siteUrl.replace(/\/+$/, '') : '';
  return {
    name: 'agentwatch-seo',
    transformIndexHtml(html) {
      const ld = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'AgentWatch',
        description:
          'Open-source, local-first companion for Google Antigravity. Review permission requests, answer agent questions and inspect terminal output and diffs from your phone over Tailscale.',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Windows',
        softwareVersion: '2.0',
        license: 'https://opensource.org/licenses/MIT',
        codeRepository: 'https://github.com/KoushikGit2024/AgentWatch',
        isAccessibleForFree: true,
        ...(base && { url: `${base}/` }),
      };
      const tags = [];
      if (base) {
        tags.push(
          `<link rel="canonical" href="${base}/" />`,
          `<meta property="og:url" content="${base}/" />`,
          `<meta property="og:image" content="${base}/og-image.png" />`,
          `<meta name="twitter:image" content="${base}/og-image.png" />`
        );
      }
      tags.push(`<script type="application/ld+json">${JSON.stringify(ld)}</script>`);
      return html.replace('<!--seo-injected-->', tags.join('\n    '));
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n${base ? `\nSitemap: ${base}/sitemap.xml\n` : ''}`,
      });
      if (base) {
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${base}/</loc></url>\n</urlset>\n`,
        });
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), seo(env.VITE_SITE_URL)],
    server: { host: true, allowedHosts: true },
  };
});
