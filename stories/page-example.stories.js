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
export default {
  title: 'Page with imported SDC',
  render: async () => {
    const headerHtml = await header.baseComponent({ ...HeaderPreview.args });
    const bannerHtml = await banner.baseComponent({ ...BannerPreview.args });

    const breadcrumbsHtml = await breadcrumbs.baseComponent({
      items: [
        { title: 'Home', url: '#' },
        { title: 'Sweet', url: '#' },
        { title: 'Home' },
      ],
    });

    const paragraphWithBreadcrumbs = await paragraph.baseComponent({
      content: () => breadcrumbsHtml,
    });

    const paragraph1 = await paragraph.baseComponent({ ...paragraph.args });
    const paragraphGrid = await paragraph.baseComponent({ ...ParagraphGrid.args });
    const paragraphBadges = await paragraph.baseComponent({ ...ParagraphBadges.args });

    const card1 = await card.baseComponent({ ...CardPreview.args });
    const card2 = await card.baseComponent({ ...CardPreview.args });
    const card3 = await card.baseComponent({ ...CardPreview.args });

    const sliderHtml = await slider.baseComponent({
      ...slider.args,
      sliderType: 'naked',
      slides: [card1, card2, card3],
    });

    const paragraphWithSlider = await paragraph.baseComponent({
      label: 'Paragraph with Slider',
      content: () => sliderHtml,
    });

    const accordion1 = await accordion.baseComponent({ content: 'Test', title: 'Test', name: 'acc' });
    const accordion2 = await accordion.baseComponent({ content: 'Test', title: 'Test', name: 'acc' });

    const paragraphWithAccordion = await paragraph.baseComponent({
      label: 'Paragraph with Accordions',
      content: () => `${accordion1}${accordion2}`,
    });

    return Promise.resolve(
      `
      ${headerHtml}
      ${bannerHtml}
      ${paragraphWithBreadcrumbs}
      ${paragraph1}
      ${paragraphGrid}
      ${paragraphBadges}
      ${paragraphWithSlider}
      ${paragraphWithAccordion}
    `
    );
  },

  play: async ({ canvasElement }) => {
    Drupal.attachBehaviors(canvasElement, window.drupalSettings);
  },
};

export const Basic = {}
