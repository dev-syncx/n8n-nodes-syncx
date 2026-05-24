const tseslint = require('typescript-eslint');
const n8nPlugin = require('eslint-plugin-n8n-nodes-base');

module.exports = tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
  {
    plugins: { 'n8n-nodes-base': n8nPlugin },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'eqeqeq': ['error', 'always'],
      'prefer-const': 'error',

      // n8n node quality rules (used by the scan tool)
      ...n8nPlugin.configs.nodes.rules,
      ...n8nPlugin.configs.credentials.rules,

      // This rule incorrectly treats full HTTPS URLs as camelCase keys — disable it
      'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
    },
  },
);
