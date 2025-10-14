# Utility Classes Storybook Generator

This module automatically generates Storybook documentation for utility classes defined in any `*.ui_styles.yml` file.

## Overview

The utility classes generator creates interactive Storybook stories that showcase all utility classes defined in your YAML configuration. Each utility class group gets its own story with live previews of all available options.

## Features

- **Automatic Discovery**: Finds all `*.ui_styles.yml` files in your project automatically
- **Multi-file Support**: Merges utility classes from multiple YAML files
- **Automatic Story Generation**: Parses YAML configuration and generates complete Storybook stories
- **Interactive Previews**: Each utility class option is displayed with live previews
- **Organized Categories**: Stories are organized by category and label from the YAML
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
2. Parse and merge all utility class configurations
3. Generate `stories/utility-classes.stories.js` with all utility class stories
4. Generate `stories/utility-classes.css` with demo styling
5. Automatically include the stories in your Storybook

### Manual Generation (Optional)

If you need to manually regenerate the stories:

```bash
npm run generate:utility-stories
```

### YAML Structure

The generator expects a YAML file with the following structure:

```yaml
utility_group_name:
  category: "Category Name"
  label: "Display Label"
  description: "Optional description"
  links:
    - "https://example.com/docs"
  options:
    class-name: "Display Name"
    another-class: "Another Display Name"
  previewed_with:
    - "additional-class-1"
    - "additional-class-2"
  enabled: true  # Optional, defaults to true
```

### Example YAML Entry

```yaml
font_size_dt:
  category: "Typography DT"
  label: "Font size"
  description: "We use specifics size classes (with custom tokens) for a responsive typography display"
  options:
    title-2xl: Title 2XL
    title-xl: Title XL
    title-lg: Title LG
  previewed_with:
    - mb-4
```

## Generated Stories Structure

Each utility class group becomes a Storybook story with:

- **Title**: `Utility Classes/{category}/{label}`
- **Description**: From the YAML `description` field
- **Interactive Previews**: Each option with live demo
- **Related Links**: External documentation links
- **Responsive Layout**: Grid layout that adapts to screen size

## Demo Content

The generator automatically creates appropriate demo content based on the utility type:

- **Typography**: Sample text for font size, family, etc.
- **Spacing**: Content with spacing demonstrations
- **Borders**: Border width and style examples
- **Rounded**: Rounded corner demonstrations
- **Line Clamp**: Long text for truncation examples
- **Cover Links**: Interactive link examples

## Customization

### Adding New Utility Types

To add support for new utility class types, modify the `generateDemoContent` function in `scripts/generate-utility-stories.mjs`:

```javascript
const generateDemoContent = (groupKey, className) => {
  if (groupKey.includes('your_new_type')) {
    return 'Your custom demo content'
  }
  // ... existing conditions
}
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
├── scripts/
│   └── generate-utility-stories.mjs    # Main generator script
├── src/
│   └── utilityClassesGenerator.ts      # TypeScript generator module
├── stories/
│   ├── utility-classes.stories.js      # Generated stories
│   └── utility-classes.css             # Generated demo styles
├── unami.ui_styles.yml # Source YAML configuration
├── theme.ui_styles.yml # Additional YAML configuration (optional)
└── any-name.ui_styles.yml # Any file with *.ui_styles.yml extension
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

### Script Options

The generator script supports:

- **YAML File Path**: Configurable source file location
- **Output Directory**: Configurable output location
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
2. Modify the generation logic in `generate-utility-stories.mjs`
3. Update this documentation
4. Test with various YAML configurations

## License

This utility classes generator is part of the storybook-addon-sdc project and follows the same MIT license.
