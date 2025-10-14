import { readFileSync } from 'fs'
import { join } from 'path'
import yaml from 'yaml'
import { capitalize } from './utils.ts'

export interface UtilityClassDefinition {
  category: string
  label: string
  description?: string
  links?: string[]
  options: Record<string, string>
  previewed_with?: string[]
  enabled?: boolean
}

export interface UtilityClassesConfig {
  [key: string]: UtilityClassDefinition
}

/**
 * Parses the utility classes YAML file and returns the configuration
 */
export function parseUtilityClassesYaml(filePath: string): UtilityClassesConfig {
  try {
    const fileContent = readFileSync(filePath, 'utf8')
    return yaml.parse(fileContent)
  } catch (error) {
    throw new Error(`Failed to parse utility classes YAML: ${error}`)
  }
}

/**
 * Generate demo content without hardcoded group checks; allow YAML to override via preview_content
 */
export function generateDemoContent(definition: any, className: string, label?: string): string {
  if (typeof definition?.preview_content === 'string') {
    return definition.preview_content
  }
  return label || 'Demo'
}

/**
 * Generate preview HTML for each option
 */
export function generatePreviewHtml(definition: any, className: string, label: string, previewedWith: string[] = []): string {
  const previewClasses = previewedWith.join(' ')
  const combinedClasses = `${className} ${previewClasses}`.trim()
  const demoContent = generateDemoContent(definition, className, label)
  
  return `
    <div class="utility-item">
      <div class="utility-label">
        <code>${className}</code>
      </div>
      <div class="utility-preview">
        <div class="${combinedClasses}">
          ${demoContent}
        </div>
      </div>
    </div>`
}

/**
 * Generates a story template for a utility class group (generic version)
 */
export function generateStory(namespace: string, groupKey: string, definition: any): string {
  const { category, label, description, options, previewed_with = [], links = [] } = definition
  
  // Skip disabled utility classes
  if (definition.enabled === false) {
    return ''
  }

  const storyKey = groupKey

  // Generate all option previews
  const optionPreviews = Object.entries(options)
    .map(([className, optionLabel]) => generatePreviewHtml(definition, className as string, optionLabel as string, previewed_with))
    .join('\n')

  // Generate links section if available
  const linksSection = links.length > 0 
    ? `
          <h4>Related Links:</h4>
          <ul>
            ${links.map((link: string) => `<li><a href="${link}" target="_blank" rel="noopener">${link}</a></li>`).join('')}
          </ul>`
    : ''

  return `
export const ${storyKey} = {
  title: '${namespace}/Utility Classes/${category}/${label}',
  parameters: {
    docs: {
      description: {
        story: \`${description || `Utility classes for ${label.toLowerCase()}`}\`
      }
    }
  },
  render: () => {
    return \`
      <div class="utility-demo">
        <h2>${label}</h2>
        ${description ? `<p>${description}</p>` : ''}
        ${linksSection}
        <div class="utility-grid">
          ${optionPreviews}
        </div>
      </div>
    \`
  },
  play: async ({ canvasElement }) => {
    Drupal.attachBehaviors(canvasElement, window.drupalSettings)
  },
}`
}

/**
 * Generates a story template for a utility class group (legacy version for backward compatibility)
 */
export function generateUtilityClassStory(
  groupKey: string,
  definition: UtilityClassDefinition
): string {
  return generateStory('Utility Classes', groupKey, definition)
}

/**
 * Generates the complete stories file content for utility classes (legacy function)
 */
export function generateUtilityClassesStories(config: UtilityClassesConfig): string {
  const stories = Object.entries(config)
    .map(([groupKey, definition]) => generateUtilityClassStory(groupKey, definition))
    .filter(Boolean) // Remove empty strings from disabled utilities
    .join('\n\n')

  return `// Auto-generated utility classes stories
// Generated from *.ui_styles.yml files

${stories}

// Default export for the story file
export default {
  title: 'Utility Classes',
  parameters: {
    docs: {
      description: {
        story: 'Utility classes documentation generated from YAML configuration'
      }
    }
  }
}`
}

/**
 * Generate base story structure (common to both autodocs and individual stories)
 */
export function generateBaseStoryStructure(comment: string, additionalContent: string, yamlPath: string, namespace: string): string {
  return [
    comment,
    `// Generated from ${yamlPath}`,
    '',
    'export default {',
    `  title: '${namespace}/Utility Classes',`,
    '  parameters: {',
    '    docs: {',
    '      description: {',
    `        story: 'Utility classes documentation generated from ${yamlPath}'`,
    '      }',
    '    }',
    '  }',
    '}',
    '',
    additionalContent,
  ].join('\n')
}

