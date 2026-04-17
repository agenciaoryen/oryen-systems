'use client'

/**
 * Força o tema escolhido pelo dono do site (dark ou light) no site público,
 * ignorando a preferência do usuário visitante no dashboard.
 *
 * Usa script inline para agir antes da primeira pintura,
 * e MutationObserver para impedir que o ThemeProvider sobrescreva.
 */
export default function SiteThemeLock({ theme }: { theme: 'dark' | 'light' }) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            var h = document.documentElement;
            var target = ${JSON.stringify(theme)};
            function apply() {
              if (target === 'light') {
                h.setAttribute('data-theme', 'light');
              } else {
                h.removeAttribute('data-theme');
              }
            }
            apply();
            var obs = new MutationObserver(function() { apply(); });
            obs.observe(h, { attributes: true, attributeFilter: ['data-theme'] });
            window.__siteThemeObs = obs;
          })();
        `,
      }}
    />
  )
}
