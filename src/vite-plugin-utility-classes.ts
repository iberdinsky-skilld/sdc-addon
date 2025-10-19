import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from 'fs'
import { join, dirname, extname } from 'path'
import { parse as parseYaml } from 'yaml'
import { globSync } from 'glob'
import { logger } from './logger.ts'
import { 
  generateUtilityClassesCSS, 
  generateStory, 
  generatePreviewHtml,
  generateBaseStoryStructure,
  generateAutodocsContent,
  generateIndividualStoriesContent
} from './utilityClassesGenerator.ts'

// Helper function to capitalize strings
const capitalize = (str: string) => str[0].toUpperCase() + str.slice(1)

// Helper function to convert snake_case to Title Case
const toTitleCase = (str: string) => str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

// All story generation logic is now imported from utilityClassesGenerator.ts


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

      // Process each YAML file individually (no merging)
      yamlFiles.forEach(yamlPath => {
        if (!existsSync(yamlPath)) return
        
        const fileContent = readFileSync(yamlPath, 'utf8')
        const config = parseYaml(fileContent) as Record<string, any>

        // Respect disable flags in the config
        if (isConfigDisabled(config)) {
          logger.info(`Skipping utility classes generation for disabled file: ${yamlPath}`)
          // Remove previously generated file for this namespace, if exists
          const ns = deriveNamespaceFromPath(rootDir, yamlPath)
          const perFileStoriesPath = join(outputDir, `utility-classes.${ns}.stories.js`)
          try { if (existsSync(perFileStoriesPath)) unlinkSync(perFileStoriesPath) } catch {}
          return
        }

        // Extract only utility definition entries from this file
        const utilities = Object.entries(config)
          .filter(([, value]) => isUtilityDefinition(value))

        if (utilities.length === 0) {
          logger.info(`No utility definitions found in ${yamlPath}`)
          return
        }

        const namespace = deriveNamespaceFromPath(rootDir, yamlPath)

        // Global autodocs tags from thirdPartySettings per YAML file
        const tps = (config as any)?.thirdPartySettings || {}
        const sdcStorybook = tps?.sdcStorybook || {}
        const globalTags: string[] = Array.isArray(sdcStorybook?.tags) ? sdcStorybook.tags : []
        const hasAutodocs = globalTags.includes('autodocs')

        let storiesContent: string

        if (hasAutodocs) {
          // Generate simple docs definition without individual stories
          const docsContent = generateAutodocsContent(utilities)
          storiesContent = generateBaseStoryStructure(
            '// Auto-generated utility classes documentation', 
            docsContent, 
            yamlPath, 
            namespace
          )
        } else {
          // Generate individual stories (original behavior)
          const stories = generateIndividualStoriesContent(utilities, namespace)
          storiesContent = generateBaseStoryStructure(
            '// Auto-generated utility classes stories', 
            stories, 
            yamlPath, 
            namespace
          )
        }

        const storiesPath = join(outputDir, `utility-classes.${namespace}.stories.js`)
        writeFileSync(storiesPath, storiesContent, 'utf8')
        numGenerated += 1
        logger.info(`✅ Generated utility classes stories: ${storiesPath}`)

        // Generate CSS only once (shared across all namespaces)
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
        logger.info(`✅ Processed ${numGenerated} utility style file(s) individually`)
      }

    } catch (error) {
      logger.error(`❌ Failed to generate utility classes stories: ${error}`)
      throw error
    }
  },
})
