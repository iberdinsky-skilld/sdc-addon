import type { Preview } from '@storybook/html'

import { themeDecorators, themeGlobalTypes } from './data-themes'

export const decorators = [
  ...themeDecorators, // Theme decorators
  // Your other decorators
]

export const globalTypes = {
  ...themeGlobalTypes, // Theme global types
  // Your other global types
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
}

export default preview
