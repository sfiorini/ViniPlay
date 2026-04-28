function toAbsoluteUrl(url, origin) {
    if (/^https?:\/\//i.test(url)) return url;
    return new URL(url, origin).toString();
}

function isRedirectProfile(profile) {
    return profile?.command === 'redirect';
}

export function buildCastStreamUrl({
    url,
    origin = window.location.origin,
    activeCastProfileId = 'cast-default',
    activeUserAgentId = null,
    activeStreamProfile = null
}) {
    if (isRedirectProfile(activeStreamProfile) && !url.includes('/stream?')) {
        const baseUrl = new URL('/stream', origin).toString();
        const params = [`url=${encodeURIComponent(url)}`, `profileId=${encodeURIComponent(activeCastProfileId)}`];
        if (activeUserAgentId) {
            params.push(`userAgentId=${encodeURIComponent(activeUserAgentId)}`);
        }
        return `${baseUrl}?${params.join('&')}`;
    }

    const castUrl = new URL(toAbsoluteUrl(url, origin));
    const existingProfileId = castUrl.searchParams.get('profileId');

    if (existingProfileId !== activeCastProfileId) {
        castUrl.searchParams.set('profileId', activeCastProfileId);
    }

    if (!castUrl.searchParams.has('userAgentId') && activeUserAgentId && isRedirectProfile(activeStreamProfile)) {
        castUrl.searchParams.set('userAgentId', activeUserAgentId);
    }

    return castUrl.toString();
}
