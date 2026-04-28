export function openMobileMenuElements({ menu, overlay, body = document.body }) {
    menu?.classList.remove('hidden', '-translate-x-full');
    menu?.classList.add('translate-x-0');
    overlay?.classList.remove('hidden');
    body?.classList.add('overflow-hidden');
}

export function closeMobileMenuElements({ menu, overlay, body = document.body }) {
    if (menu) {
        menu.classList.add('-translate-x-full');
        menu.classList.remove('translate-x-0');
        menu.addEventListener('transitionend', function handler(e) {
            if (e.propertyName === 'transform' && e.target === menu) {
                menu.classList.add('hidden');
                menu.removeEventListener('transitionend', handler);
            }
        });
    }
    overlay?.classList.add('hidden');
    body?.classList.remove('overflow-hidden');
}
