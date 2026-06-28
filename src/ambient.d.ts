// Ambient declarations for third-party modules that ship no types.

// twing stack (vite-plugin-twing-drupal) uses the scoped fork…
declare module '@christianwiedemann/drupal-twig-extensions/twing' {
  // Registers Drupal filters/functions (create_attribute, t, …) on a Twing env.
  export function addDrupalExtensions(env: unknown, config?: unknown): void
}

// …while the twig.js stack (vite-plugin-twig-drupal) uses the unscoped package.
declare module 'drupal-twig-extensions/twig' {
  // Twig.js variant — registers the same Drupal filters/functions on Twig.
  export function addDrupalExtensions(Twig: unknown, config?: unknown): void
}
