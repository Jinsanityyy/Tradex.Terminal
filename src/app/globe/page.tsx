import dynamic from 'next/dynamic';

const GlobeClient = dynamic(
  () => import('@/components/globe/GlobeClient'),
  { ssr: false, loading: () => (
    <div style={{ background: '#0A0A0A', width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#D4AF37', fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, letterSpacing: 2 }}>
        INITIALIZING GLOBE...
      </div>
    </div>
  )}
);

export default function GlobePage() {
  return <GlobeClient />;
}
