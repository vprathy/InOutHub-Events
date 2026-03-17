export const isDevLoginEnabled = import.meta.env.DEV;

export function buildLoginRedirectTo(nextPath?: string | null) {
    if (typeof window === 'undefined') {
        return undefined;
    }

    const url = new URL('/auth/complete', window.location.origin);
    if (nextPath) {
        url.searchParams.set('next', nextPath);
    }
    return url.toString();
}
