'use strict';
const cfg = window.JKM_CONFIG || {};
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.getElementById('main-nav');
function closeMenu() {
  navigation?.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
}
menuButton?.addEventListener('click', () => {
  const opened = navigation.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(opened));
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.header')) closeMenu();
});
document.querySelector('[data-year]')?.replaceChildren(String(new Date().getFullYear()));
let toastTimer;
function toast(message) {
  const node = document.querySelector('.toast');
  node.textContent = message;
  node.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('visible'), 4500);
}
document.querySelectorAll('.pending-social').forEach((button) => {
  const name = button.dataset.social;
  const url = cfg.social?.[name.toLowerCase()];
  if (url && /^https:\/\//.test(url)) {
    const link = document.createElement('a');
    link.href = url;
    link.className = button.className;
    link.innerHTML = button.innerHTML;
    link.setAttribute('aria-label', name);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    button.replaceWith(link);
  } else
    button.addEventListener('click', () =>
      toast(`${name} link will be available soon. Please contact us on WhatsApp.`),
    );
});
document.getElementById('tracking-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const reference = new FormData(event.target).get('reference').trim();
  const url =
    'https://wa.me/255699830601?text=' +
    encodeURIComponent(`Hello JKM, please update me on my request/order: ${reference}`);
  const status = document.getElementById('tracking-status');
  status.replaceChildren();
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Continue to WhatsApp to send your update request ↗';
  link.className = 'text-link';
  status.append(link);
});
const quoteForm = document.getElementById('quote-form');
let captchaToken = '';
let captchaWidget;
const ready = () =>
  /^https:\/\/[a-z0-9.-]+$/.test(cfg.supabaseUrl || '') && Boolean(cfg.supabasePublishableKey);
function statusMessage(text, type = '') {
  const status = document.getElementById('form-status');
  status.textContent = text;
  status.className = 'form-status ' + type;
}
if (quoteForm) {
  const selected = new URLSearchParams(location.search).get('service');
  if (
    selected &&
    [...quoteForm.elements.service.options].some((option) => option.value === selected)
  )
    quoteForm.elements.service.value = selected;
  if (!ready())
    statusMessage(
      'Online submission is being connected. Please send your requirements on WhatsApp: +255 699 830 601.',
    );
  if (cfg.turnstileSiteKey) {
    window.jkmCaptchaLoaded = () => {
      captchaWidget = window.turnstile.render('#captcha', {
        sitekey: cfg.turnstileSiteKey,
        callback: (token) => {
          captchaToken = token;
        },
        'expired-callback': () => {
          captchaToken = '';
        },
        'error-callback': () => {
          captchaToken = '';
          statusMessage(
            'Verification could not load. Please retry or contact us on WhatsApp.',
            'error',
          );
        },
      });
    };
    const script = document.createElement('script');
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=jkmCaptchaLoaded&render=explicit';
    script.async = true;
    document.head.append(script);
  }
  quoteForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!quoteForm.reportValidity()) return;
    if (!ready()) {
      statusMessage(
        'Online submission is not available yet. Your request has not been sent. Please contact +255 699 830 601 on WhatsApp.',
        'error',
      );
      return;
    }
    const files = [...quoteForm.elements.attachments.files];
    if (
      files.length > 3 ||
      files.some(
        (file) =>
          file.size > 5 * 1024 * 1024 ||
          !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type),
      )
    ) {
      statusMessage(
        'Attach up to 3 JPG, PNG, WebP or PDF files, each no larger than 5 MB.',
        'error',
      );
      return;
    }
    if (!captchaToken) {
      statusMessage(
        'Please complete the security verification. If it is unavailable, contact us on WhatsApp.',
        'error',
      );
      return;
    }
    const data = new FormData(quoteForm);
    data.set('captcha_token', captchaToken);
    const button = quoteForm.querySelector('button[type=submit]');
    button.disabled = true;
    statusMessage('Sending your request…');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(cfg.supabaseUrl + '/functions/v1/submit-request', {
        method: 'POST',
        headers: { apikey: cfg.supabasePublishableKey },
        body: data,
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || !result.reference)
        throw new Error(result.error || 'Unable to send the request.');
      quoteForm.reset();
      statusMessage(
        `Request received. Your reference is ${result.reference}. Keep it for follow-up with our team.`,
        'success',
      );
    } catch (error) {
      statusMessage(
        error.name === 'AbortError'
          ? 'We could not confirm submission. Please check with our team before resending.'
          : 'Your submission could not be confirmed. Please retry or contact us on WhatsApp.',
        'error',
      );
    } finally {
      clearTimeout(timer);
      button.disabled = false;
      captchaToken = '';
      if (window.turnstile && captchaWidget !== undefined) window.turnstile.reset(captchaWidget);
    }
  });
}
