/**
 * File link & line-highlight range parsing utility.
 * Parses URI fragments like:
 *   - file:///d:/path/to/file.py#L45-L60
 *   - file:///d:/path/to/file.py#L42
 *   - file:///d:/path/to/file.py#42
 *   - main.py:L120-145
 *   - main.py:42:10
 */

export function parseFileLink(rawLink) {
    if (!rawLink || typeof rawLink !== 'string') {
        return {
            cleanPath: '',
            filename: '',
            startLine: null,
            endLine: null,
            hasHighlight: false
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

    // 1. Check for URL fragment (#L10-L25 or #L42 or #42)
    if (cleanPath.includes('#')) {
        const [pathPart, fragment] = cleanPath.split('#');
        cleanPath = pathPart;
        const rangeMatch = fragment.match(/L?(\d+)(?:[-–]L?(\d+))?/i);
        if (rangeMatch) {
            startLine = parseInt(rangeMatch[1], 10);
            if (rangeMatch[2]) {
                endLine = parseInt(rangeMatch[2], 10);
            }
        }
    }
    // 2. Check for colon line specifier (file.py:45 or file.py:L45-L60 or file.py:45:10)
    else {
        const colonMatch = cleanPath.match(/^(.*?):(?:L?(\d+)(?:[-–]L?(\d+))?)(?::\d+)?$/i);
        if (colonMatch) {
            cleanPath = colonMatch[1];
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

    return {
        cleanPath,
        filename,
        startLine,
        endLine,
        hasHighlight: startLine !== null
    };
}
