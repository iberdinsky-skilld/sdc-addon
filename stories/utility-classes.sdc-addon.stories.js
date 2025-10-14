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
      <div class="utility-demo">
        <h2>Rounded</h2>
        
        
        <div class="utility-grid">
          
    <div class="utility-item">
      <div class="utility-label">
        <code>rounded-sm</code>
      </div>
      <div class="utility-preview">
        <div class="rounded-sm inline-flex items-center justify-center text-center w-[200px] h-[200px] bg-secondary text-white m-4">
          sm
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>rounded</code>
      </div>
      <div class="utility-preview">
        <div class="rounded inline-flex items-center justify-center text-center w-[200px] h-[200px] bg-secondary text-white m-4">
          default
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>rounded-md</code>
      </div>
      <div class="utility-preview">
        <div class="rounded-md inline-flex items-center justify-center text-center w-[200px] h-[200px] bg-secondary text-white m-4">
          md
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>rounded-lg</code>
      </div>
      <div class="utility-preview">
        <div class="rounded-lg inline-flex items-center justify-center text-center w-[200px] h-[200px] bg-secondary text-white m-4">
          lg
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>rounded-xl</code>
      </div>
      <div class="utility-preview">
        <div class="rounded-xl inline-flex items-center justify-center text-center w-[200px] h-[200px] bg-secondary text-white m-4">
          xl
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>rounded-2xl</code>
      </div>
      <div class="utility-preview">
        <div class="rounded-2xl inline-flex items-center justify-center text-center w-[200px] h-[200px] bg-secondary text-white m-4">
          2xl
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>rounded-3xl</code>
      </div>
      <div class="utility-preview">
        <div class="rounded-3xl inline-flex items-center justify-center text-center w-[200px] h-[200px] bg-secondary text-white m-4">
          3xl
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>rounded-none</code>
      </div>
      <div class="utility-preview">
        <div class="rounded-none inline-flex items-center justify-center text-center w-[200px] h-[200px] bg-secondary text-white m-4">
          none
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>rounded-tr-3xl rounded-bl-3xl</code>
      </div>
      <div class="utility-preview">
        <div class="rounded-tr-3xl rounded-bl-3xl inline-flex items-center justify-center text-center w-[200px] h-[200px] bg-secondary text-white m-4">
          theme
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
        story: `Margin top for different screen sizes`
      }
    }
  },
  render: () => {
    return `
      <div class="utility-demo">
        <h2>Margin top</h2>
        <p>Margin top for different screen sizes</p>
        
        <div class="utility-grid">
          
    <div class="utility-item">
      <div class="utility-label">
        <code>mt-xs</code>
      </div>
      <div class="utility-preview">
        <div class="mt-xs bg-neutral-content">
          xs
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>mt-xs md:mt-sm</code>
      </div>
      <div class="utility-preview">
        <div class="mt-xs md:mt-sm bg-neutral-content">
          sm
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>mt-xs md:mt-md</code>
      </div>
      <div class="utility-preview">
        <div class="mt-xs md:mt-md bg-neutral-content">
          md
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>mt-xs md:mt-md lg:mt-lg</code>
      </div>
      <div class="utility-preview">
        <div class="mt-xs md:mt-md lg:mt-lg bg-neutral-content">
          lg
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>mt-xs md:mt-md lg:mt-xl</code>
      </div>
      <div class="utility-preview">
        <div class="mt-xs md:mt-md lg:mt-xl bg-neutral-content">
          xl
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>mt-xs md:mt-md lg:mt-2xl</code>
      </div>
      <div class="utility-preview">
        <div class="mt-xs md:mt-md lg:mt-2xl bg-neutral-content">
          2xl
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
        story: `Margin bottom for different screen sizes`
      }
    }
  },
  render: () => {
    return `
      <div class="utility-demo">
        <h2>Margin bottom</h2>
        <p>Margin bottom for different screen sizes</p>
        
        <div class="utility-grid">
          
    <div class="utility-item">
      <div class="utility-label">
        <code>mb-xs</code>
      </div>
      <div class="utility-preview">
        <div class="mb-xs bg-neutral-content">
          xs
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>mb-xs md:mb-sm</code>
      </div>
      <div class="utility-preview">
        <div class="mb-xs md:mb-sm bg-neutral-content">
          sm
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>mb-xs md:mb-md</code>
      </div>
      <div class="utility-preview">
        <div class="mb-xs md:mb-md bg-neutral-content">
          md
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>mb-xs md:mb-md lg:mb-lg</code>
      </div>
      <div class="utility-preview">
        <div class="mb-xs md:mb-md lg:mb-lg bg-neutral-content">
          lg
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>mb-xs md:mb-md lg:mb-xl</code>
      </div>
      <div class="utility-preview">
        <div class="mb-xs md:mb-md lg:mb-xl bg-neutral-content">
          xl
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>mb-xs md:mb-md lg:mb-2xl</code>
      </div>
      <div class="utility-preview">
        <div class="mb-xs md:mb-md lg:mb-2xl bg-neutral-content">
          2xl
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
        story: `Gap for different screen sizes`
      }
    }
  },
  render: () => {
    return `
      <div class="utility-demo">
        <h2>Gap</h2>
        <p>Gap for different screen sizes</p>
        
        <div class="utility-grid">
          
    <div class="utility-item">
      <div class="utility-label">
        <code>gap-between-xs</code>
      </div>
      <div class="utility-preview">
        <div class="gap-between-xs bg-neutral-content">
          xs
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>gap-between-xs md:gap-between-sm</code>
      </div>
      <div class="utility-preview">
        <div class="gap-between-xs md:gap-between-sm bg-neutral-content">
          sm
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>gap-between-xs md:gap-between-md</code>
      </div>
      <div class="utility-preview">
        <div class="gap-between-xs md:gap-between-md bg-neutral-content">
          md
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>gap-between-xs md:gap-between-md gap-between-lg</code>
      </div>
      <div class="utility-preview">
        <div class="gap-between-xs md:gap-between-md gap-between-lg bg-neutral-content">
          lg
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>gap-between-xs md:gap-between-md gap-between-xl</code>
      </div>
      <div class="utility-preview">
        <div class="gap-between-xs md:gap-between-md gap-between-xl bg-neutral-content">
          xl
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>gap-between-xs md:gap-between-md lg:gap-between-2xl</code>
      </div>
      <div class="utility-preview">
        <div class="gap-between-xs md:gap-between-md lg:gap-between-2xl bg-neutral-content">
          2xl
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
      <div class="utility-demo">
        <h2>Border width</h2>
        
        
        <div class="utility-grid">
          
    <div class="utility-item">
      <div class="utility-label">
        <code>border-0</code>
      </div>
      <div class="utility-preview">
        <div class="border-0">
          none
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>border</code>
      </div>
      <div class="utility-preview">
        <div class="border">
          1px
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>border-2</code>
      </div>
      <div class="utility-preview">
        <div class="border-2">
          2px
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>border-4</code>
      </div>
      <div class="utility-preview">
        <div class="border-4">
          4px
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>border-8</code>
      </div>
      <div class="utility-preview">
        <div class="border-8">
          8px
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
      <div class="utility-demo">
        <h2>Border style</h2>
        
        
        <div class="utility-grid">
          
    <div class="utility-item">
      <div class="utility-label">
        <code>border-solid</code>
      </div>
      <div class="utility-preview">
        <div class="border-solid border border-2">
          solid
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>border-dashed</code>
      </div>
      <div class="utility-preview">
        <div class="border-dashed border border-2">
          dashed
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>border-dotted</code>
      </div>
      <div class="utility-preview">
        <div class="border-dotted border border-2">
          dotted
        </div>
      </div>
    </div>

    <div class="utility-item">
      <div class="utility-label">
        <code>border-double</code>
      </div>
      <div class="utility-preview">
        <div class="border-double border border-2">
          double
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