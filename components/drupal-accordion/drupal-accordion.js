;(function ($, Drupal, once) {
  Drupal.behaviors.drupalAccordion = {
    attach(context) {
      once('drupal-accordion', '[data-drupal-accordion]', context).forEach(
        (el) => {
          $(el).accordion({ collapsible: true })
        }
      )
    },
  }
})(jQuery, Drupal, once)
