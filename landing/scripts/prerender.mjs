// Injects server-rendered markup into dist/index.html so crawlers and
// no-JS visitors get the real content. The client hydrates it on load.
import { readFile, writeFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = process.cwd();
const htmlPath = path.join(root, 'dist', 'index.html');
const ssrEntry = path.join(root, 'dist-ssr', 'entry-server.js');

const { render } = await import(pathToFileURL(ssrEntry).href);
const html = await readFile(htmlPath, 'utf8');

if (!html.includes('<!--app-html-->')) throw new Error('Placeholder <!--app-html--> missing from dist/index.html');

await writeFile(htmlPath, html.replace('<!--app-html-->', render()));
await rm(path.join(root, 'dist-ssr'), { recursive: true, force: true });
console.log('Pre-rendered dist/index.html');
