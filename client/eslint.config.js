import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
    { ignores: ['dist/', 'android/'] },
    js.configs.recommended,
    {
        files: ['src/**/*.{js,jsx}'],
        languageOptions: { globals: { ...globals.browser, __API_BASE__: 'readonly' }, parserOptions: { ecmaFeatures: { jsx: true } } },
        plugins: { 'react-hooks': reactHooks },
        rules: { ...reactHooks.configs.recommended.rules, 'react-hooks/set-state-in-effect': 'off', 'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z]' }], 'no-empty': ['error', { allowEmptyCatch: true }] },
    },
    { files: ['src/hooks/useApi.js', 'src/pages/StudiosPage.jsx'], rules: { 'react-hooks/exhaustive-deps': 'off' } },
    { files: ['*.config.js'], languageOptions: { globals: globals.node } },
];
