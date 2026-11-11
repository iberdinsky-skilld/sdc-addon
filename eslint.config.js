import js from '@eslint/js'
import tseslint from 'typescript-eslint'

const sharedRules = {
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/consistent-type-imports': [
    'error',
    { fixStyle: 'inline-type-imports' },
  ],
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', caughtErrors: 'none' },
  ],
}

export default tseslint.config(
  { ignores: ['dist/**', 'storybook-static/**', 'node_modules/**'] },
  {
    files: [
      'src/**/*.ts',
      'e2e/**/*.ts',
      'e2e/fixtures/**/.storybook/*.ts',
      '.storybook/**/*.ts',
    ],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...sharedRules,
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      // `||` on strings is intended: '' falls back too.
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        { ignorePrimitives: { string: true } },
      ],
      '@typescript-eslint/prefer-optional-chain': 'error',
    },
  }
)
