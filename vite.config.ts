import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import dyadComponentTagger from '@dyad-sh/react-vite-component-tagger';

export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement (comme API_KEY)
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [dyadComponentTagger(), react()],
    define: {
      // Polyfill de process.env.API_KEY pour le SDK Google GenAI
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});