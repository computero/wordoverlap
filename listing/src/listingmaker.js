import JSZip from 'jszip';
import './style.css';
import { buildListingMarkup } from './listing-template.js';

const app = document.querySelector('#app');

const defaultConfig = {
  listing: {
    title: '',
    askingPrice: '',
    contactEmail: '',
    contactLabel: 'Contact Owner'
  },
  hero: {
    photo: '',
    subheading: '',
    body: ''
  },
  highlights: [],
  proximity: [],
  gallery: []
};

const state = {
  config: structuredClone(defaultConfig),
  assetsByField: new Map(),
  context: null,
  longTapTimer: null,
  longTapTriggered: false,
  suppressClickUntil: 0
};

const hiddenPicker = document.createElement('input');
hiddenPicker.type = 'file';
hiddenPicker.accept = 'image/*';
hiddenPicker.style.display = 'none';
document.body.appendChild(hiddenPicker);

const toAssetUrl = (value) => `${import.meta.env.BASE_URL}${String(value).replace(/^\/+/, '')}`;

const getAtPath = (obj, path) =>
  path.split('.').reduce((acc, key) => {
    if (acc == null) return undefined;
    if (/^\d+$/.test(key)) return acc[Number(key)];
    return acc[key];
  }, obj);

const setAtPath = (obj, path, value) => {
  const parts = path.split('.');
  const last = parts.pop();
  const target = parts.reduce((acc, key) => (/^\d+$/.test(key) ? acc[Number(key)] : acc[key]), obj);
  if (/^\d+$/.test(last)) {
    target[Number(last)] = value;
  } else {
    target[last] = value;
  }
};

const removeAtPath = (obj, path) => {
  const parts = path.split('.');
  const last = parts.pop();
  const target = parts.reduce((acc, key) => (/^\d+$/.test(key) ? acc[Number(key)] : acc[key]), obj);
  if (!Array.isArray(target)) return;
  target.splice(Number(last), 1);
};

const sanitizeName = (name) => name.toLowerCase().replace(/[^a-z0-9._-]/g, '_');

const collectPhotoFields = (config) => {
  const rows = [{ fieldPath: 'hero.photo', value: config.hero?.photo ?? '' }];
  (config.gallery ?? []).forEach((item, index) => {
    rows.push({ fieldPath: `gallery.${index}.photo`, value: item.photo ?? '' });
  });
  return rows;
};

const uniquePhotoName = (name) => {
  const used = new Set(
    collectPhotoFields(state.config)
      .map((entry) => String(entry.value || '').split('/').pop())
      .filter(Boolean)
  );
  if (!used.has(name)) return name;
  const dot = name.lastIndexOf('.');
  const base = dot > -1 ? name.slice(0, dot) : name;
  const ext = dot > -1 ? name.slice(dot) : '';
  let i = 2;
  while (used.has(`${base}_${i}${ext}`)) i += 1;
  return `${base}_${i}${ext}`;
};

const fileToObjectUrl = (fieldPath, file) => {
  const existing = state.assetsByField.get(fieldPath);
  if (existing?.url) URL.revokeObjectURL(existing.url);
  const url = URL.createObjectURL(file);
  state.assetsByField.set(fieldPath, { file, url });
  return url;
};

const assignImageFile = (fieldPath, file) => {
  const safeName = uniquePhotoName(sanitizeName(file.name || 'photo.png'));
  fileToObjectUrl(fieldPath, file);
  setAtPath(state.config, fieldPath, `photos/${safeName}`);
};

const getDisplayImage = (fieldPath, storedPath) => {
  const linked = state.assetsByField.get(fieldPath);
  if (linked?.url) return linked.url;
  if (!storedPath) return '';
  return toAssetUrl(storedPath);
};

