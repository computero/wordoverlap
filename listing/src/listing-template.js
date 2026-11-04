export const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const optionalText = (value) => (value ? `<p>${escapeHtml(value)}</p>` : '');

const defaultAssetUrl = (value) => `${import.meta.env.BASE_URL}${String(value).replace(/^\/+/, '')}`;

const renderText = ({ mode, value, fallback, fieldPath, label, className = '' }) => {
  if (mode !== 'edit') return escapeHtml(value ?? '');
  const raw = value ?? '';
  const isTemp = raw.trim() === '';
  return `<span class="editable-field ${className} ${isTemp ? 'temp-text' : ''}" data-field-path="${fieldPath}" data-field-type="text" data-field-label="${label}" data-temp="${isTemp ? 'true' : 'false'}">${escapeHtml(isTemp ? fallback : raw)}</span>`;
};

const renderImage = ({ mode, photo, altText, className, fieldPath, resolveImage }) => {
  if (mode !== 'edit') {
    if (!photo) {
      return `
        <div class="${className} image-placeholder" aria-label="No image added yet">
          <span>+</span>
        </div>
      `;
    }
    return `<img class="${className}" src="${resolveImage(photo, fieldPath)}" alt="${escapeHtml(altText)}" loading="lazy" />`;
  }

  const imageSrc = photo ? resolveImage(photo, fieldPath) : '';
  if (!imageSrc) {
    return `
      <div class="${className} image-placeholder editable-field" data-field-path="${fieldPath}" data-field-type="image" data-field-label="image" aria-label="No image added yet">
        <span>+</span>
      </div>
    `;
  }
  return `<img class="${className} editable-field" src="${imageSrc}" alt="${escapeHtml(altText)}" loading="lazy" data-field-path="${fieldPath}" data-field-type="image" data-field-label="image" />`;
};

const renderHighlights = ({ mode, highlights = [] }) => {
  if (mode !== 'edit' && !highlights.length) return '';
  return `
    <section class="panel bottom-col highlights-col">
      <h2>What this house has</h2>
      <div class="badge-grid">
        ${highlights
          .map(
            (item, index) => `
          <article class="badge" ${mode === 'edit' ? `data-array-path="highlights.${index}"` : ''}>
            <h3>${
              mode === 'edit'
                ? renderText({
                    mode,
                    value: item.label ?? '',
                    fallback: 'Add feature',
                    fieldPath: `highlights.${index}.label`,
                    label: 'feature',
                    className: 'badge-edit'
                  })
                : escapeHtml(item.label ?? '')
            }</h3>
            ${
              mode === 'edit'
                ? `<p>${renderText({
                    mode,
                    value: item.value ?? '',
                    fallback: 'Add detail',
                    fieldPath: `highlights.${index}.value`,
                    label: 'detail',
                    className: 'badge-edit'
                  })}</p>`
                : item.value
                  ? `<p>${escapeHtml(item.value)}</p>`
                  : ''
            }
          </article>
        `
          )
          .join('')}
        ${
          mode === 'edit'
            ? '<button type="button" class="badge badge-add" data-action-add="highlights" aria-label="Add feature">+</button>'
            : ''
        }
      </div>
    </section>
  `;
};

const renderProximity = ({ mode, proximity = [] }) => {
  if (mode !== 'edit' && !proximity.length) return '';
  return `
    <section class="panel bottom-col proximity-col">
      <h2>Proximity</h2>
      <ul class="proximity-list">
        ${proximity
          .map(
            (item, index) => `
          <li ${mode === 'edit' ? `data-array-path="proximity.${index}"` : ''}>
            <span>${
              mode === 'edit'
                ? renderText({
                    mode,
                    value: item.place ?? '',
                    fallback: 'Add place',
                    fieldPath: `proximity.${index}.place`,
                    label: 'place',
                    className: 'prox-edit'
                  })
                : escapeHtml(item.place ?? '')
            }</span>
            ${
              mode === 'edit'
                ? `<strong>${renderText({
                    mode,
                    value: item.distance ?? '',
                    fallback: 'Add distance',
                    fieldPath: `proximity.${index}.distance`,
                    label: 'distance',
                    className: 'prox-edit'
                  })}</strong>`
                : item.distance
                  ? `<strong>${escapeHtml(item.distance)}</strong>`
                  : ''
            }
          </li>
        `
          )
          .join('')}
        ${
          mode === 'edit'
            ? `
          <li class="proximity-add-row">
            <button type="button" class="proximity-add" data-action-add="proximity" aria-label="Add proximity">+</button>
          </li>
        `
            : ''
        }
      </ul>
    </section>
  `;
};

