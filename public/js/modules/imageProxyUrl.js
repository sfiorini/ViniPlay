export function toImageProxyUrl(url) {
    if (!url || typeof url !== 'string') return url;
    return /^https?:\/\//i.test(url) ? `/api/image-proxy?url=${encodeURIComponent(url)}` : url;
}
