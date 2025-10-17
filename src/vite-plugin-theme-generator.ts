import type { Plugin } from 'vite'
import { generateThemes } from './dataThemesGenerator.ts'
import { logger } from './logger.ts'

export interface ThemeGeneratorOptions {
  /**
   * Whether to generate themes on build start
   * @default true
   */
  generateOnStart?: boolean
  
  /**
   * Whether to watch theme files for changes
   * @default true
   */
  watch?: boolean
}

/**
 * Vite plugin for automatic theme generation from *.ui_skins.themes.yml files
 */
export default function vitePluginThemeGenerator(options: ThemeGeneratorOptions = {}): Plugin {
  const {
    generateOnStart = true,
    watch = true
  } = options

  let hasGenerated = false

  return {
    name: 'vite-plugin-theme-generator',
    
    async buildStart() {
      if (generateOnStart && !hasGenerated) {
        try {
          await generateThemes()
          hasGenerated = true
        } catch (error) {
          logger.warn('Failed to generate themes on build start:', error)
        }
      }
    },

    async load(id: string) {
      // Generate themes when loading any component.yml file
      if (id.endsWith('component.yml') && !hasGenerated) {
        try {
          await generateThemes()
          hasGenerated = true
        } catch (error) {
          logger.warn('Failed to generate themes:', error)
        }
      }
    },

    async handleHotUpdate({ file }) {
      // Regenerate themes when theme files change
      if (watch && file.endsWith('.ui_skins.themes.yml')) {
        try {
          await generateThemes()
          logger.info('🎨 Themes regenerated due to file change:', file)
        } catch (error) {
          logger.warn('Failed to regenerate themes:', error)
        }
      }
    }
  }
}
