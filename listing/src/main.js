import './style.css';
import { buildListingMarkup, escapeHtml } from './listing-template.js';
import { applyGalleryImageOrientation } from './image-orientation.js';

const app = document.querySelector('#app');

const toAssetUrl = (value) => {
  if (!value) return '';
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:')) return value;
  return `${import.meta.env.BASE_URL}${value.replace(/^\/+/, '')}`;
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
  const lightboxItems = [];

  if (hero.photo) {
    lightboxItems.push({
      photo: hero.photo,
      title: hero.subheading || heroTitle,
      body: hero.body || ''
    });
  }

  for (const item of gallery) {
    if (!item?.photo) continue;
    lightboxItems.push({
      photo: item.photo,
      title: item.subheading ?? '',
      body: item.body ?? ''
    });
  }

  let activeLightboxIndex = -1;
  const lightbox = document.querySelector('#photo-lightbox');
  const image = lightbox?.querySelector('.lightbox-image');
  const titleEl = lightbox?.querySelector('.lightbox-title');
  const bodyEl = lightbox?.querySelector('.lightbox-body');
  const prevButton = lightbox?.querySelector('.lightbox-prev');
  const nextButton = lightbox?.querySelector('.lightbox-next');

  const renderLightboxItem = () => {
    if (!image || !titleEl || !bodyEl || !prevButton || !nextButton) return;
    const selected = lightboxItems[activeLightboxIndex];
    if (!selected) return;
    image.src = toAssetUrl(selected.photo);
    image.alt = selected.title || 'House photo';
    titleEl.textContent = selected.title;
    bodyEl.textContent = selected.body;
    titleEl.style.display = selected.title ? 'block' : 'none';
    bodyEl.style.display = selected.body ? 'block' : 'none';
    const hasMultiple = lightboxItems.length > 1;
    prevButton.style.display = hasMultiple ? 'grid' : 'none';
    nextButton.style.display = hasMultiple ? 'grid' : 'none';
  };

  const openLightboxAt = (index) => {
    if (!lightbox || !lightboxItems[index]) return;
    activeLightboxIndex = index;
    renderLightboxItem();
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
  };

  const moveLightbox = (delta) => {
    if (!lightbox.classList.contains('open') || lightboxItems.length < 2) return;
    activeLightboxIndex = (activeLightboxIndex + delta + lightboxItems.length) % lightboxItems.length;
    renderLightboxItem();
  };

  app.addEventListener('click', (event) => {
    const imageTarget = event.target.closest('.photo-expand-trigger');
    if (!imageTarget || imageTarget.classList.contains('image-placeholder')) return;
    if (imageTarget.classList.contains('hero-image')) {
      openLightboxAt(0);
      return;
    }
    const card = imageTarget.closest('[data-photo-index]');
    if (!card) return;
    const index = Number(card.dataset.photoIndex);
    if (!Number.isFinite(index) || !gallery[index]?.photo) return;
    const startIndex = hero.photo ? 1 : 0;
    openLightboxAt(startIndex + index);
  });

  lightbox?.addEventListener('click', (event) => {
    if (event.target.matches('.lightbox, .lightbox-close')) closeLightbox();
    if (event.target.matches('.lightbox-prev')) moveLightbox(-1);
    if (event.target.matches('.lightbox-next')) moveLightbox(1);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') moveLightbox(-1);
    if (event.key === 'ArrowRight') moveLightbox(1);
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
    applyGalleryImageOrientation(app);
    wireInteractions(config);
  } catch (error) {
    renderError(`Check your config/config.json format. ${error.message}`);
  }
}

loadConfig();
