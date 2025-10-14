import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from 'fs'
import { join, dirname, extname } from 'path'
import { parse as parseYaml } from 'yaml'
import { globSync } from 'glob'
import { logger } from './logger.ts'
import { generateUtilityClassesCSS } from './utilityClassesGenerator.ts'

// Helper function to capitalize strings
const capitalize = (str: string) => str[0].toUpperCase() + str.slice(1)

// Helper function to convert snake_case to Title Case
const toTitleCase = (str: string) => str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

// Generate demo content without hardcoded group checks; allow YAML to override via preview_content
const generateDemoContent = (definition: any, className: string): string => {
  if (typeof definition?.preview_content === 'string') {
    return definition.preview_content
  }
  return 'Demo'
}

// Generate preview HTML for each option
const generatePreviewHtml = (definition: any, className: string, label: string, previewedWith: string[] = []): string => {
  const previewClasses = previewedWith.join(' ')
  const combinedClasses = `${className} ${previewClasses}`.trim()
  const demoContent = generateDemoContent(definition, className)
  
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
const generateStory = (namespace: string, groupKey: string, definition: any): string => {
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
          <div class="utility-links">
            <h4>Related Links:</h4>
            <ul>
              ${links.map((link: string) => `<li><a href="${link}" target="_blank" rel="noopener">${link}</a></li>`).join('')}
            </ul>
          </div>`
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


// Find all *.ui_styles.yml files in the project
const findUtilityStyleFiles = (rootDir: string): string[] => {
  try {
    // Search for all *.ui_styles.yml files recursively
    const pattern = join(rootDir, '**', '*.ui_styles.yml')
    const files = globSync(pattern)
    return files
  } catch (error) {
    logger.warn(`Error searching for *.ui_styles.yml files: ${error}`)
    return []
  }
}

// Merge multiple YAML configurations (kept for potential future use)
const mergeConfigurations = (configs: Record<string, any>[]): Record<string, any> => {
  const merged: Record<string, any> = {}
  
  configs.forEach((config, index) => {
    Object.entries(config)
      // Only include entries that look like utility definitions (must have options object)
      .filter(([, value]) => isUtilityDefinition(value))
      .forEach(([key, value]) => {
        // If key already exists, append index to make it unique
        const uniqueKey = merged[key] ? `${key}_${index}` : key
        merged[uniqueKey] = value
      })
  })
  
  return merged
}

// Determine if a config entry is a utility definition
const isUtilityDefinition = (value: any): boolean => {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.options === 'object' &&
    value.options !== null
  )
}

// Derive namespace from YAML file path
const deriveNamespaceFromPath = (rootDir: string, yamlPath: string): string => {
  const rel = yamlPath.startsWith(rootDir) ? yamlPath.slice(rootDir.length + 1) : yamlPath
  const parts = rel.split('/')
  // Prefer parent directory name as namespace; fallback to filename without extension(s)
  if (parts.length > 1) {
    return parts[parts.length - 2]
  }
  const base = parts[parts.length - 1]
  return base.replace(/\.ui_styles\.yml$/, '')
}

// Check if a parsed ui_styles config requests disabling generation
const isConfigDisabled = (config: Record<string, any>): boolean => {
  const tps = config?.thirdPartySettings || {}
  const sdcStorybook = tps?.sdcStorybook || {}
  const utilityClassesA = tps?.utilityClasses || {}
  const utilityClassesB = sdcStorybook?.utilityClasses || {}
  const disableA = tps?.disableUtilityClasses
  const disableB = sdcStorybook?.disableUtilityClasses
  // Also support top-level flags if provided
  const topLevel = config?.utilityClasses || {}
  return (
    config?.enabled === false ||
    utilityClassesA?.enabled === false ||
    utilityClassesB?.enabled === false ||
    topLevel?.enabled === false ||
    disableA === true ||
    disableB === true ||
    config?.disableUtilityClasses === true
  )
}

// Vite plugin for utility classes generation
export default (options: { yamlPath?: string; outputDir?: string } = {}) => ({
  name: 'vite-plugin-utility-classes',
  buildStart() {
    const rootDir = process.cwd()
    const outputDir = options.outputDir || join(rootDir, 'stories')
    
    // Find all *.ui_styles.yml files
    const yamlFiles = findUtilityStyleFiles(rootDir)
    
    if (yamlFiles.length === 0) {
      logger.warn(`No *.ui_styles.yml files found in project`)
      return
    }

    try {
      logger.info(`Found ${yamlFiles.length} utility style file(s): ${yamlFiles.join(', ')}`)

      // Clean legacy combined stories file if present
      const legacyStoriesPath = join(outputDir, 'utility-classes.stories.js')
      if (existsSync(legacyStoriesPath)) {
        try { unlinkSync(legacyStoriesPath) } catch {}
      }

      let numGenerated = 0
      let wroteCss = false

      yamlFiles.forEach(yamlPath => {
        if (!existsSync(yamlPath)) return
        const fileContent = readFileSync(yamlPath, 'utf8')
        const config = parseYaml(fileContent) as Record<string, any>

        // Respect disable flags in the config
        if (isConfigDisabled(config)) {
          logger.info(`Skipping utility classes generation for disabled file: ${yamlPath}`)
          // Also remove a previously generated file for this namespace, if exists
          const ns = deriveNamespaceFromPath(rootDir, yamlPath)
          const perFileStoriesPath = join(outputDir, `utility-classes.${ns}.stories.js`)
          try { if (existsSync(perFileStoriesPath)) unlinkSync(perFileStoriesPath) } catch {}
          return
        }

        // Extract only utility definition entries
        const utilities = Object.entries(config)
          .filter(([, value]) => isUtilityDefinition(value))

        if (utilities.length === 0) return

        const namespace = deriveNamespaceFromPath(rootDir, yamlPath)
        const stories = utilities
          .map(([groupKey, definition]) => generateStory(namespace, groupKey as string, definition))
          .filter(Boolean)
          .join('\n\n')

        const storiesContent = `// Auto-generated utility classes stories\n// Generated from ${yamlPath}\n\nexport default {\n  title: '${namespace}/Utility Classes',\n  parameters: {\n    docs: {\n      description: {\n        story: 'Utility classes documentation generated from ${yamlPath}'\n      }\n    }\n  }\n}\n\n${stories}`

        const storiesPath = join(outputDir, `utility-classes.${namespace}.stories.js`)
        writeFileSync(storiesPath, storiesContent, 'utf8')
        numGenerated += 1
        logger.info(`✅ Generated utility classes stories: ${storiesPath}`)

        if (!wroteCss) {
          const cssContent = generateUtilityClassesCSS()
          const cssPath = join(outputDir, 'utility-classes.css')
          writeFileSync(cssPath, cssContent, 'utf8')
          logger.info(`✅ Generated utility classes CSS: ${cssPath}`)
          wroteCss = true
        }
      })

      if (numGenerated === 0) {
        logger.warn(`No valid utility style configurations found`)
        // Cleanup shared CSS if present
        const cssPath = join(outputDir, 'utility-classes.css')
        try { if (existsSync(cssPath)) unlinkSync(cssPath) } catch {}
      } else {
        logger.info(`✅ Processed ${numGenerated} utility style file(s)`)
      }

    } catch (error) {
      logger.error(`❌ Failed to generate utility classes stories: ${error}`)
      throw error
    }
  },
})
