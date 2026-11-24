// ESLint (configuración plana). Ejecutar con: npm run lint
// Es .mjs porque el proyecto de Expo usa CommonJS por defecto (package.json sin "type": "module").
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/', '.expo/', 'android/', 'ios/', 'dist/', 'web-build/'] },
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // Complejidad ciclomática máxima por función: obliga a dividir la lógica en piezas pequeñas.
      complexity: ['error', { max: 7 }],
      // Reglas clásicas de los hooks de React, igual que en la web.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
);
