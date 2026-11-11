// Storybook indexer: lists a *.component.yml's stories without building it.
import type { Indexer, IndexInput } from 'storybook/internal/types'
import { logger } from '../logger.ts'
import { capitalize, deriveGroupFromPath } from '../utils.ts'
import { getProjectName } from '../generate/namespaces.ts'
import { loadStoryFilesSync, readSDC } from '../generate/componentFiles.ts'
import type { StoryDefinition } from '../sdc.d.ts'

const createStoryIndex = (
  fileName: string,
  baseTitle: string,
  stories: Record<string, StoryDefinition>,
  disabledStories: string[],
  tags: string[]
): IndexInput[] => {
  const storiesIndex: IndexInput[] = []
  const isAllDisabled = disabledStories.includes('all')

  if (!isAllDisabled && !disabledStories.includes('basic')) {
    storiesIndex.push({
      type: 'story',
      importPath: fileName,
      exportName: 'Basic',
      title: baseTitle,
      tags,
    })
  }

  if (!isAllDisabled) {
    Object.keys(stories).forEach((storyKey) => {
      if (!disabledStories.includes(storyKey)) {
        const capitalizedKey = capitalize(storyKey)
        const exportName =
          capitalizedKey === 'Basic'
            ? `Variant_${capitalizedKey}`
            : capitalizedKey

        storiesIndex.push({
          type: 'story',
          importPath: fileName,
          exportName,
          title: baseTitle,
          tags,
        })
      }
    })
  }

  return storiesIndex
}

export const yamlStoriesIndexer: Indexer = {
  test: /component\.yml$/,
  createIndex: async (fileName, { makeTitle }) => {
    try {
      const content = await readSDC(fileName)

      const group = content.group || deriveGroupFromPath(fileName)

      const baseTitle = makeTitle(
        `${getProjectName(fileName)}/${capitalize(group)}/${content.name}`
      )

      const settings = content.thirdPartySettings?.sdcStorybook
      const mergedStories: Record<string, StoryDefinition> = {
        ...settings?.stories,
        ...loadStoryFilesSync(fileName),
      }
      const tags = [
        ...(settings?.tags ?? []),
        ...(content.noUi === true ? ['no-ui'] : []),
      ]

      const disabledStories = settings?.disabledStories ?? []

      return createStoryIndex(
        fileName,
        baseTitle,
        mergedStories,
        disabledStories,
        tags
      )
    } catch (error) {
      logger.error(
        `Error creating index for YAML file: ${fileName}, ${String(error)}`
      )
      throw error
    }
  },
}
