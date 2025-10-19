# Utility Classes Storybook Generator

This module automatically generates Storybook documentation for utility classes defined in any `*.ui_styles.yml` file.

## Overview

The utility classes generator creates interactive Storybook stories that showcase all utility classes defined in your YAML configuration. Each utility class group gets its own story with live previews of all available options.

## Features

- **Automatic Discovery**: Finds all `*.ui_styles.yml` files in your project automatically
- **Individual File Processing**: Each YAML file generates its own namespace-specific stories
- **Automatic Story Generation**: Parses YAML configuration and generates complete Storybook stories
- **Interactive Previews**: Each utility class option is displayed with live previews
- **Organized Categories**: Stories are organized by namespace, category and label from the YAML
- **Responsive Design**: Demo layouts adapt to different screen sizes
- **Documentation Links**: Includes related links when specified in the YAML
- **Disabled Class Support**: Automatically skips utility classes marked as `enabled: false`

## Usage

### Automatic Generation

The utility classes stories are **automatically generated** during Storybook build and development. No manual intervention is required!

When you run:
- `npm run storybook` (development server)
- `npm run build-storybook` (production build)

The system will:
1. Automatically find all `*.ui_styles.yml` files in your project
2. Process each file individually and generate namespace-specific stories
3. Generate `stories/utility-classes.{namespace}.stories.js` for each YAML file
4. Generate `stories/utility-classes.css` with shared demo styling
5. Automatically include the stories in your Storybook

### Manual Generation (Optional)

Manual generation is no longer needed as the system automatically generates stories during Storybook build. The generation is handled by the Vite plugin integrated into the Storybook preset.

### YAML Structure

The generator expects a YAML file with the ui_styles module pattern
https://www.drupal.org/project/ui_styles

## Generated Stories Structure

Each utility class group becomes a Storybook story with:

- **Title**: `{namespace}/Utility Classes/{category}/{label}`
- **Description**: From the YAML `description` field
- **Interactive Previews**: Each option with live demo
- **Related Links**: External documentation links
- **Responsive Layout**: Grid layout that adapts to screen size

The namespace is derived from the YAML file location (parent directory name or filename without extension).

## Demo Content

The generator creates demo content based on the YAML configuration:

- **Custom Content**: If `preview_content` is specified in the YAML definition, it will be used
- **Generic Fallback**: If no custom content is provided, a generic "Demo" text is displayed
- **Data-driven**: No hardcoded utility type detection - all content comes from the YAML configuration

## Customization

### Adding Custom Demo Content

To add custom demo content for specific utility classes, add a `preview_content` field to your YAML definition:

```yaml
font_size:
  category: typography
  label: Font Size
  description: Control text size
  preview_content: "Sample text to demonstrate font size changes"
  options:
    text-sm: Small text
    text-lg: Large text
```

### Styling

The generated CSS in `stories/utility-classes.css` can be customized to match your design system. Key classes:

- `.utility-classes-demo` - Main container
- `.utility-classes-grid` - Grid layout for options
- `.utility-preview-item` - Individual option container
- `.utility-preview-demo` - Demo area for each option

## Integration with Storybook

The generated stories integrate seamlessly with your existing Storybook setup:

1. Stories follow the same structure as your component stories
2. Include Drupal behavior attachment for compatibility
3. Use the same documentation format
4. Support Storybook's docs addon

## File Structure

```
├── src/
│   ├── utilityClassesGenerator.ts      # TypeScript generator module
│   └── vite-plugin-utility-classes.ts  # Vite plugin for automatic generation
├── stories/
│   ├── utility-classes.{namespace}.stories.js  # Generated stories per namespace
│   └── utility-classes.css             # Generated demo styles (shared)
├── unami.ui_styles.yml                 # Source YAML configuration
├── theme.ui_styles.yml                 # Additional YAML configuration (optional)
└── any-name.ui_styles.yml              # Any file with *.ui_styles.yml extension
```

## Development

### TypeScript Module

The `src/utilityClassesGenerator.ts` module provides a TypeScript interface for programmatic generation:

```typescript
import { generateUtilityClassesFromYaml } from './utilityClassesGenerator'

generateUtilityClassesFromYaml(
  'path/to/yaml/file.yml',
  'path/to/output/directory'
)
```

### Vite Plugin Options

The Vite plugin supports:

- **Automatic Discovery**: Finds all `*.ui_styles.yml` files automatically
- **Namespace Derivation**: Creates separate stories per YAML file
- **Error Handling**: Graceful error reporting
- **Progress Logging**: Detailed generation progress

## Troubleshooting

### Common Issues

1. **YAML Parse Errors**: Ensure your YAML syntax is valid
2. **Missing Dependencies**: Run `npm install` to ensure all dependencies are available
3. **File Permissions**: Ensure write permissions for the output directory

### Debug Mode

For debugging, you can modify the script to add console logging:

```javascript
console.log('Parsed config:', config)
console.log('Generated stories:', stories)
```

## Contributing

When adding new features to the utility classes generator:

1. Update the TypeScript interfaces in `utilityClassesGenerator.ts`
2. Modify the generation logic in `vite-plugin-utility-classes.ts`
3. Update this documentation
4. Test with various YAML configurations

## License

This utility classes generator is part of the storybook-addon-sdc project and follows the same MIT license.
