import accordion from '../components/atoms/accordion/accordion.component.yml'
import breadcrumbs from '../components/breadcrumbs/breadcrumbs.component.yml'
import header, {
  Preview as HeaderPreview,
} from '../components/header/header.component.yml'
import banner, {
  Preview as BannerPreview,
} from '../components/banner/banner.component.yml'
import paragraph, {
  Badges as ParagraphBadges,
  Grid as ParagraphGrid,
} from '../components/paragraph/paragraph.component.yml'
import slider from '../components/slider/slider.component.yml'
import card, {
  Preview as CardPreview,
} from '../components/card/card.component.yml'

import parentBanner from '@parent-namespace/banner/banner.component.yml'

export default {
  title: 'Storybook/Page with imported SDC',
  render: () => {
    return `
      ${header.component({ ...HeaderPreview.args })}
      ${banner.component({ ...BannerPreview.args })}
      ${paragraph.component({
        content: () => `
          ${breadcrumbs.component({
            items: [
              {
                title: 'Home',
                url: '#',
              },
              {
                title: 'Sweet',
                url: '#',
              },
              {
                title: 'Home',
              },
            ],
          })}
        `,
      })}
      ${paragraph.component({ ...paragraph.args })}
      ${paragraph.component({ ...ParagraphGrid.args })}
      ${paragraph.component({ ...ParagraphBadges.args })}
      ${paragraph.component({
        label: 'Paragraph with Slider',
        content: () => `
          ${slider.component({
            ...slider.args,
            sliderType: 'naked',
            slides: [
              card.component({ ...CardPreview.args }),
              card.component({ ...CardPreview.args }),
              card.component({ ...CardPreview.args }),
            ],
          })}

        `,
      })}
      ${paragraph.component({
        label: 'Paragraph with Accordions',
        content: () => `
          ${accordion.component({ content: 'Accordion content 1', title: 'Accordion 1', name: 'acc' })}
          ${accordion.component({ content: 'Accordion content 2', title: 'Accordion 2', name: 'acc' })}
        `,
      })}
      ${parentBanner.component({ content: 'Banner from parent namespace' })}

    `
  },
  play: async ({ canvasElement }) => {
    Drupal.attachBehaviors(canvasElement, window.drupalSettings)
  },
}

export const Basic = {}
