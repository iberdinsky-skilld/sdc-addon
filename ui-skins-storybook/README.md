# UI Skins Storybook

Generate Storybook ui-skins configuration from `*.ui_skins.themes.yml` files.

## Features

- Automatically generates Storybook theme configuration from YAML theme files
- Provides Vite plugin for seamless integration
- Supports theme targeting (html, body, or custom selectors)
- Hot reload support for theme file changes

## Installation

```bash
npm install @fredboulanger/ui-skins-storybook
```

## Usage

### Vite Plugin

Add the plugin to your Storybook configuration:

```typescript
// .storybook/main.ts
import { viteFinal } from '@storybook/html-vite'
import { vitePluginThemeGenerator } from '@fredboulanger/ui-skins-storybook'

export default {
  // ... other config
  viteFinal: async (config) => {
    return viteFinal(config, {
      plugins: [
        vitePluginThemeGenerator(),
        // ... other plugins
      ]
    })
  }
}
```

### Manual Generation

```typescript
import { generateThemes } from '@fredboulanger/ui-skins-storybook'

// Generate themes from *.ui_skins.themes.yml files
await generateThemes()
```

## Theme File Format

Create `*.ui_skins.themes.yml` files in your project:

```yaml
# Example: themes.ui_skins.themes.yml
cyberpunk:
  label: "Cyberpunk"
  label_context: "color"
  key: "data-theme"
  target: body

forest:
  label: "Forest"
  label_context: "color"
  key: "data-theme"
  target: html

garden:
  label: "Garden"
  label_context: "color"
  key: "data-theme"
  target: html
```

## Generated Output

The plugin generates a `.storybook/data-themes.ts` file with:

- Theme decorators for applying data-theme attributes
- Global types for Storybook toolbar
- Theme target mapping

## License

MIT
