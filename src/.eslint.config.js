// .eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from '@angular-eslint/eslint-plugin';
import angularTemplate from '@angular-eslint/eslint-plugin-template';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: false
      }
    },
    plugins: {
      '@angular-eslint': angular
    },
    rules: {
      // add Angular-specific rules as you like
    }
  },
  {
    files: ['**/*.html'],
    plugins: {
      '@angular-eslint/template': angularTemplate
    },
    rules: {
      // template rules
    }
  }
];
