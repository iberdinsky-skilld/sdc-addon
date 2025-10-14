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
      <div class="utility-demo">
        <h2>Font size</h2>
        <p>We use specifics size classes (with custom tokens) for a responsive typography display</p>
        
        <div class="utility-grid">
          
    <div class="utility-item">
      <div class="utility-label">
        <code>title-2xl</code>
      </div>
      <div class="utility-preview">
        <div class="title-2xl mb-4">
          Title 2XL
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>title-xl</code>
      </div>
      <div class="utility-preview">
        <div class="title-xl mb-4">
          Title XL
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>title-lg</code>
      </div>
      <div class="utility-preview">
        <div class="title-lg mb-4">
          Title LG
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>title-md</code>
      </div>
      <div class="utility-preview">
        <div class="title-md mb-4">
          Title MD
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>title-sm</code>
      </div>
      <div class="utility-preview">
        <div class="title-sm mb-4">
          Title SM
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>title-xs</code>
      </div>
      <div class="utility-preview">
        <div class="title-xs mb-4">
          Title XS
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>body-xl</code>
      </div>
      <div class="utility-preview">
        <div class="body-xl mb-4">
          Body XL
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>body-lg</code>
      </div>
      <div class="utility-preview">
        <div class="body-lg mb-4">
          Body LG
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>body-md</code>
      </div>
      <div class="utility-preview">
        <div class="body-md mb-4">
          Body MD
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>body-sm</code>
      </div>
      <div class="utility-preview">
        <div class="body-sm mb-4">
          Body SM
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>body-xs</code>
      </div>
      <div class="utility-preview">
        <div class="body-xs mb-4">
          Body XS
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>label-xl</code>
      </div>
      <div class="utility-preview">
        <div class="label-xl mb-4">
          Label XL
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>label-lg</code>
      </div>
      <div class="utility-preview">
        <div class="label-lg mb-4">
          Label LG
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>label-md</code>
      </div>
      <div class="utility-preview">
        <div class="label-md mb-4">
          Label MD
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>label-sm</code>
      </div>
      <div class="utility-preview">
        <div class="label-sm mb-4">
          Label SM
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>label-xs</code>
      </div>
      <div class="utility-preview">
        <div class="label-xs mb-4">
          Label XS
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
      <div class="utility-demo">
        <h2>Line Clamp</h2>
        <p>Utilities for clamping text to a specific number of lines.</p>
        
          <h4>Related Links:</h4>
          <ul>
            <li><a href="https://tailwindcss.com/docs/line-clamp" target="_blank" rel="noopener">https://tailwindcss.com/docs/line-clamp</a></li>
          </ul>
        <div class="utility-grid">
          
    <div class="utility-item">
      <div class="utility-label">
        <code>line-clamp-1</code>
      </div>
      <div class="utility-preview">
        <div class="line-clamp-1 mb-4">
          line-clamp-1
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>line-clamp-2</code>
      </div>
      <div class="utility-preview">
        <div class="line-clamp-2 mb-4">
          line-clamp-2
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>line-clamp-3</code>
      </div>
      <div class="utility-preview">
        <div class="line-clamp-3 mb-4">
          line-clamp-3
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>line-clamp-4</code>
      </div>
      <div class="utility-preview">
        <div class="line-clamp-4 mb-4">
          line-clamp-4
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>line-clamp-5</code>
      </div>
      <div class="utility-preview">
        <div class="line-clamp-5 mb-4">
          line-clamp-5
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
      <div class="utility-demo">
        <h2>Typography</h2>
        
        
        <div class="utility-grid">
          
    <div class="utility-item">
      <div class="utility-label">
        <code>prose</code>
      </div>
      <div class="utility-preview">
        <div class="prose mb-4">
          Formatted Text (prose)
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
      <div class="utility-demo">
        <h2>Font family</h2>
        <p>You can control the typeface of text using the font family utilities.</p>
        
          <h4>Related Links:</h4>
          <ul>
            <li><a href="https://tailwindcss.com/docs/font-family#setting-the-font-family" target="_blank" rel="noopener">https://tailwindcss.com/docs/font-family#setting-the-font-family</a></li>
          </ul>
        <div class="utility-grid">
          
    <div class="utility-item">
      <div class="utility-label">
        <code>font-mono</code>
      </div>
      <div class="utility-preview">
        <div class="font-mono">
          Mono
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>font-sans</code>
      </div>
      <div class="utility-preview">
        <div class="font-sans">
          Sans
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