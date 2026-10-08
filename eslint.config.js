import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

// eslint-plugin-react-hooks@4 uses context.getSourceCode()/getFilename() APIs
// removed in ESLint 10. Reinstate the rules once bumped to v7+ (v7 pulls in
// zod + @babel/core + hermes-parser, so worth doing in its own PR).
export default [
    ...tsPlugin.configs['flat/recommended'],
    reactPlugin.configs.flat.recommended,
    reactPlugin.configs.flat['jsx-runtime'],
    importPlugin.flatConfigs.recommended,
    importPlugin.flatConfigs.typescript,
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: { jsx: true },
            },
        },
        plugins: {
            prettier: prettierPlugin,
        },
        settings: {
            react: { version: '19.2.8' },
            'import/resolver': {
                typescript: true,
                node: true,
            },
        },
        rules: {
            '@typescript-eslint/ban-ts-comment': 'off',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'comma-dangle': 'off',
            'curly': 'off',
            'import/default': 'off',
            'import/named': 'off',
            'import/namespace': 'off',
            'import/no-duplicates': 2,
            'import/no-named-as-default': 'off',
            'import/no-named-as-default-member': 'off',
            'import/no-unresolved': [2, { commonjs: true, amd: true }],
            'no-case-declarations': 'off',
            'no-undef': 'off',
            'object-shorthand': ['error', 'always'],
            'react/prop-types': 'off',
            'react/react-in-jsx-scope': 'off',
            'prettier/prettier': ['error', { endOfLine: 'auto' }],
        },
    },
    prettierConfig,
];
