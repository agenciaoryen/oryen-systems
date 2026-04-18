/**
 * Aplica o tema escolhido pelo dono do site (dark ou light) no site público.
 * Script inline puro — roda antes da primeira pintura, sem depender de React.
 * Não usa MutationObserver: o ThemeProvider já ignora rotas /sites/*, então não há disputa.
 */
export default function SiteThemeLock({ theme }: { theme: 'dark' | 'light' }) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            var h = document.documentElement;
            var target = ${JSON.stringify(theme)};
            if (target === 'light') {
              if (h.getAttribute('data-theme') !== 'light') h.setAttribute('data-theme', 'light');
            } else {
              if (h.hasAttribute('data-theme')) h.removeAttribute('data-theme');
            }
          })();
        `,
      }}
    />
  )
}
