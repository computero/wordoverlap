import './style.css';
import { buildListingMarkup, escapeHtml } from './listing-template.js';

const app = document.querySelector('#app');

const toAssetUrl = (value) => {
  if (!value) return '';
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:')) return value;
  return `${import.meta.env.BASE_URL}${value.replace(/^\/+/, '')}`;
};

const openLightbox = (photo, title = '', body = '') => {
  if (!photo) return;
  const lightbox = document.querySelector('#photo-lightbox');
  if (!lightbox) return;
  const image = lightbox.querySelector('.lightbox-image');
  const titleEl = lightbox.querySelector('.lightbox-title');
  const bodyEl = lightbox.querySelector('.lightbox-body');

  image.src = toAssetUrl(photo);
  image.alt = title || 'House photo';
  titleEl.textContent = title;
  bodyEl.textContent = body;
  titleEl.style.display = title ? 'block' : 'none';
  bodyEl.style.display = body ? 'block' : 'none';
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
};

const closeLightbox = () => {
  const lightbox = document.querySelector('#photo-lightbox');
  if (!lightbox) return;
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
};

const wireInteractions = (config) => {
  const gallery = config.gallery ?? [];
  const hero = config.hero ?? {};
  const heroTitle = config.listing?.title ?? '';

  app.addEventListener('click', (event) => {
    const imageTarget = event.target.closest('.photo-expand-trigger');
    if (!imageTarget || imageTarget.classList.contains('image-placeholder')) return;
    if (imageTarget.classList.contains('hero-image')) {
      openLightbox(hero.photo, hero.subheading || heroTitle, hero.body || '');
      return;
    }
    const card = imageTarget.closest('[data-photo-index]');
    if (!card) return;
    const index = Number(card.dataset.photoIndex);
    const selected = gallery[index];
    if (!selected) return;
    openLightbox(selected.photo, selected.subheading ?? '', selected.body ?? '');
  });

  const lightbox = document.querySelector('#photo-lightbox');
  lightbox?.addEventListener('click', (event) => {
    if (event.target.matches('.lightbox, .lightbox-close')) closeLightbox();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLightbox();
  });
};

const renderError = (message) => {
  app.innerHTML = `
    <main class="site-shell">
      <section class="panel error">
        <h1>Could not load listing</h1>
        <p>${escapeHtml(message)}</p>
      </section>
    </main>
  `;
};

async function loadConfig() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}config.json`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const config = await response.json();
    app.innerHTML = buildListingMarkup(config, {
      mode: 'view',
      resolveImage: (photo) => toAssetUrl(photo)
    });
    wireInteractions(config);
  } catch (error) {
    renderError(`Check your config/config.json format. ${error.message}`);
  }
}

loadConfig();