const openImagePicker = (fieldPath) =>
  new Promise((resolve) => {
    hiddenPicker.value = '';
    hiddenPicker.onchange = () => {
      const file = hiddenPicker.files?.[0];
      if (!file) {
        resolve(false);
        return;
      }
      assignImageFile(fieldPath, file);
      render();
      resolve(true);
    };
    hiddenPicker.click();
  });

const addRow = (kind) => {
  if (kind === 'gallery') state.config.gallery.push({ photo: '', subheading: '', body: '' });
  if (kind === 'highlights') state.config.highlights.push({ label: '', value: '' });
  if (kind === 'proximity') state.config.proximity.push({ place: '', distance: '' });
  render();
};

const editTextField = (fieldPath, label) => {
  const current = getAtPath(state.config, fieldPath) ?? '';
  const next = window.prompt(`Edit ${label}`, current);
  if (next == null) return;
  setAtPath(state.config, fieldPath, next.trim());
  render();
};

const clearField = (fieldPath) => {
  setAtPath(state.config, fieldPath, '');
  const existing = state.assetsByField.get(fieldPath);
  if (existing?.url) URL.revokeObjectURL(existing.url);
  state.assetsByField.delete(fieldPath);
  render();
};

const startInlineTextEdit = (el, fieldPath) => {
  if (!el || el.dataset.editing === 'true') return;
  el.dataset.editing = 'true';
  const existingValue = getAtPath(state.config, fieldPath) ?? '';

  el.setAttribute('contenteditable', 'true');
  el.setAttribute('spellcheck', 'true');
  el.classList.add('inline-editing');

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(range);

  const finish = (commit) => {
    el.removeEventListener('keydown', onKeyDown);
    el.removeAttribute('contenteditable');
    el.classList.remove('inline-editing');
    delete el.dataset.editing;

    if (!commit) {
      render();
      return;
    }

    const nextValue = el.textContent.trim();
    if (nextValue === existingValue) {
      render();
      return;
    }
    setAtPath(state.config, fieldPath, nextValue);
    render();
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      finish(true);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      finish(false);
    }
  };

  el.addEventListener('keydown', onKeyDown);
  el.addEventListener('blur', () => finish(true), { once: true });
};

const sectionName = (kind) =>
  ({
    gallery: 'photo section',
    highlights: 'feature',
    proximity: 'proximity row'
  })[kind] || 'item';

const renderContextMenu = (x, y, target) => {
  const menu = document.querySelector('#editor-context-menu');
  if (!menu) return;

  const fieldPath = target.dataset.fieldPath || target.closest('[data-field-path]')?.dataset.fieldPath;
  const fieldType = target.dataset.fieldType || target.closest('[data-field-type]')?.dataset.fieldType;
  const fieldLabel = target.dataset.fieldLabel || target.closest('[data-field-label]')?.dataset.fieldLabel || 'value';
  const addKind = target.dataset.actionAdd || target.closest('[data-action-add]')?.dataset.actionAdd;
  const arrayPath = target.dataset.arrayPath || target.closest('[data-array-path]')?.dataset.arrayPath;

  const actions = [
    { action: 'import', label: 'Import json + photos' },
    { action: 'export', label: 'Export zip' }
  ];
  const contactRoot = target.closest('[data-contact-root="true"]');
  if (contactRoot) {
    actions.push({ action: 'edit-contact-email', label: 'Edit contact email' });
    actions.push({ action: 'clear-contact-email', label: 'Clear contact email' });
    actions.push({ action: 'edit-text', label: 'Edit contact label', fieldPath: 'listing.contactLabel', fieldLabel: 'contact label' });
  }

  if (addKind) actions.push({ action: 'add', label: `Add ${sectionName(addKind)}`, addKind });
  if (fieldPath && fieldType === 'image') {
    actions.push({ action: 'replace-image', label: 'Replace image', fieldPath });
    actions.push({ action: 'clear', label: 'Clear image', fieldPath });
  }
  if (fieldPath && fieldType !== 'image') {
    actions.push({ action: 'edit-text', label: `Edit ${fieldLabel}`, fieldPath, fieldLabel });
    actions.push({ action: 'clear', label: `Clear ${fieldLabel}`, fieldPath });
  }
  if (arrayPath) actions.push({ action: 'delete-row', label: 'Delete section', arrayPath });

  state.context = { actions };
  menu.innerHTML = actions.map((item, index) => `<button type="button" data-action-index="${index}">${item.label}</button>`).join('');
  menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - 220))}px`;
  menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - 260))}px`;
  menu.classList.add('open');
};

