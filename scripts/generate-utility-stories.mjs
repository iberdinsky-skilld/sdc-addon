#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { globSync } from 'glob'
import yaml from 'yaml'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Helper function to capitalize strings
const capitalize = (str) => str[0].toUpperCase() + str.slice(1)

// Helper function to convert snake_case to Title Case
const toTitleCase = (str) => str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

// Find all *.ui_styles.yml files
const findUtilityStyleFiles = (rootDir) => {
  try {
    const pattern = join(rootDir, '**', '*.ui_styles.yml')
    const files = globSync(pattern)
    return files
  } catch (error) {
    console.warn(`Error searching for *.ui_styles.yml files: ${error}`)
    return []
  }
}

// Merge multiple YAML configurations
const mergeConfigurations = (configs) => {
  const merged = {}
  
  configs.forEach((config, index) => {
    Object.entries(config).forEach(([key, value]) => {
      // If key already exists, append index to make it unique
      const uniqueKey = merged[key] ? `${key}_${index}` : key
      merged[uniqueKey] = value
    })
  })
  
  return merged
}

// Paths
const rootDir = join(__dirname, '..')
const yamlFiles = findUtilityStyleFiles(rootDir)
const outputDir = join(__dirname, '../stories')

console.log('🚀 Generating utility classes stories...')
console.log(`📁 Found ${yamlFiles.length} utility style file(s): ${yamlFiles.join(', ')}`)
console.log(`📁 Output directory: ${outputDir}`)

if (yamlFiles.length === 0) {
  console.warn('❌ No *.ui_styles.yml files found in project')
  process.exit(1)
}

