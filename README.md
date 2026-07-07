# Word Overlap

A interactive word overlap tool built with React and Vite. Drag one sentence under another and watch aligned letters light up in red. When there are no matches, the board turns green.

## Features

- **Drag interaction**: Move the shorter sentence left and right in character-snap increments
- **Live matching**: Letters that align across sentences glow red  
- **Stats tracking**: See how many offset positions produce matches vs. no matches
- **Keyboard support**: Use arrow keys to nudge the sentence, Home/End to jump to extremes
- **Responsive design**: Works on desktop and mobile

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Open [http://localhost:5173](http://localhost:5173) to view it in your browser.

## Deployment

This app is configured for automatic deployment to GitHub Pages via GitHub Actions. 

1. Push your code to the `main` branch
2. GitHub Actions will automatically build and deploy to `https://username.github.io/wordoverlap`
3. Make sure GitHub Pages is enabled in your repository settings and set to deploy from the `gh-pages` branch

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **CSS** - Custom styling
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