const closeContextMenu = () => {
  const menu = document.querySelector('#editor-context-menu');
  if (!menu) return;
  menu.classList.remove('open');
  state.context = null;
};

const handleImportFiles = async (files) => {
  const jsonFile = files.find((file) => file.name.toLowerCase().endsWith('.json'));
  if (!jsonFile) return;
  const json = JSON.parse(await jsonFile.text());
  state.config = {
    listing: { ...defaultConfig.listing, ...(json.listing ?? {}) },
    hero: { ...defaultConfig.hero, ...(json.hero ?? {}) },
    highlights: Array.isArray(json.highlights) ? json.highlights : [],
    proximity: Array.isArray(json.proximity) ? json.proximity : [],
    gallery: Array.isArray(json.gallery) ? json.gallery : []
  };

  const imagesByName = new Map(
    files
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => [file.name.toLowerCase(), file])
  );

  for (const field of collectPhotoFields(state.config)) {
    const name = String(field.value || '').split('/').pop()?.toLowerCase();
    if (!name) continue;
    const matching = imagesByName.get(name);
    if (!matching) continue;
    fileToObjectUrl(field.fieldPath, matching);
  }

  render();
};

const openImportPicker = () => {
  const picker = document.createElement('input');
  picker.type = 'file';
  picker.multiple = true;
  picker.accept = '.json,image/*';
  picker.onchange = async () => {
    const files = Array.from(picker.files ?? []);
    if (files.length) await handleImportFiles(files);
  };
  picker.click();
};

const exportZip = async () => {
  const zip = new JSZip();
  const photos = zip.folder('photos');
  const exportConfig = structuredClone(state.config);
  const usedNames = new Set();

  for (const field of collectPhotoFields(exportConfig)) {
    if (!field.value) continue;
    const basename = String(field.value).split('/').pop();
    if (!basename || usedNames.has(basename)) continue;
    usedNames.add(basename);
    const linked = state.assetsByField.get(field.fieldPath);
    if (linked?.file) {
      photos.file(basename, linked.file);
      continue;
    }
    try {
      const response = await fetch(toAssetUrl(field.value));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      photos.file(basename, await response.blob());
    } catch {
      // Keep export working even if referenced source file is missing.
    }
  }

  zip.file('config.json', JSON.stringify(exportConfig, null, 2));
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'listing-package.zip';
  a.click();
  URL.revokeObjectURL(url);
};

const runMenuAction = async (entry) => {
  if (entry.action === 'import') {
    openImportPicker();
    return;
  }
  if (entry.action === 'export') {
    await exportZip();
    return;
  }
  if (entry.action === 'replace-image') {
    await openImagePicker(entry.fieldPath);
    return;
  }
  if (entry.action === 'edit-contact-email') {
    const current = getAtPath(state.config, 'listing.contactEmail') ?? '';
    const next = window.prompt('Edit contact email', current);
    if (next == null) return;
    setAtPath(state.config, 'listing.contactEmail', next.trim());
    render();
    return;
  }
  if (entry.action === 'clear-contact-email') {
    setAtPath(state.config, 'listing.contactEmail', '');
    render();
    return;
  }
  if (entry.action === 'edit-text') {
    const textNode = app.querySelector(`[data-field-path="${entry.fieldPath}"][data-field-type="text"]`);
    if (textNode) {
      startInlineTextEdit(textNode, entry.fieldPath);
      return;
    }
    editTextField(entry.fieldPath, entry.fieldLabel);
    return;
  }
  if (entry.action === 'clear') {
    clearField(entry.fieldPath);
    return;
  }
  if (entry.action === 'add') {
    addRow(entry.addKind);
    return;
  }
  if (entry.action === 'delete-row') {
    removeAtPath(state.config, entry.arrayPath);
    render();
  }
};

