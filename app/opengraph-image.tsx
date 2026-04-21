import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Oryen — IA para Corretores de Imóveis'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0B0E13 0%, #12161D 100%)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -200,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 900,
            height: 600,
            background: 'radial-gradient(ellipse at center, rgba(90, 122, 230, 0.18), transparent 65%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            fontSize: 160,
            fontWeight: 900,
            letterSpacing: 24,
            color: '#BFCAD3',
            lineHeight: 1,
          }}
        >
          ORYEN
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 32,
            fontWeight: 500,
            color: '#8A95A3',
            letterSpacing: 2,
          }}
        >
          IA para Corretores de Imóveis
        </div>
        <div
          style={{
            marginTop: 56,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 24px',
            borderRadius: 999,
            background: 'rgba(90, 122, 230, 0.12)',
            border: '1px solid rgba(90, 122, 230, 0.3)',
            fontSize: 22,
            color: '#BFCAD3',
          }}
        >
          oryen.agency
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
