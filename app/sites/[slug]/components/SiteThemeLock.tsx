'use client'

/**
 * Força o site público a SEMPRE usar o tema dark,
 * ignorando a preferência do usuário no dashboard.
 *
 * Usa script inline para agir antes da primeira pintura,
 * e MutationObserver para impedir que o ThemeProvider re-aplique light.
 */
export default function SiteThemeLock() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            var h = document.documentElement;
            h.removeAttribute('data-theme');
            var obs = new MutationObserver(function(mutations) {
              mutations.forEach(function(m) {
                if (m.type === 'attributes' && m.attributeName === 'data-theme') {
                  if (h.getAttribute('data-theme') === 'light') {
                    h.removeAttribute('data-theme');
                  }
                }
              });
            });
            obs.observe(h, { attributes: true, attributeFilter: ['data-theme'] });
            window.__siteThemeObs = obs;
          })();
        `,
      }}
    />
  )
}
