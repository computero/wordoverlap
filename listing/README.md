# House listing site (Vite, frontend-only)

This project is fully data-driven.

After initial deploy, you only update:
- `config/config.json`
- files in `config/photos/`

No HTML edits are needed.

## Listing Maker (frontend-only)

Use [editor/index.html](./editor/index.html) for creating/editing listings and exporting a package.

- URL in dev: `/editor/`
- URL in production (with `VITE_BASE_URL=/listing/`): `/listing/editor/`
- Rendering is hard-locked to the same shared template as the live page (`src/listing-template.js`), so layout/style changes apply to both.
- Import: drag-and-drop (or file picker) with `config.json` + photo files
- Export: one ZIP containing:
  - `config.json`
  - `photos/` folder with referenced images
- Editing interactions:
  - Mobile: long-tap for edit menu, double-tap quick edit
  - Desktop: right-click custom menu, double-click quick edit

The public listing still reads from `config/config.json` + `config/photos/*`.

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Config format

`config/config.json` structure:

```json
{
  "listing": {
    "title": "123 Main St, Your City",
    "askingPrice": "$499,000",
    "contactEmail": "owner@example.com",
    "contactLabel": "Contact Owner"
  },
  "hero": {
    "photo": "photos/front_yard.png",
    "subheading": "optional",
    "body": "optional"
  },
  "highlights": [
    { "label": "New roof", "value": "optional" }
  ],
  "proximity": [
    { "place": "Downtown", "distance": "12 min drive" }
  ],
  "gallery": [
    {
      "photo": "photos/kitchen.png",
      "subheading": "optional",
      "body": "optional"
    }
  ]
}
```

`gallery[].subheading` and `gallery[].body` are optional, as requested.
