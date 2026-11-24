document.documentElement.classList.add('js');

/* ---------- Site settings: lead mode, Telegram, phone ---------- */
const site = (() => {
  const defaults = { brand: document.title.split('|').pop().trim(), leadMode: 'api', telegram: '', phone: '', leadEndpoint: '/api/leads', successTitle: 'Спасибо за доверие.', successText: 'Мы получили вашу идею и свяжемся с вами, чтобы обсудить детали проекта.' };
  try { return { ...defaults, ...JSON.parse(document.querySelector('#site-config')?.textContent || '{}') }; }
  catch { return defaults; }
})();
const root = document.documentElement;
if (!['api', 'telegram'].includes(root.dataset.leadMode)) root.dataset.leadMode = site.leadMode === 'telegram' ? 'telegram' : 'api';
const telegramMode = root.dataset.leadMode === 'telegram';
const telegramHandle = String(site.telegram || '').replace(/^@/, '').trim();

function telegramUrl(text = '') {
  if (!telegramHandle) return '#contact';
  return `https://t.me/${encodeURIComponent(telegramHandle)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
document.querySelectorAll('[data-telegram]').forEach(link => {
  if (telegramHandle) link.href = telegramUrl();
  else link.removeAttribute('target'); // no Telegram: the button scrolls to the form on the same page
});
// Once a day a visit nudges the site to publish articles scheduled for today (the site has no cron).
if (!site.demo && /\/lead\.php$/.test(site.leadEndpoint || '')) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem('site-tick') !== today) {
      localStorage.setItem('site-tick', today);
      navigator.sendBeacon?.(site.leadEndpoint.replace(/lead\.php$/, 'tick.php'));
    }
  } catch { /* private mode: skip */ }
}
// Demo template: the phone number is made up, so a tap leads to the form instead of dialling it.
if (site.demo) document.querySelectorAll('a[href^="tel:"]').forEach(link => { link.href = '#contact'; });

async function sendLead(payload) {
  // Demo template: nothing is sent anywhere, the visitor just sees the normal success flow.
  if (site.demo) return new Promise(resolve => setTimeout(() => resolve({ ok: true, demo: true }), 500));
  const response = await fetch(site.leadEndpoint || '/api/leads', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...payload, page: location.pathname }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Не удалось отправить заявку. Попробуйте ещё раз.');
  return result;
}
const phoneLooksValid = value => (value.match(/\d/g) || []).length >= 10;
function setMessage(element, text, success = false) {
  element.textContent = text;
  element.classList.toggle('is-success', success);
}
// Goals for Yandex Metrika: analytics.js listens (and does nothing without a counter).
function goal(name) {
  window.dispatchEvent(new CustomEvent('ariella:goal', { detail: name }));
}
document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link) return;
  if (link.href.startsWith('tel:')) goal('phone_click');
  else if (link.hasAttribute('data-telegram') || /\/\/t\.me\//.test(link.href)) goal('telegram_click');
});
// Shared with configurator.js (loaded as a module right after this script).
window.ariella = { site, telegramMode, telegramUrl, sendLead, phoneLooksValid, setMessage, goal };

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------- Header, menu, sticky mobile CTA ---------- */
const header = document.querySelector('#site-header');
const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
const mobileCta = document.querySelector('#mobile-cta');
const hero = document.querySelector('.hero');
const formsInView = new Set();

function onScroll() {
  header.classList.toggle('is-scrolled', window.scrollY > 30);
  const pastHero = hero ? hero.getBoundingClientRect().bottom < 80 : window.scrollY > 400;
  const show = pastHero && formsInView.size === 0;
  mobileCta.classList.toggle('is-visible', show);
  mobileCta.setAttribute('aria-hidden', String(!show));
  mobileCta.querySelectorAll('a').forEach(link => { link.tabIndex = show ? 0 : -1; });
}
window.addEventListener('scroll', onScroll, { passive: true });
if ('IntersectionObserver' in window) {
  // The sticky bar hides over the quiz, the configurator and the contact block (they have their own buttons).
  const formWatcher = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) formsInView.add(entry.target.id); else formsInView.delete(entry.target.id); });
    onScroll();
  }, { rootMargin: '-20% 0px -20% 0px' });
  ['#quiz', '#contact', '#configurator'].map(id => document.querySelector(id)).filter(Boolean).forEach(section => formWatcher.observe(section));
}
onScroll();

function closeMenu() {
  mobileNav.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Открыть меню');
}
menuToggle.addEventListener('click', () => {
  const opened = menuToggle.getAttribute('aria-expanded') === 'true';
  if (opened) return closeMenu();
  mobileNav.hidden = false;
  menuToggle.setAttribute('aria-expanded', 'true');
  menuToggle.setAttribute('aria-label', 'Закрыть меню');
});
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !mobileNav.hidden) closeMenu(); });

/* ---------- Reveal on scroll ---------- */
const revealElements = document.querySelectorAll('.project-card, .portfolio-cta, .quiz-panel, .config-shell, .design-points li, .faq details, .final-content');
if ('IntersectionObserver' in window && !reduceMotion) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: .08, rootMargin: '0px 0px 40px 0px' });
  revealElements.forEach((element, index) => {
    element.classList.add('reveal');
    element.style.transitionDelay = `${(index % 3) * 70}ms`;
    observer.observe(element);
  });
}

/* ---------- Hero parallax and 3D tilt ---------- */
const heroVisual = document.querySelector('[data-parallax]');
if (hero && heroVisual && finePointer && !reduceMotion) {
  hero.addEventListener('pointermove', event => {
    const rect = hero.getBoundingClientRect();
    heroVisual.style.setProperty('--mx', ((event.clientX - rect.left) / rect.width - .5).toFixed(3));
    heroVisual.style.setProperty('--my', ((event.clientY - rect.top) / rect.height - .5).toFixed(3));
  });
  hero.addEventListener('pointerleave', () => {
    heroVisual.style.setProperty('--mx', '0');
    heroVisual.style.setProperty('--my', '0');
  });
}
if (finePointer && !reduceMotion) {
  document.querySelectorAll('[data-tilt]').forEach(card => {
    card.addEventListener('pointermove', event => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.setProperty('--rx', `${((x - .5) * 9).toFixed(2)}deg`);
      card.style.setProperty('--ry', `${((.5 - y) * 9).toFixed(2)}deg`);
      card.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
      card.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
}

/* ---------- Process line fills while scrolling ---------- */
const track = document.querySelector('[data-process]');
const steps = track ? [...track.querySelectorAll('.process-step')] : [];
const verticalProcess = window.matchMedia('(max-width: 980px)');
function updateProcess() {
  if (!track) return;
  const rect = track.getBoundingClientRect();
  const viewport = window.innerHeight;
  const progress = reduceMotion ? 1 : verticalProcess.matches
    ? (viewport * .72 - rect.top) / Math.max(rect.height, 1)
    : (viewport * .88 - rect.top) / (viewport * .5);
  const clamped = Math.min(1, Math.max(0, progress));
  track.style.setProperty('--progress', clamped.toFixed(3));
  steps.forEach((step, index) => step.classList.toggle('is-active', clamped >= index / Math.max(steps.length - 1, 1) - .001));
}
window.addEventListener('scroll', updateProcess, { passive: true });
window.addEventListener('resize', updateProcess);
updateProcess();

/* ---------- Portfolio filter and dialog ---------- */
const filterButtons = document.querySelectorAll('.filter');
const projectCards = [...document.querySelectorAll('.project-card')];
// The first 9 works are shown, the rest after «Показать все работы» (all of them stay in the page for search engines).
const portfolioMore = document.querySelector('[data-portfolio-more]');
const PORTFOLIO_FIRST = 9;
let portfolioFilter = 'all';
let portfolioExpanded = false;
function applyPortfolio() {
  let matched = 0;
  projectCards.forEach(card => {
    const match = portfolioFilter === 'all' || card.dataset.category === portfolioFilter;
    card.hidden = !match || (!portfolioExpanded && matched >= PORTFOLIO_FIRST);
    if (match) matched += 1;
  });
  if (portfolioMore) {
    portfolioMore.hidden = portfolioExpanded || matched <= PORTFOLIO_FIRST;
    portfolioMore.textContent = `Показать все работы (${matched})`;
  }
}
filterButtons.forEach(button => button.addEventListener('click', () => {
  portfolioFilter = button.dataset.filter;
  filterButtons.forEach(other => {
    const active = other === button;
    other.classList.toggle('is-active', active);
    other.setAttribute('aria-pressed', String(active));
  });
  applyPortfolio();
}));
portfolioMore?.addEventListener('click', () => { portfolioExpanded = true; applyPortfolio(); });
applyPortfolio();

const projectDialog = document.querySelector('#project-dialog');
const dialogImage = document.querySelector('#dialog-image');
const dialogThumbs = document.querySelector('#dialog-thumbs');
const dialogCounter = document.querySelector('#dialog-counter');
const dialogDetails = document.querySelector('#dialog-details');
// Project photos and details come from the admin panel as JSON; older builds fall back to data attributes.
const portfolioData = (() => {
  try { return JSON.parse(document.querySelector('#portfolio-data')?.textContent || '[]'); }
  catch { return []; }
})();
let gallery = [];
let galleryIndex = 0;

function showPhoto(index) {
  if (!gallery.length) return;
  galleryIndex = (index + gallery.length) % gallery.length;
  const photo = gallery[galleryIndex];
  dialogImage.removeAttribute('srcset');
  if (photo.small) {
    dialogImage.srcset = `${photo.small} 900w, ${photo.src} ${photo.w || 1800}w`;
    dialogImage.sizes = '(max-width: 980px) 94vw, 56vw';
  }
  dialogImage.src = photo.src;
  dialogImage.alt = photo.alt || '';
  if (dialogCounter) dialogCounter.textContent = `${galleryIndex + 1} / ${gallery.length}`;
  dialogThumbs?.querySelectorAll('button').forEach((button, i) => button.setAttribute('aria-current', String(i === galleryIndex)));
  dialogThumbs?.children[galleryIndex]?.scrollIntoView({ block: 'nearest', inline: 'center' });
}

function openProject(card, start = 0) {
  if (!projectDialog) return;
  const data = portfolioData[Number(card.dataset.index)];
  gallery = data?.images?.length ? data.images : [{ src: card.dataset.image, alt: card.querySelector('img').alt }];
  document.querySelector('#dialog-title').textContent = data?.title ?? card.dataset.title;
  document.querySelector('#dialog-description').textContent = data?.description ?? card.dataset.description;
  if (dialogDetails) {
    dialogDetails.replaceChildren(...(data?.details || []).flatMap(item => {
      const term = document.createElement('dt');
      term.textContent = item.label;
      const value = document.createElement('dd');
      value.textContent = item.value;
      return [term, value];
    }));
    dialogDetails.hidden = !data?.details?.length;
  }
  if (dialogThumbs) {
    dialogThumbs.replaceChildren(...gallery.map((photo, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `Фото ${i + 1} из ${gallery.length}`);
      const img = document.createElement('img');
      img.src = photo.small || photo.src;
      img.alt = '';
      img.loading = 'lazy';
      button.append(img);
      button.addEventListener('click', () => showPhoto(i));
      return button;
    }));
  }
  projectDialog.classList.toggle('has-gallery', gallery.length > 1);
  showPhoto(start);
  projectDialog.showModal();
  document.body.classList.add('modal-open');
  goal('project_open');
}
// Card carousel: swipe on phones (scroll snap), arrows on computers; a click opens the project at the photo shown.
projectCards.forEach(card => {
  const strip = card.querySelector('.project-slides');
  const dots = [...card.querySelectorAll('.slide-dots i')];
  const current = () => (strip ? Math.round(strip.scrollLeft / Math.max(strip.clientWidth, 1)) : 0);
  const go = index => {
    const count = strip?.children.length || 0;
    if (count < 2) return;
    strip.scrollTo({ left: ((index + count) % count) * strip.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  const mark = () => dots.forEach((dot, i) => dot.classList.toggle('is-on', i === current()));
  strip?.addEventListener('scroll', () => requestAnimationFrame(mark), { passive: true });
  mark();
  card.querySelector('.slide-prev')?.addEventListener('click', event => { event.stopPropagation(); go(current() - 1); });
  card.querySelector('.slide-next')?.addEventListener('click', event => { event.stopPropagation(); go(current() + 1); });
  card.addEventListener('click', event => {
    if (event.target.closest('.slide-arrow')) return;
    openProject(card, current());
  });
});
projectDialog?.querySelector('[data-gallery-prev]')?.addEventListener('click', () => showPhoto(galleryIndex - 1));
projectDialog?.querySelector('[data-gallery-next]')?.addEventListener('click', () => showPhoto(galleryIndex + 1));
projectDialog?.addEventListener('keydown', event => {
  if (gallery.length < 2) return;
  if (event.key === 'ArrowLeft') showPhoto(galleryIndex - 1);
  if (event.key === 'ArrowRight') showPhoto(galleryIndex + 1);
});
// Swipe on phones.
let swipeX = null;
dialogImage?.addEventListener('pointerdown', event => { swipeX = event.clientX; });
dialogImage?.addEventListener('pointerup', event => {
  if (swipeX === null || gallery.length < 2) return;
  const dx = event.clientX - swipeX;
  swipeX = null;
  if (Math.abs(dx) > 40) showPhoto(galleryIndex + (dx < 0 ? 1 : -1));
});
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('.dialog-close')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => document.body.classList.remove('modal-open'));
});
document.querySelector('#dialog-cta')?.addEventListener('click', () => projectDialog.close());

/* ---------- Quiz ---------- */
const quiz = document.querySelector('#quiz-form');
if (quiz) setupQuiz();
function setupQuiz() {
const quizSteps = [...quiz.querySelectorAll('.quiz-step')];
const nextButton = document.querySelector('#quiz-next');
const backButton = document.querySelector('#quiz-back');
const submitButton = document.querySelector('#quiz-submit');
const quizMessage = document.querySelector('#quiz-message');
const quizPreview = document.querySelector('#quiz-preview');
const quizTelegram = document.querySelector('#quiz-telegram');
let currentStep = 0;

function quizRequestText() {
  const data = new FormData(quiz);
  const lines = ['Здравствуйте! Хочу обсудить проект мебели.'];
  const add = (label, value) => { const text = String(value || '').trim(); if (text) lines.push(`${label}: ${text}`); };
  add('Мебель', data.get('furniture'));
  add('Помещение', data.get('space'));
  add('Этап', data.get('stage'));
  add('Пожелания', data.get('comment'));
  lines.push(`(запрос с сайта ${site.brand})`);
  return lines.join('\n');
}

function showStep(index) {
  currentStep = index;
  quizSteps.forEach((step, position) => {
    step.hidden = position !== index;
    step.classList.toggle('is-current', position === index);
  });
  document.querySelector('#step-current').textContent = String(index + 1);
  document.querySelector('#quiz-progress-fill').style.width = `${(index + 1) * 25}%`;
  backButton.hidden = index === 0;
  nextButton.hidden = index === quizSteps.length - 1;
  submitButton.hidden = index !== quizSteps.length - 1;
  setMessage(quizMessage, '');
  if (index === quizSteps.length - 1 && telegramMode) {
    const text = quizRequestText();
    quizPreview.textContent = text;
    quizTelegram.href = telegramUrl(text);
  }
}

function stepValid(index) {
  const fields = ['furniture', 'space', 'stage'];
  if (index < 3 && !quiz.querySelector(`input[name="${fields[index]}"]:checked`)) {
    setMessage(quizMessage, 'Выберите один вариант, чтобы перейти дальше.');
    return false;
  }
  return true;
}

nextButton.addEventListener('click', () => { if (stepValid(currentStep)) showStep(Math.min(currentStep + 1, quizSteps.length - 1)); });
backButton.addEventListener('click', () => showStep(Math.max(currentStep - 1, 0)));
let quizStarted = false;
quizSteps.forEach((step, index) => {
  step.querySelectorAll('input[type="radio"]').forEach(input => input.addEventListener('change', () => {
    if (!quizStarted) { quizStarted = true; goal('quiz_start'); }
    setMessage(quizMessage, '');
    if (index < 2) setTimeout(() => showStep(index + 1), 260);
  }));
});
quizTelegram.addEventListener('click', () => {
  if (!telegramHandle) return;
  goal('lead_telegram');
  setMessage(quizMessage, `Открываем Telegram. Если чат не открылся, напишите нам: @${telegramHandle}`, true);
});

quiz.addEventListener('submit', async event => {
  event.preventDefault();
  if (telegramMode) return;
  const data = new FormData(quiz);
  const phone = String(data.get('phone') || '').trim();
  if (!phoneLooksValid(phone)) return setMessage(quizMessage, 'Укажите телефон, по которому можно с вами связаться.');
  if (!data.get('consent')) return setMessage(quizMessage, 'Подтвердите согласие на связь по заявке.');
  const submitLabel = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = 'Отправляем…';
  try {
    await sendLead({
      name: String(data.get('name') || '').trim(),
      phone,
      telegram: String(data.get('telegram') || '').trim(),
      furniture: String(data.get('furniture') || ''),
      space: String(data.get('space') || ''),
      stage: String(data.get('stage') || ''),
      comment: String(data.get('comment') || '').trim(),
      consent: true,
      source: 'quiz',
      website: String(data.get('website') || ''),
    });
    goal('lead');
    goal('lead_quiz');
    showQuizSuccess();
  } catch (error) {
    setMessage(quizMessage, error.message);
    submitButton.disabled = false;
    submitButton.textContent = submitLabel;
  }
});

function showQuizSuccess() {
  const panel = document.createElement('div');
  panel.className = 'success-panel';
  const add = (tag, text, className) => { const element = document.createElement(tag); element.textContent = text; if (className) element.className = className; panel.append(element); return element; };
  add('span', 'Запрос отправлен');
  add('h3', site.successTitle);
  add('p', site.successText);
  if (document.querySelector('#configurator')) add('a', 'Собрать проект в конструкторе', 'button button-dark').href = '#configurator';
  document.querySelector('.quiz-panel').replaceChildren(panel);
}
}

/* ---------- Quick form (server mode only) ---------- */
const quickForm = document.querySelector('#quick-form');
const quickMessage = document.querySelector('#quick-message');
quickForm?.addEventListener('submit', async event => {
  event.preventDefault();
  if (telegramMode) return;
  const data = new FormData(quickForm);
  const phone = String(data.get('phone') || '').trim();
  if (!phoneLooksValid(phone)) return setMessage(quickMessage, 'Укажите телефон для связи.');
  if (!data.get('consent')) return setMessage(quickMessage, 'Подтвердите согласие на связь по заявке.');
  const button = quickForm.querySelector('button[type="submit"]');
  const submitLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Отправляем…';
  try {
    await sendLead({ name: String(data.get('name') || '').trim(), phone, furniture: 'Не указано', consent: true, source: 'quick', website: String(data.get('website') || '') });
    goal('lead');
    goal('lead_quick');
    quickForm.reset();
    setMessage(quickMessage, 'Спасибо! Заявка сохранена. Мы свяжемся с вами.', true);
  } catch (error) {
    setMessage(quickMessage, error.message);
  } finally {
    button.disabled = false;
    button.textContent = submitLabel;
  }
});
