/**
 * File link & line-highlight range parsing and validation utility.
 * Parses URI fragments like:
 *   - file:///d:/path/to/file.py#L45-L60
 *   - file:///d:/path/to/file.py#L42
 *   - App.jsx #L187-195
 *   - App.jsx:L187-195
 *   - main.py:42:10
 *
 * Validates whether a candidate string is an actual readable file path
 * rather than a git commit hash, shell command, or generic description.
 */

// Extensions known to be readable files
const VALID_FILE_EXTENSIONS = new Set([
    'py', 'pyw', 'ipynb', 'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
    'html', 'htm', 'css', 'scss', 'sass', 'less', 'json', 'yaml', 'yml',
    'md', 'markdown', 'txt', 'log', 'sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd',
    'toml', 'xml', 'svg', 'ini', 'cfg', 'conf', 'env', 'sql', 'graphql',
    'rs', 'go', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'php', 'rb', 'dockerfile'
]);

// Special dotfiles and exact basenames that are files
const VALID_EXACT_FILES = new Set([
    'dockerfile', 'makefile', 'gemini.md', 'agents.md', 'license', 'readme',
    '.gitignore', '.env', '.dockerignore', '.editorconfig', '.eslintrc', '.prettierrc'
]);

/**
 * Validates if a cleaned target string represents a plausible file path.
 * Filters out git commit hashes (e.g. "a664ad5", "commit 4c8e222"), commands ("npm run build"),
 * and generic phrases ("Analyzed directory").
 */
export function isValidFilePath(candidate) {
    if (!candidate || typeof candidate !== 'string') return false;
    const str = candidate.trim();
    if (str.length < 2 || str.length > 500) return false;

    // Filter out commands or spaces-separated phrases (unless Windows path with spaces)
    if (str.includes('\n') || str.startsWith('$') || str.startsWith('>') || str.startsWith('git ')) {
        return false;
    }

    // Filter out pure hexadecimal commit hashes (e.g. "9653026", "a664ad5", "4c8e222fded6")
    if (/^[0-9a-f]{7,40}$/i.test(str)) {
        return false;
    }

    // Filter out commit messages or phrases
    if (/^(feat|fix|chore|docs|refactor|test|perf|style|build|ci)\(/i.test(str)) {
        return false;
    }

    const clean = str.split(/[#?:]/)[0].replace(/[/\\]+$/, '').trim();
    const parts = clean.split(/[/\\]/);
    const basename = (parts[parts.length - 1] || '').toLowerCase();

    if (VALID_EXACT_FILES.has(basename)) {
        return true;
    }

    const dotIdx = basename.lastIndexOf('.');
    if (dotIdx > 0 && dotIdx < basename.length - 1) {
        const ext = basename.slice(dotIdx + 1);
        if (VALID_FILE_EXTENSIONS.has(ext)) {
            return true;
        }
    }

    // Path has directory separators and a file-like extension
    if (parts.length > 1 && dotIdx !== -1) {
        return true;
    }

    return false;
}

export function parseFileLink(rawLink) {
    if (!rawLink || typeof rawLink !== 'string') {
        return {
            cleanPath: '',
            filename: '',
            startLine: null,
            endLine: null,
            hasHighlight: false,
            isValid: false
        };
    }

    let str = rawLink.trim();

    // Strip file:// prefix if present
    if (str.startsWith('file:///')) {
        str = decodeURIComponent(str.slice(8));
    } else if (str.startsWith('file://')) {
        str = decodeURIComponent(str.slice(7));
    } else if (str.startsWith('file:/')) {
        str = decodeURIComponent(str.slice(6));
    }

    let cleanPath = str;
    let startLine = null;
    let endLine = null;

    // 1. Check for URL fragment (#L10-L25 or #L187-195 or " #L187-195" or #42)
    if (cleanPath.includes('#')) {
        const [pathPart, fragment] = cleanPath.split('#');
        cleanPath = pathPart.trim();
        const rangeMatch = fragment.match(/L?(\d+)(?:[-–]L?(\d+))?/i);
        if (rangeMatch) {
            startLine = parseInt(rangeMatch[1], 10);
            if (rangeMatch[2]) {
                endLine = parseInt(rangeMatch[2], 10);
            }
        }
    }
    // 2. Check for colon or space line specifier (App.jsx:L187-195 or App.jsx:187 or App.jsx:187:10)
    else {
        const colonMatch = cleanPath.match(/^(.*?)(?::|\s+)L?(\d+)(?:[-–]L?(\d+))?(?::\d+)?$/i);
        if (colonMatch) {
            cleanPath = colonMatch[1].trim();
            startLine = parseInt(colonMatch[2], 10);
            if (colonMatch[3]) {
                endLine = parseInt(colonMatch[3], 10);
            }
        }
    }

    // Normalize forward slashes
    cleanPath = cleanPath.replace(/\\/g, '/');

    // Extract basename
    const parts = cleanPath.split('/');
    const filename = parts[parts.length - 1] || cleanPath;

    // If only startLine was specified, endLine defaults to startLine
    if (startLine !== null && endLine === null) {
        endLine = startLine;
    }

    // Ensure startLine <= endLine
    if (startLine !== null && endLine !== null && startLine > endLine) {
        const tmp = startLine;
        startLine = endLine;
        endLine = tmp;
    }

    const valid = isValidFilePath(cleanPath);

    return {
        cleanPath,
        filename,
        startLine,
        endLine,
        hasHighlight: startLine !== null,
        isValid: valid
    };
}