const quickEdit = async (target) => {
  const addKind = target.dataset.actionAdd || target.closest('[data-action-add]')?.dataset.actionAdd;
  if (addKind) {
    addRow(addKind);
    return;
  }

  const fieldPath = target.dataset.fieldPath || target.closest('[data-field-path]')?.dataset.fieldPath;
  const fieldType = target.dataset.fieldType || target.closest('[data-field-type]')?.dataset.fieldType;
  const fieldLabel = target.dataset.fieldLabel || target.closest('[data-field-label]')?.dataset.fieldLabel || 'value';
  if (!fieldPath) return;

  if (fieldType === 'image') {
    await openImagePicker(fieldPath);
    return;
  }
  const textTarget = target.closest(`[data-field-path="${fieldPath}"][data-field-type="text"]`) || target;
  startInlineTextEdit(textTarget, fieldPath);
};

const bindEvents = () => {
  app.addEventListener('click', async (event) => {
    if (Date.now() < state.suppressClickUntil) return;
    const contactLink = event.target.closest('.contact-fab');
    if (contactLink) event.preventDefault();

    const menuButton = event.target.closest('[data-action-index]');
    if (menuButton) {
      const action = state.context?.actions?.[Number(menuButton.dataset.actionIndex)];
      closeContextMenu();
      if (action) await runMenuAction(action);
      return;
    }

    const target = event.target.closest('[data-field-path], [data-action-add], [data-field-type]');
    if (target) {
      closeContextMenu();
      await quickEdit(target);
      return;
    }

    closeContextMenu();
  });

  app.addEventListener(
    'touchstart',
    (event) => {
      const target = event.target.closest('[data-field-path], [data-action-add], [data-field-type], .site-shell');
      if (!target) return;
      const touch = event.touches[0];
      state.longTapTriggered = false;
      if (state.longTapTimer) clearTimeout(state.longTapTimer);
      state.longTapTimer = window.setTimeout(() => {
        renderContextMenu(touch.clientX, touch.clientY, target);
        state.longTapTriggered = true;
        state.longTapTimer = null;
      }, 460);
    },
    { passive: true }
  );

  app.addEventListener('touchend', () => {
    if (state.longTapTimer) {
      clearTimeout(state.longTapTimer);
      state.longTapTimer = null;
    }
    if (state.longTapTriggered) {
      state.suppressClickUntil = Date.now() + 700;
    }
    state.longTapTriggered = false;
  });

  app.addEventListener('touchcancel', () => {
    if (state.longTapTimer) {
      clearTimeout(state.longTapTimer);
      state.longTapTimer = null;
    }
    state.longTapTriggered = false;
  });

  app.addEventListener('contextmenu', (event) => {
    const target = event.target.closest('[data-field-path], [data-action-add], [data-field-type], [data-array-path], .site-shell');
    if (!target) return;
    event.preventDefault();
    renderContextMenu(event.clientX, event.clientY, target);
  });

  document.addEventListener('keydown', async (event) => {
    if (event.key.toLowerCase() === 'i' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      openImportPicker();
    }
    if (event.key.toLowerCase() === 'e' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      await exportZip();
    }
  });

  app.addEventListener('dragover', (event) => event.preventDefault());
  app.addEventListener('drop', async (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length) await handleImportFiles(files);
  });
};

const render = () => {
  app.innerHTML = buildListingMarkup(state.config, {
    mode: 'edit',
    resolveImage: (photo, fieldPath) => getDisplayImage(fieldPath, photo)
  });
};

render();
bindEvents();
