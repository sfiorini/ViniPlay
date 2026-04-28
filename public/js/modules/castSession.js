export async function handleCastSessionEnded({
    castState,
    stopCastStream,
    updatePlayerUI,
    forceRefreshStream,
    showNotification
}) {
    if (castState.currentCastStreamUrl) {
        stopCastStream(castState.currentCastStreamUrl);
        castState.currentCastStreamUrl = null;
    }

    castState.session = null;
    castState.isCasting = false;
    castState.currentMedia = null;

    showNotification?.('Casting session ended.', false, 4000);
    updatePlayerUI?.();

    try {
        await forceRefreshStream?.();
    } catch (error) {
        console.error('[CAST] Error refreshing stream after cast ended:', error);
    }
}
