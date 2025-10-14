// Auto-generated utility classes stories
// Generated from /Users/fred/Local/sdc-addon/sdc-addon.ui_styles.yml

export default {
  title: 'sdc-addon/Utility Classes',
  parameters: {
    docs: {
      description: {
        story: 'Utility classes documentation generated from /Users/fred/Local/sdc-addon/sdc-addon.ui_styles.yml'
      }
    }
  }
}


export const rounded = {
  title: 'sdc-addon/Utility Classes/Rounded/Rounded',
  parameters: {
    docs: {
      description: {
        story: `Utility classes for rounded`
      }
    }
  },
  render: () => {
    return `
      <div class="utility-classes-demo">
        <div class="utility-classes-header">
          <h2>Rounded</h2>
          
          
        </div>
        <div class="utility-classes-grid">
          
          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>rounded-sm</code>
              <span class="utility-preview-description">sm</span>
            </div>
            <div class="utility-preview-demo">
              <div class="rounded-sm inline-flex items-center justify-center text-center w-[200px] h-[200px] bg-secondary text-white m-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>rounded</code>
              <span class="utility-preview-description">default</span>
            </div>
            <div class="utility-preview-demo">
              <div class="rounded inline-flex items-center justify-center text-center w-[200px] h-[200px] bg-secondary text-white m-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>rounded-md</code>
              <span class="utility-preview-description">md</span>
            </div>
            <div class="utility-preview-demo">
              <div class="rounded-md inline-flex items-center justify-center text-center w-[200px] h-[200px] bg-secondary text-white m-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>rounded-lg</code>
              <span class="utility-preview-description">lg</span>
            </div>
            <div class="utility-preview-demo">
              <div class="rounded-lg inline-flex items-center justify-center text-center w-[200px] h-[200px] bg-secondary text-white m-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>rounded-xl</code>
              <span class="utility-preview-description">xl</span>
            </div>
            <div class="utility-preview-demo">
              <div class="rounded-xl inline-flex items-center justify-center text-center w-[200px] h-[200px] bg-secondary text-white m-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>rounded-2xl</code>
              <span class="utility-preview-description">2xl</span>
            </div>
            <div class="utility-preview-demo">
              <div class="rounded-2xl inline-flex items-center justify-center text-center w-[200px] h-[200px] bg-secondary text-white m-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>rounded-3xl</code>
              <span class="utility-preview-description">3xl</span>
            </div>
            <div class="utility-preview-demo">
              <div class="rounded-3xl inline-flex items-center justify-center text-center w-[200px] h-[200px] bg-secondary text-white m-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>rounded-none</code>
              <span class="utility-preview-description">none</span>
            </div>
            <div class="utility-preview-demo">
              <div class="rounded-none inline-flex items-center justify-center text-center w-[200px] h-[200px] bg-secondary text-white m-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>rounded-tr-3xl rounded-bl-3xl</code>
              <span class="utility-preview-description">theme</span>
            </div>
            <div class="utility-preview-demo">
              <div class="rounded-tr-3xl rounded-bl-3xl inline-flex items-center justify-center text-center w-[200px] h-[200px] bg-secondary text-white m-4">
                Demo
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  },
  play: async ({ canvasElement }) => {
    Drupal.attachBehaviors(canvasElement, window.drupalSettings)
  },
}


export const margin_top = {
  title: 'sdc-addon/Utility Classes/Spacing/Margin top',
  parameters: {
    docs: {
      description: {
        story: `Utility classes for margin top`
      }
    }
  },
  render: () => {
    return `
      <div class="utility-classes-demo">
        <div class="utility-classes-header">
          <h2>Margin top</h2>
          
          
        </div>
        <div class="utility-classes-grid">
          
          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>mt-xs</code>
              <span class="utility-preview-description">xs</span>
            </div>
            <div class="utility-preview-demo">
              <div class="mt-xs bg-neutral-content">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>mt-xs md:mt-sm</code>
              <span class="utility-preview-description">sm</span>
            </div>
            <div class="utility-preview-demo">
              <div class="mt-xs md:mt-sm bg-neutral-content">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>mt-xs md:mt-md</code>
              <span class="utility-preview-description">md</span>
            </div>
            <div class="utility-preview-demo">
              <div class="mt-xs md:mt-md bg-neutral-content">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>mt-xs md:mt-md lg:mt-lg</code>
              <span class="utility-preview-description">lg</span>
            </div>
            <div class="utility-preview-demo">
              <div class="mt-xs md:mt-md lg:mt-lg bg-neutral-content">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>mt-xs md:mt-md lg:mt-xl</code>
              <span class="utility-preview-description">xl</span>
            </div>
            <div class="utility-preview-demo">
              <div class="mt-xs md:mt-md lg:mt-xl bg-neutral-content">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>mt-xs md:mt-md lg:mt-2xl</code>
              <span class="utility-preview-description">2xl</span>
            </div>
            <div class="utility-preview-demo">
              <div class="mt-xs md:mt-md lg:mt-2xl bg-neutral-content">
                Demo
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  },
  play: async ({ canvasElement }) => {
    Drupal.attachBehaviors(canvasElement, window.drupalSettings)
  },
}


