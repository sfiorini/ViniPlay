// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

async function loadSubject() {
  const modulePath = ['..', '..', 'public', 'js', 'modules', 'mobileNav.js'].join('/');
  return import(modulePath);
}

function fixture() {
  document.body.innerHTML = `
    <div id="mobile-nav-menu" class="hidden -translate-x-full flex-col"></div>
    <div id="mobile-menu-overlay" class="hidden"></div>
  `;
  return {
    menu: document.getElementById('mobile-nav-menu'),
    overlay: document.getElementById('mobile-menu-overlay'),
    body: document.body
  };
}

describe('mobile navigation helpers', () => {
  it('openMobileMenuElements shows menu and overlay', async () => {
    const { openMobileMenuElements } = await loadSubject();
    const els = fixture();
    openMobileMenuElements(els);
    expect(els.menu.classList.contains('hidden')).toBe(false);
    expect(els.menu.classList.contains('-translate-x-full')).toBe(false);
    expect(els.menu.classList.contains('translate-x-0')).toBe(true);
    expect(els.overlay.classList.contains('hidden')).toBe(false);
    expect(document.body.classList.contains('overflow-hidden')).toBe(true);
  });

  it('closeMobileMenuElements waits for transform transition before hiding menu', async () => {
    const { openMobileMenuElements, closeMobileMenuElements } = await loadSubject();
    const els = fixture();
    openMobileMenuElements(els);
    closeMobileMenuElements(els);
    expect(els.menu.classList.contains('hidden')).toBe(false);
    els.menu.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'transform' }));
    expect(els.menu.classList.contains('hidden')).toBe(true);
  });

  it('closeMobileMenuElements ignores non-transform transitionend events', async () => {
    const { openMobileMenuElements, closeMobileMenuElements } = await loadSubject();
    const els = fixture();
    openMobileMenuElements(els);
    closeMobileMenuElements(els);
    els.menu.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'background-color' }));
    expect(els.menu.classList.contains('hidden')).toBe(false);
  });
});
