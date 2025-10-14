// Auto-generated utility classes stories
// Generated from /Users/fred/Local/sdc-addon/parent-namespace/parent-namespace.ui_styles.yml

export default {
  title: 'parent-namespace/Utility Classes',
  parameters: {
    docs: {
      description: {
        story: 'Utility classes documentation generated from /Users/fred/Local/sdc-addon/parent-namespace/parent-namespace.ui_styles.yml'
      }
    }
  }
}


export const font_size = {
  title: 'parent-namespace/Utility Classes/Typography/Font size',
  parameters: {
    docs: {
      description: {
        story: `We use specifics size classes (with custom tokens) for a responsive typography display`
      }
    }
  },
  render: () => {
    return `
      <div class="utility-classes-demo">
        <div class="utility-classes-header">
          <h2>Font size</h2>
          <p class="utility-classes-description">We use specifics size classes (with custom tokens) for a responsive typography display</p>
          
        </div>
        <div class="utility-classes-grid">
          
          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>title-2xl</code>
              <span class="utility-preview-description">Title 2XL</span>
            </div>
            <div class="utility-preview-demo">
              <div class="title-2xl mb-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>title-xl</code>
              <span class="utility-preview-description">Title XL</span>
            </div>
            <div class="utility-preview-demo">
              <div class="title-xl mb-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>title-lg</code>
              <span class="utility-preview-description">Title LG</span>
            </div>
            <div class="utility-preview-demo">
              <div class="title-lg mb-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>title-md</code>
              <span class="utility-preview-description">Title MD</span>
            </div>
            <div class="utility-preview-demo">
              <div class="title-md mb-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>title-sm</code>
              <span class="utility-preview-description">Title SM</span>
            </div>
            <div class="utility-preview-demo">
              <div class="title-sm mb-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>title-xs</code>
              <span class="utility-preview-description">Title XS</span>
            </div>
            <div class="utility-preview-demo">
              <div class="title-xs mb-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>body-xl</code>
              <span class="utility-preview-description">Body XL</span>
            </div>
            <div class="utility-preview-demo">
              <div class="body-xl mb-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>body-lg</code>
              <span class="utility-preview-description">Body LG</span>
            </div>
            <div class="utility-preview-demo">
              <div class="body-lg mb-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>body-md</code>
              <span class="utility-preview-description">Body MD</span>
            </div>
            <div class="utility-preview-demo">
              <div class="body-md mb-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>body-sm</code>
              <span class="utility-preview-description">Body SM</span>
            </div>
            <div class="utility-preview-demo">
              <div class="body-sm mb-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>body-xs</code>
              <span class="utility-preview-description">Body XS</span>
            </div>
            <div class="utility-preview-demo">
              <div class="body-xs mb-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>label-xl</code>
              <span class="utility-preview-description">Label XL</span>
            </div>
            <div class="utility-preview-demo">
              <div class="label-xl mb-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>label-lg</code>
              <span class="utility-preview-description">Label LG</span>
            </div>
            <div class="utility-preview-demo">
              <div class="label-lg mb-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>label-md</code>
              <span class="utility-preview-description">Label MD</span>
            </div>
            <div class="utility-preview-demo">
              <div class="label-md mb-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>label-sm</code>
              <span class="utility-preview-description">Label SM</span>
            </div>
            <div class="utility-preview-demo">
              <div class="label-sm mb-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>label-xs</code>
              <span class="utility-preview-description">Label XS</span>
            </div>
            <div class="utility-preview-demo">
              <div class="label-xs mb-4">
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


export const line_clamp = {
  title: 'parent-namespace/Utility Classes/Utility/Line Clamp',
  parameters: {
    docs: {
      description: {
        story: `Utilities for clamping text to a specific number of lines.`
      }
    }
  },
  render: () => {
    return `
      <div class="utility-classes-demo">
        <div class="utility-classes-header">
          <h2>Line Clamp</h2>
          <p class="utility-classes-description">Utilities for clamping text to a specific number of lines.</p>
          
          <div class="utility-links">
            <h4>Related Links:</h4>
            <ul>
              <li><a href="https://tailwindcss.com/docs/line-clamp" target="_blank" rel="noopener">https://tailwindcss.com/docs/line-clamp</a></li>
            </ul>
          </div>
        </div>
        <div class="utility-classes-grid">
          
          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>line-clamp-1</code>
              <span class="utility-preview-description">line-clamp-1</span>
            </div>
            <div class="utility-preview-demo">
              <div class="line-clamp-1 mb-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>line-clamp-2</code>
              <span class="utility-preview-description">line-clamp-2</span>
            </div>
            <div class="utility-preview-demo">
              <div class="line-clamp-2 mb-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>line-clamp-3</code>
              <span class="utility-preview-description">line-clamp-3</span>
            </div>
            <div class="utility-preview-demo">
              <div class="line-clamp-3 mb-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>line-clamp-4</code>
              <span class="utility-preview-description">line-clamp-4</span>
            </div>
            <div class="utility-preview-demo">
              <div class="line-clamp-4 mb-4">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>line-clamp-5</code>
              <span class="utility-preview-description">line-clamp-5</span>
            </div>
            <div class="utility-preview-demo">
              <div class="line-clamp-5 mb-4">
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


export const typography = {
  title: 'parent-namespace/Utility Classes/Utility/Typography',
  parameters: {
    docs: {
      description: {
        story: `Utility classes for typography`
      }
    }
  },
  render: () => {
    return `
      <div class="utility-classes-demo">
        <div class="utility-classes-header">
          <h2>Typography</h2>
          
          
        </div>
        <div class="utility-classes-grid">
          
          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>prose</code>
              <span class="utility-preview-description">Formatted Text (prose)</span>
            </div>
            <div class="utility-preview-demo">
              <div class="prose mb-4">
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


export const font_family = {
  title: 'parent-namespace/Utility Classes/Typography/Font family',
  parameters: {
    docs: {
      description: {
        story: `You can control the typeface of text using the font family utilities.`
      }
    }
  },
  render: () => {
    return `
      <div class="utility-classes-demo">
        <div class="utility-classes-header">
          <h2>Font family</h2>
          <p class="utility-classes-description">You can control the typeface of text using the font family utilities.</p>
          
          <div class="utility-links">
            <h4>Related Links:</h4>
            <ul>
              <li><a href="https://tailwindcss.com/docs/font-family#setting-the-font-family" target="_blank" rel="noopener">https://tailwindcss.com/docs/font-family#setting-the-font-family</a></li>
            </ul>
          </div>
        </div>
        <div class="utility-classes-grid">
          
          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>font-mono</code>
              <span class="utility-preview-description">Mono</span>
            </div>
            <div class="utility-preview-demo">
              <div class="font-mono">
                Demo
              </div>
            </div>
          </div>

          <div class="utility-preview-item">
            <div class="utility-preview-label">
              <code>font-sans</code>
              <span class="utility-preview-description">Sans</span>
            </div>
            <div class="utility-preview-demo">
              <div class="font-sans">
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