# Songbook App

A React-based songbook management app with Supabase backend.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy to GitHub Pages

1. Upload all files to your GitHub repository (jusyers25-cloud/Songbook)
2. Go to Settings ? Pages
3. Under "Build and deployment", select "GitHub Actions"
4. Push to main branch to trigger deployment

Your app will be available at: https://jusyers25-cloud.github.io/Songbook/

## Environment Variables

Create a .env.local file:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Project Structure

- src/ - React source code
- public/ - Static assets
- .github/workflows/ - Deployment automation

## Technologies

- React 18
- TypeScript  
- Vite
- Tailwind CSS
- Supabase
