// twig.js reads `allowInlineIncludes`; @types/twig does not declare it.
import 'twig'

declare module 'twig' {
  interface Parameters {
    allowInlineIncludes?: boolean
  }
}
