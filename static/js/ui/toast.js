/**
 * Resonance — G3 Liquid Crystal Toast Notifications (aria-live)
 */
import { escapeHtml } from '../utils/format.js';

export function showToast(message, type = 'info', durationMs = 3000) {
  const stack = document.getElementById('toast-stack');
  if (!stack) return;

  // Keep maximum 2 active toasts so they never clutter the screen
  while (stack.children.length >= 2) {
    stack.firstElementChild.remove();
  }

  const item = document.createElement('div');
  item.className = 'glass-g3 hairline-gradient-border toast-item';
  const iconId =
    type === 'error'
      ? '#i-x'
      : type === 'success'
        ? '#i-check'
        : '#i-sparkles';
  const iconColor =
    type === 'error'
      ? 'var(--c-error)'
      : type === 'success'
        ? 'var(--c-success)'
        : 'var(--acc)';

  item.innerHTML = `
    <svg style="width:18px; height:18px; color:${iconColor}; flex-shrink:0;"><use href="${iconId}"/></svg>
    <span class="text-ui" style="font-weight:500;">${escapeHtml(message)}</span>
  `;

  stack.appendChild(item);

  setTimeout(() => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(8px) scale(0.96)';
    item.style.transition = 'opacity 220ms ease, transform 220ms ease';
    setTimeout(() => item.remove(), 220);
  }, durationMs);
}