export const margin_bottom = {
  title: 'sdc-addon/Utility Classes/Spacing/Margin bottom',
  parameters: {
    docs: {
      description: {
        story: `Utility classes for margin bottom`
      }
    }
  },
  render: () => {
    return `
      <div class="utility-classes-demo">
        <div class="utility-classes-header">
          <h2>Margin bottom</h2>
          
          
        </div>
        <div class="utility-classes-grid">
          
          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>mb-xs</code>
              <span class="utility-preview-description">xs</span>
            </div>
            <div class="utility-preview-demo">
              <div class="mb-xs bg-neutral-content">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>mb-xs md:mb-sm</code>
              <span class="utility-preview-description">sm</span>
            </div>
            <div class="utility-preview-demo">
              <div class="mb-xs md:mb-sm bg-neutral-content">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>mb-xs md:mb-md</code>
              <span class="utility-preview-description">md</span>
            </div>
            <div class="utility-preview-demo">
              <div class="mb-xs md:mb-md bg-neutral-content">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>mb-xs md:mb-md lg:mb-lg</code>
              <span class="utility-preview-description">lg</span>
            </div>
            <div class="utility-preview-demo">
              <div class="mb-xs md:mb-md lg:mb-lg bg-neutral-content">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>mb-xs md:mb-md lg:mb-xl</code>
              <span class="utility-preview-description">xl</span>
            </div>
            <div class="utility-preview-demo">
              <div class="mb-xs md:mb-md lg:mb-xl bg-neutral-content">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>mb-xs md:mb-md lg:mb-2xl</code>
              <span class="utility-preview-description">2xl</span>
            </div>
            <div class="utility-preview-demo">
              <div class="mb-xs md:mb-md lg:mb-2xl bg-neutral-content">
                Demo
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  },
  play: async ({ canvasElement }) => {
    Drupal.attachBehaviors(canvasElement, window.drupalSettings)
  },
}


export const gap = {
  title: 'sdc-addon/Utility Classes/Spacing/Gap',
  parameters: {
    docs: {
      description: {
        story: `Utility classes for gap`
      }
    }
  },
  render: () => {
    return `
      <div class="utility-classes-demo">
        <div class="utility-classes-header">
          <h2>Gap</h2>
          
          
        </div>
        <div class="utility-classes-grid">
          
          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>gap-between-xs</code>
              <span class="utility-preview-description">xs</span>
            </div>
            <div class="utility-preview-demo">
              <div class="gap-between-xs bg-neutral-content">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>gap-between-xs md:gap-between-sm</code>
              <span class="utility-preview-description">sm</span>
            </div>
            <div class="utility-preview-demo">
              <div class="gap-between-xs md:gap-between-sm bg-neutral-content">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>gap-between-xs md:gap-between-md</code>
              <span class="utility-preview-description">md</span>
            </div>
            <div class="utility-preview-demo">
              <div class="gap-between-xs md:gap-between-md bg-neutral-content">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>gap-between-xs md:gap-between-md gap-between-lg</code>
              <span class="utility-preview-description">lg</span>
            </div>
            <div class="utility-preview-demo">
              <div class="gap-between-xs md:gap-between-md gap-between-lg bg-neutral-content">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>gap-between-xs md:gap-between-md gap-between-xl</code>
              <span class="utility-preview-description">xl</span>
            </div>
            <div class="utility-preview-demo">
              <div class="gap-between-xs md:gap-between-md gap-between-xl bg-neutral-content">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>gap-between-xs md:gap-between-md lg:gap-between-2xl</code>
              <span class="utility-preview-description">2xl</span>
            </div>
            <div class="utility-preview-demo">
              <div class="gap-between-xs md:gap-between-md lg:gap-between-2xl bg-neutral-content">
                Demo
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  },
  play: async ({ canvasElement }) => {
    Drupal.attachBehaviors(canvasElement, window.drupalSettings)
  },
}


export const border_width = {
  title: 'sdc-addon/Utility Classes/Borders/Border width',
  parameters: {
    docs: {
      description: {
        story: `Utility classes for border width`
      }
    }
  },
  render: () => {
    return `
      <div class="utility-classes-demo">
        <div class="utility-classes-header">
          <h2>Border width</h2>
          
          
        </div>
        <div class="utility-classes-grid">
          
          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>border-0</code>
              <span class="utility-preview-description">none</span>
            </div>
            <div class="utility-preview-demo">
              <div class="border-0">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>border</code>
              <span class="utility-preview-description">1px</span>
            </div>
            <div class="utility-preview-demo">
              <div class="border">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>border-2</code>
              <span class="utility-preview-description">2px</span>
            </div>
            <div class="utility-preview-demo">
              <div class="border-2">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>border-4</code>
              <span class="utility-preview-description">4px</span>
            </div>
            <div class="utility-preview-demo">
              <div class="border-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>border-8</code>
              <span class="utility-preview-description">8px</span>
            </div>
            <div class="utility-preview-demo">
              <div class="border-8">
                Demo
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  },
  play: async ({ canvasElement }) => {
    Drupal.attachBehaviors(canvasElement, window.drupalSettings)
  },
}


export const border_style = {
  title: 'sdc-addon/Utility Classes/Borders/Border style',
  parameters: {
    docs: {
      description: {
        story: `Utility classes for border style`
      }
    }
  },
  render: () => {
    return `
      <div class="utility-classes-demo">
        <div class="utility-classes-header">
          <h2>Border style</h2>
          
          
        </div>
        <div class="utility-classes-grid">
          
          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>border-solid</code>
              <span class="utility-preview-description">solid</span>
            </div>
            <div class="utility-preview-demo">
              <div class="border-solid border border-2">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>border-dashed</code>
              <span class="utility-preview-description">dashed</span>
            </div>
            <div class="utility-preview-demo">
              <div class="border-dashed border border-2">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>border-dotted</code>
              <span class="utility-preview-description">dotted</span>
            </div>
            <div class="utility-preview-demo">
              <div class="border-dotted border border-2">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>border-double</code>
              <span class="utility-preview-description">double</span>
            </div>
            <div class="utility-preview-demo">
              <div class="border-double border border-2">
                Demo
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  },
  play: async ({ canvasElement }) => {
    Drupal.attachBehaviors(canvasElement, window.drupalSettings)
  },
}