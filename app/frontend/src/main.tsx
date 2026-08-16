import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { loadRuntimeConfig } from './lib/config.ts';

/**
 * Remove any injected "made by atom" badge or watermark elements.
 * This runs immediately and watches for dynamically injected elements.
 */
function removeBadges() {
  const isBadge = (el: Element): boolean => {
    if (el.id === 'root') return false;
    const text = el.textContent?.toLowerCase() || '';
    const html = el.innerHTML?.toLowerCase() || '';
    if (text.includes('made by atom') || text.includes('made by atoms')) return true;
    if (html.includes('atoms.com') || html.includes('atoms.io')) return true;
    // Check for fixed-position overlays not belonging to app
    if (el instanceof HTMLElement && el.parentElement === document.body) {
      const style = el.getAttribute('style') || '';
      const computed = window.getComputedStyle(el);
      if (
        (style.includes('fixed') || computed.position === 'fixed') &&
        el.id !== 'root' &&
        !el.classList.contains('toaster')
      ) {
        return true;
      }
    }
    // iframes injected at body level
    if (el.tagName === 'IFRAME' && el.parentElement === document.body) return true;
    return false;
  };

  // Remove existing badges
  const removeExisting = () => {
    document.querySelectorAll('body > *:not(#root):not(script)').forEach((el) => {
      if (isBadge(el)) {
        el.remove();
      }
    });
  };

  removeExisting();

  // Watch for future injections
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement && isBadge(node)) {
          node.remove();
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: false });

  // Also run after a short delay in case injection happens after DOMContentLoaded
  setTimeout(removeExisting, 500);
  setTimeout(removeExisting, 2000);
  setTimeout(removeExisting, 5000);
}

// Remove badges immediately
removeBadges();

// Load runtime configuration before rendering the app
async function initializeApp() {
  // Prerendered blog pages are served as pure static HTML for SEO.
  // Intentionally skip React mounting so the crawler-facing markup stays
  // lightweight and self-contained — no client-side hydration needed.
  if (
    document
      .querySelector('meta[name="prerender-static-page"]')
      ?.getAttribute('content') === 'blog'
  ) {
    return;
  }

  try {
    await loadRuntimeConfig();
    console.log('Runtime configuration loaded successfully');
  } catch (error) {
    console.warn(
      'Failed to load runtime configuration, using defaults:',
      error
    );
  }

  // Render the app
  createRoot(document.getElementById('root')!).render(<App />);
}

// Initialize the app
initializeApp();