const renderGallery = ({ mode, gallery = [], resolveImage }) => {
  if (mode !== 'edit' && !gallery.length) return '';
  return `
    <section class="panel photo-tour-panel">
      <h2>Photo tour</h2>
      <div class="gallery-grid">
        ${gallery
          .map((item, index) => {
            const title = item.subheading ?? '';
            const body = item.body ?? '';
            return `
          <article class="gallery-card" ${mode === 'edit' ? `data-array-path="gallery.${index}"` : `data-photo-index="${index}"`}>
            ${renderImage({
              mode,
              photo: item.photo,
              altText: title || 'House photo',
              className: mode === 'edit' ? 'gallery-photo' : 'photo-expand-trigger gallery-photo',
              fieldPath: `gallery.${index}.photo`,
              resolveImage
            })}
            <div class="gallery-card-content">
              ${
                mode === 'edit'
                  ? `<h3>${renderText({
                      mode,
                      value: title,
                      fallback: 'Add subtitle',
                      fieldPath: `gallery.${index}.subheading`,
                      label: 'subtitle',
                      className: 'gallery-edit'
                    })}</h3>`
                  : title
                    ? `<h3>${escapeHtml(title)}</h3>`
                    : ''
              }
              ${
                mode === 'edit'
                  ? `<p>${renderText({
                      mode,
                      value: body,
                      fallback: 'Add description',
                      fieldPath: `gallery.${index}.body`,
                      label: 'description',
                      className: 'gallery-edit'
                    })}</p>`
                  : optionalText(body)
              }
            </div>
          </article>
        `;
          })
          .join('')}
        ${
          mode === 'edit'
            ? '<button type="button" class="gallery-card gallery-add" data-action-add="gallery" aria-label="Add photo section">+</button>'
            : ''
        }
      </div>
    </section>
  `;
};

const renderLightbox = () => `
  <aside class="lightbox" id="photo-lightbox" aria-hidden="true">
    <button class="lightbox-close" type="button" aria-label="Close fullscreen photo">×</button>
    <div class="lightbox-content">
      <img class="lightbox-image" src="" alt="" />
      <div class="lightbox-copy">
        <h3 class="lightbox-title"></h3>
        <p class="lightbox-body"></p>
      </div>
    </div>
  </aside>
`;

export const buildListingMarkup = (config, options = {}) => {
  const mode = options.mode === 'edit' ? 'edit' : 'view';
  const listing = config.listing ?? {};
  const hero = config.hero ?? {};
  const resolveImage = options.resolveImage ?? ((value) => defaultAssetUrl(value));
  const contactEmail = listing.contactEmail ?? '';
  const contactLabel = listing.contactLabel || 'Contact Owner';
  const contactHref = contactEmail ? `mailto:${contactEmail}` : '#';

  return `
    <main class="site-shell">
      <section class="hero">
        ${renderImage({
          mode,
          photo: hero.photo,
          altText: listing.title || 'House listing',
          className: mode === 'edit' ? 'hero-image' : 'hero-image photo-expand-trigger',
          fieldPath: 'hero.photo',
          resolveImage
        })}
        <div class="hero-overlay">
          <p class="eyebrow">For sale by owner</p>
          <h1>${
            mode === 'edit'
              ? renderText({
                  mode,
                  value: listing.title ?? '',
                  fallback: 'Add title',
                  fieldPath: 'listing.title',
                  label: 'title',
                  className: 'hero-edit'
                })
              : escapeHtml(listing.title ?? '')
          }</h1>
          <p class="price">${
            mode === 'edit'
              ? renderText({
                  mode,
                  value: listing.askingPrice ?? '',
                  fallback: 'Add asking price',
                  fieldPath: 'listing.askingPrice',
                  label: 'asking price',
                  className: 'hero-edit'
                })
              : escapeHtml(listing.askingPrice ?? '')
          }</p>
          ${
            mode === 'edit'
              ? `<h2>${renderText({
                  mode,
                  value: hero.subheading ?? '',
                  fallback: 'Add subheading',
                  fieldPath: 'hero.subheading',
                  label: 'subheading',
                  className: 'hero-edit'
                })}</h2>`
              : hero.subheading
                ? `<h2>${escapeHtml(hero.subheading)}</h2>`
                : ''
          }
          ${
            mode === 'edit'
              ? `<p>${renderText({
                  mode,
                  value: hero.body ?? '',
                  fallback: 'Add body text',
                  fieldPath: 'hero.body',
                  label: 'body text',
                  className: 'hero-edit'
                })}</p>`
              : optionalText(hero.body)
          }
        </div>
      </section>

      ${renderGallery({ mode, gallery: config.gallery ?? [], resolveImage })}
      <section class="bottom-panels">
        ${renderHighlights({ mode, highlights: config.highlights ?? [] })}
        ${renderProximity({ mode, proximity: config.proximity ?? [] })}
      </section>

      <a class="contact-fab ${mode === 'edit' ? 'editable-field' : ''}" href="${contactHref}" ${contactEmail ? '' : 'aria-disabled="true"'} ${mode === 'edit' ? 'data-contact-root="true"' : ''} aria-label="${escapeHtml(contactLabel)}">
        <span class="contact-icon" aria-hidden="true">✉</span>
        <span class="contact-label">${
          mode === 'edit'
            ? renderText({
                mode,
                value: listing.contactLabel ?? '',
                fallback: 'Contact Owner',
                fieldPath: 'listing.contactLabel',
                label: 'contact label',
                className: 'contact-edit'
              })
            : escapeHtml(contactLabel)
        }</span>
      </a>
    </main>
    ${mode === 'view' ? renderLightbox() : '<div id="editor-context-menu" class="editor-context-menu"></div>'}
  `;
};