try {
  // Read and parse all YAML files
  const configs = []
  const sourceFiles = []
  
  yamlFiles.forEach(yamlFilePath => {
    if (existsSync(yamlFilePath)) {
      const fileContent = readFileSync(yamlFilePath, 'utf8')
      const config = yaml.parse(fileContent)
      configs.push(config)
      sourceFiles.push(yamlFilePath)
      console.log(`📄 Parsed utility classes from: ${yamlFilePath}`)
    }
  })

  if (configs.length === 0) {
    console.warn('❌ No valid utility style configurations found')
    process.exit(1)
  }

  // Merge all configurations
  const config = mergeConfigurations(configs)

  // Generate demo content based on utility type
  const generateDemoContent = (groupKey, className) => {
    if (groupKey.includes('font_size') || groupKey.includes('typography')) {
      return 'Sample text to demonstrate typography'
    }
    if (groupKey.includes('margin') || groupKey.includes('padding')) {
      return 'Content with spacing'
    }
    if (groupKey.includes('border')) {
      return 'Border demo'
    }
    if (groupKey.includes('rounded')) {
      return 'Rounded corners'
    }
    if (groupKey.includes('line_clamp')) {
      return 'This is a long text that will be clamped to demonstrate the line clamp utility. It should show how the text gets truncated when it exceeds the specified number of lines.'
    }
    if (groupKey.includes('coverlink')) {
      return `<a href="#" class="${className}">Cover link demo</a>`
    }
    return 'Demo content'
  }

  // Generate preview HTML for each option
  const generatePreviewHtml = (groupKey, className, label, previewedWith = []) => {
    const previewClasses = previewedWith.join(' ')
    const combinedClasses = `${className} ${previewClasses}`.trim()
    const demoContent = generateDemoContent(groupKey, className)
    
    return `
          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>${className}</code>
              <span class="utility-preview-description">${label}</span>
            </div>
            <div class="utility-preview-demo">
              <div class="${combinedClasses}">
                ${demoContent}
              </div>
            </div>
          </div>`
  }

  // Generate story for a utility class group
  const generateStory = (groupKey, definition) => {
    const { category, label, description, options, previewed_with = [], links = [] } = definition
    
    // Skip disabled utility classes
    if (definition.enabled === false) {
      return ''
    }

    const storyKey = groupKey
    
    // Generate all option previews
    const optionPreviews = Object.entries(options)
      .map(([className, optionLabel]) => generatePreviewHtml(groupKey, className, optionLabel, previewed_with))
      .join('\n')

    // Generate links section if available
    const linksSection = links.length > 0 
      ? `
          <div class="utility-links">
            <h4>Related Links:</h4>
            <ul>
              ${links.map(link => `<li><a href="${link}" target="_blank" rel="noopener">${link}</a></li>`).join('')}
            </ul>
          </div>`
      : ''

    return `
export const ${storyKey} = {
  title: 'Utility Classes/${category}/${label}',
  parameters: {
    docs: {
      description: {
        story: \`${description || `Utility classes for ${label.toLowerCase()}`}\`
      }
    }
  },
  render: () => {
    return \`
      <div class="utility-classes-demo">
        <div class="utility-classes-header">
          <h2>${label}</h2>
          ${description ? `<p class="utility-classes-description">${description}</p>` : ''}
          ${linksSection}
        </div>
        <div class="utility-classes-grid">
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

  // Generate all stories
  const stories = Object.entries(config)
    .map(([groupKey, definition]) => generateStory(groupKey, definition))
    .filter(Boolean) // Remove empty strings from disabled utilities
    .join('\n\n')

      // Generate the complete stories file content
      const sourceFilesList = sourceFiles.map(file => `// Generated from ${file}`).join('\n')
      const storiesContent = `// Auto-generated utility classes stories
${sourceFilesList}

${stories}

// Default export for the story file
export default {
  title: 'Utility Classes',
  parameters: {
    docs: {
      description: {
        story: 'Utility classes documentation generated from YAML configuration files'
      }
    }
  }
}`

  // Generate CSS content
  const cssContent = `/* Utility Classes Demo Styles */
.utility-classes-demo {
  max-width: 100%;
  padding: 1rem;
}

.utility-classes-header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.utility-classes-header h2 {
  margin: 0 0 0.5rem 0;
  color: #1f2937;
}

.utility-classes-description {
  margin: 0 0 1rem 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.utility-links {
  margin-top: 1rem;
}

.utility-links h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.utility-links ul {
  margin: 0;
  padding-left: 1.5rem;
}

.utility-links li {
  margin-bottom: 0.25rem;
}

.utility-links a {
  color: #3b82f6;
  text-decoration: none;
  font-size: 0.875rem;
}

.utility-links a:hover {
  text-decoration: underline;
}

.utility-classes-grid {
  display: grid;
  gap: 1.5rem;
}

.utility-preview-item {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  background: #ffffff;
}

.utility-preview-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f3f4f6;
}

.utility-preview-label code {
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.75rem;
  color: #dc2626;
  font-weight: 600;
}

.utility-preview-description {
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
}

.utility-preview-demo {
  min-height: 2rem;
  display: flex;
  align-items: center;
  padding: 0.5rem;
  background: #f9fafb;
  border-radius: 0.25rem;
}

/* Specific utility class demo styles */
.utility-preview-demo .line-clamp-1,
.utility-preview-demo .line-clamp-2,
.utility-preview-demo .line-clamp-3,
.utility-preview-demo .line-clamp-4,
.utility-preview-demo .line-clamp-5 {
  max-width: 200px;
}

.utility-preview-demo .coverlink,
.utility-preview-demo .coverlink-over {
  position: relative;
  display: block;
  padding: 0.5rem;
  background: #3b82f6;
  color: white;
  text-decoration: none;
  border-radius: 0.25rem;
}

.utility-preview-demo .coverlink:hover,
.utility-preview-demo .coverlink-over:hover {
  background: #2563eb;
}

/* Responsive adjustments */
@media (min-width: 768px) {
  .utility-classes-grid {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
}`

  // Write the stories file
  const storiesPath = join(outputDir, 'utility-classes.stories.js')
  writeFileSync(storiesPath, storiesContent, 'utf8')
  
  // Write the CSS file
  const cssPath = join(outputDir, 'utility-classes.css')
  writeFileSync(cssPath, cssContent, 'utf8')
  
  console.log(`✅ Generated utility classes stories: ${storiesPath}`)
  console.log(`✅ Generated utility classes CSS: ${cssPath}`)
  console.log(`✅ Processed ${configs.length} utility style file(s)`)
  console.log('✅ Utility classes stories generated successfully!')
  
} catch (error) {
  console.error('❌ Failed to generate utility classes stories:', error.message)
  process.exit(1)
}
