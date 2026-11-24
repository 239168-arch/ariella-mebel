/**
 * Yandex Metrika for the site: counter number and mode come from the admin panel (#site-config).
 * Mode "notice": the counter starts at once, the banner only informs about cookies.
 * Mode "consent": the counter starts only after the visitor presses «Принять».
 * Goals arrive as `ariella:goal` events from app.js / configurator.js.
 */
(() => {
  let config = {};
  try { config = JSON.parse(document.querySelector('#site-config')?.textContent || '{}').metrika || {}; } catch { config = {}; }
  const id = Number(config.id);
  if (!id) return;

  const STORAGE_KEY = 'ariella-cookie-choice';
  const queue = [];
  let started = false;

  const readChoice = () => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } };
  const saveChoice = value => { try { localStorage.setItem(STORAGE_KEY, value); } catch { /* private mode */ } };

  function start() {
    if (started) return;
    started = true;
    window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
    window.ym.l = Date.now();
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://mc.yandex.ru/metrika/tag.js?id=${id}`;
    document.head.append(script);
    window.ym(id, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: Boolean(config.webvisor) });
    queue.splice(0).forEach(name => window.ym(id, 'reachGoal', name));
  }

  window.addEventListener('ariella:goal', event => {
    if (started) window.ym(id, 'reachGoal', event.detail);
    else queue.push(event.detail);
  });

  const banner = document.querySelector('#cookie-banner');
  const choice = readChoice();
  if (config.mode === 'consent') {
    if (choice === 'accept') start();
    else if (choice !== 'decline' && banner) banner.hidden = false;
  } else {
    start();
    if (!choice && banner) banner.hidden = false;
  }
  banner?.addEventListener('click', event => {
    const button = event.target.closest('[data-cookie]');
    if (!button) return;
    saveChoice(button.dataset.cookie);
    banner.hidden = true;
    if (button.dataset.cookie === 'accept') start();
  });
})();
