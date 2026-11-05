const markGalleryOrientation = (img) => {
  if (!(img instanceof HTMLImageElement) || !img.closest('.gallery-card')) return;

  const card = img.closest('.gallery-card');
  if (!card) return;

  const { naturalWidth, naturalHeight } = img;
  if (!naturalWidth || !naturalHeight) return;

  card.classList.toggle('is-portrait', naturalHeight > naturalWidth);
};

const watchImage = (img) => {
  if (!(img instanceof HTMLImageElement)) return;

  if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
    markGalleryOrientation(img);
    return;
  }

  img.addEventListener('load', () => markGalleryOrientation(img), { once: true });
};

export const applyGalleryImageOrientation = (root = document) => {
  root.querySelectorAll('.gallery-photo').forEach(watchImage);
};