/**
 * Generate autodocs content for all utilities
 */
export function generateAutodocsContent(utilities: [string, any][]): string {
  const allUtilityPreviews = utilities
    .map(([groupKey, definition]) => {
      const { category, label, description, options, previewed_with = [], links = [] } = definition
      
      if (definition.enabled === false) return ''

      const optionPreviews = Object.entries(options)
        .map(([className, optionLabel]) => generatePreviewHtml(definition, className as string, optionLabel as string, previewed_with))
        .join('\n')

      const linksSection = links.length > 0 
        ? `
          <h4>Related Links:</h4>
          <ul>
            ${links.map((link: string) => `<li><a href="${link}" target="_blank" rel="noopener">${link}</a></li>`).join('')}
          </ul>`
        : ''

      return `
        <div class="utility-demo">
          <h2>${label}</h2>
          ${description ? `<p>${description}</p>` : ''}
          ${linksSection}
          <div class="utility-grid">
            ${optionPreviews}
          </div>
        </div>`
    })
    .filter(Boolean)
    .join('\n\n')

  return [
    'export const Docs = {',
    `  tags: ['autodocs'],`,
    '  render: () => {',
    '    return `',
    allUtilityPreviews,
    '    `',
    '  }',
    '}',
  ].join('\n')
}

/**
 * Generate individual stories content
 */
export function generateIndividualStoriesContent(utilities: [string, any][], namespace: string): string {
  return utilities
    .map(([groupKey, definition]) => generateStory(namespace, groupKey as string, definition))
    .filter(Boolean)
    .join('\n\n')
}

/**
 * Generates CSS styles for the utility classes demo
 */
export function generateUtilityClassesCSS(): string {
  return `
/* Utility Classes Demo Styles - Using Storybook-compatible classes */
.utility-demo {
  /* Use Storybook's docs container styling */
  padding: 1rem;
}

.utility-demo h2 {
  margin: 0 0 1rem 0;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
  padding-bottom: 0.5rem;
}

.utility-demo p {
  margin: 0 0 1rem 0;
  color: var(--color-text-secondary, #6b7280);
  font-size: 0.875rem;
}

.utility-demo h4 {
  margin: 1rem 0 0.5rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text, #374151);
}

.utility-demo ul {
  margin: 0;
  padding-left: 1.5rem;
}

.utility-demo li {
  margin-bottom: 0.25rem;
}

.utility-demo a {
  color: var(--color-primary, #3b82f6);
  text-decoration: none;
  font-size: 0.875rem;
}

.utility-demo a:hover {
  text-decoration: underline;
}

/* Use CSS Grid with CSS custom properties for better Storybook integration */
.utility-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.utility-item {
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.5rem;
  padding: 1rem;
  background: var(--color-background, #ffffff);
}

.utility-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border-subtle, #f3f4f6);
}

.utility-label code {
  background: var(--color-background-subtle, #f3f4f6);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-family: var(--font-family-mono, 'Monaco', 'Menlo', 'Ubuntu Mono', monospace);
  font-size: 0.75rem;
  color: var(--color-error, #dc2626);
  font-weight: 600;
}


.utility-preview {
  min-height: 2rem;
  display: flex;
  align-items: center;
  padding: 0.5rem;
  background: var(--color-background-subtle, #f9fafb);
  border-radius: 0.25rem;
}
`
}

/**
 * Main function to generate utility classes stories from YAML file
 */
export function generateUtilityClassesFromYaml(yamlFilePath: string, outputDir: string): void {
  try {
    // Parse the YAML configuration
    const config = parseUtilityClassesYaml(yamlFilePath)
    
    // Generate the stories content
    const storiesContent = generateUtilityClassesStories(config)
    
    // Generate CSS content
    const cssContent = generateUtilityClassesCSS()
    
    // Write the stories file
    const storiesPath = join(outputDir, 'utility-classes.stories.js')
    require('fs').writeFileSync(storiesPath, storiesContent, 'utf8')
    
    // Write the CSS file
    const cssPath = join(outputDir, 'utility-classes.css')
    require('fs').writeFileSync(cssPath, cssContent, 'utf8')
    
    console.log(`✅ Generated utility classes stories: ${storiesPath}`)
    console.log(`✅ Generated utility classes CSS: ${cssPath}`)
    
  } catch (error) {
    console.error('❌ Error generating utility classes stories:', error)
    throw error
  }
}
