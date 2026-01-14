/** Helper utilities shared across pages. */

/** Convert a human-readable page name into a URL path segment. */
export function createPageUrl(pageName: string) {
    return '/' + pageName.toLowerCase().replace(/ /g, '-');
}