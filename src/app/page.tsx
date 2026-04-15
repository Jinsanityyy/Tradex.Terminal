import React from 'react'

// ─── Icons ───────────────────────────────────────────────────────────────────

const ArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)

const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

const Check = ({ size = 13, color = '#22c55e' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const Minus = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const TrendingUpIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
)

const BrainIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.84A2.5 2.5 0 0 1 9.5 2"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.84A2.5 2.5 0 0 0 14.5 2"/>
  </svg>
)

const CalendarIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

const ZapIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)

const ShieldIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

const ClockIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)

const CircleOIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="9"/>
  </svg>
)

const ZapGreenIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)

const StarIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: <TrendingUpIcon />, title: 'Market Bias Engine',    desc: 'AI-generated directional signals for every major asset — Bullish, Bearish, or Neutral — with a live confidence score that updates as news breaks.' },
  { icon: <BrainIcon />,      title: 'Daily AI Briefing',     desc: 'A synthesized pre-session report covering macro drivers, overnight shifts, and key catalysts. Delivered before the open, every session.' },
  { icon: <CalendarIcon />,   title: 'Economic Calendar',     desc: 'Every event paired with AI-generated impact analysis for Gold and USD. Understand what\'s expected before the number prints.' },
  { icon: <ZapIcon />,        title: 'Catalyst Feed',         desc: 'Real-time news and events filtered by market impact. Central banks, geopolitics, inflation — only what actually moves price.' },
  { icon: <ShieldIcon />,     title: 'Policy Monitor',        desc: 'Live tracking of policy signals with impact scores, affected assets, and sentiment classification. Know before markets react.' },
  { icon: <ClockIcon />,      title: 'Session Intelligence',  desc: 'Know exactly which session you\'re in, expected volatility ranges, and optimal trading windows per asset class.' },
]

const COMPARE_ROWS = [
  ['React to price after it moves',      'Understand why price is moving'],
  ['No conviction on entry direction',   'AI bias signal with confidence %'],
  ['Miss news that drives candles',      'Live catalyst feed — filtered by impact'],
  ['Open 5 tabs for market context',     'Everything unified in one dashboard'],
  ['Trade the wrong session window',     'Session intelligence guides your timing'],
  ['Guess on macro event impact',        'AI-analyzed economic calendar'],
]

const FREE_FEATURES: [boolean, string][] = [
  [true,  '5 tracked assets'],
  [true,  'Delayed prices (15 min)'],
  [true,  'Basic economic calendar'],
  [true,  'Limited news feed'],
  [false, 'AI Daily Briefing'],
  [false, 'Market Bias Engine'],
  [false, 'Policy Monitor'],
  [false, 'Session Intelligence'],
]

const PRO_FEATURES = [
  'All assets — Gold, Forex, Crypto',
  'Real-time live prices',
  'Full economic calendar + AI analysis',
  'AI Daily Briefing',
  'Market Bias Engine',
  'Policy Monitor',
  'Session Intelligence',
  'Catalyst Feed',
]

const ELITE_FEATURES = [
  'Everything in Pro',
  'Priority data feeds',
  'Advanced AI analysis depth',
  'Full Asset Matrix',
  'Custom alerts',
  'Mobile app access',
  'Priority support',
  'Early feature access',
]

const FAQS = [
  {
    q: 'What exactly does TradeX give me?',
    a: 'TradeX is a market intelligence terminal — not a broker or signal service. It gives you the context behind price: AI bias signals, live news catalysts, economic calendar analysis, and session data. You make the trading decisions. We make sure you have the full picture first.',
  },
  {
    q: 'Do I need trading experience to use it?',
    a: 'TradeX is built for active traders who already know how to trade but want sharper market context before and during sessions. The dashboard is intuitive and structured around how traders actually think.',
  },
  {
    q: 'What markets does TradeX cover?',
    a: 'Gold (XAUUSD), major Forex pairs, Bitcoin, Ethereum, indices, and key macro instruments like DXY. Pro and Elite plans unlock the full asset matrix.',
  },
  {
    q: 'How does the 7-day trial work?',
    a: 'You get full Pro or Elite access for 7 days. No credit card required to start. At the end of your trial, you choose a plan to continue — or you stay on the free tier.',
  },
  {
    q: 'Can I cancel at any time?',
    a: 'Yes. No contracts, no lock-ins. Cancel from your account settings at any time. Your access continues until the end of the current billing period.',
  },
]

const TICKERS = [
  { sym: 'XAUUSD', price: '4,731', chg: '+1.65%', up: true },
  { sym: 'BTCUSD', price: '67,144', chg: '−1.06%', up: false },
  { sym: 'EURUSD', price: '1.1551', chg: '+0.12%', up: true },
  { sym: 'GBPUSD', price: '1.3255', chg: '+0.08%', up: true },
  { sym: 'USOIL',  price: '85.41',  chg: '+0.21%', up: true },
  { sym: 'ETHUSD', price: '2,095',  chg: '+0.04%', up: true },
  { sym: 'USDJPY', price: '159.20', chg: '−0.08%', up: false },
  { sym: 'DXY',    price: '99.79',  chg: '−0.22%', up: false },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }

        :root {
          --bg:           #07080d;
          --bg-card:      #0c0e15;
          --bg-raised:    #111520;
          --border:       #1c1f2e;
          --border-sub:   #13151f;
          --g:            #22c55e;
          --g-dim:        rgba(34,197,94,0.08);
          --g-glow:       rgba(34,197,94,0.18);
          --g-border:     rgba(34,197,94,0.2);
          --g-text:       #4ade80;
          --red:          #ef4444;
          --red-dim:      rgba(239,68,68,0.08);
          --amber:        #f59e0b;
          --t1:           #f0f4f8;
          --t2:           #8b96a8;
          --t3:           #434e61;
          --t4:           #1a2030;
          --r:            10px;
          --r-lg:         14px;
        }

        body {
          background: var(--bg);
          color: var(--t1);
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 15px;
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        a { text-decoration: none; color: inherit; }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

        /* ── NAV ───────────────────────────────────────────────────── */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 200;
          height: 56px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 44px;
          background: rgba(7,8,13,0.88);
          backdrop-filter: blur(18px);
          border-bottom: 1px solid var(--border-sub);
        }
        .nav-brand { display: flex; align-items: center; gap: 0px; text-decoration: none; }
        .nav-logo {
          height: 36px; width: auto;
          object-fit: contain;
        }
        @keyframes tradex-glow {
          0%, 100% { filter: drop-shadow(0 0 6px #00C85360) drop-shadow(0 0 14px #00C85330); }
          50%       { filter: drop-shadow(0 0 12px #00C85390) drop-shadow(0 0 28px #00C85350); }
        }
        .nav-links { display: flex; gap: 30px; }
        .nav-links a { font-size: 13px; color: var(--t3); transition: color .15s; }
        .nav-links a:hover { color: var(--t1); }
        .nav-actions { display: flex; align-items: center; gap: 8px; }
        .btn-nav-ghost {
          font-size: 13px; font-weight: 500; color: var(--t2);
          padding: 6px 15px; border: 1px solid var(--border);
          border-radius: 8px; background: transparent;
          cursor: pointer; transition: all .15s;
          display: inline-flex; align-items: center;
        }
        .btn-nav-ghost:hover { border-color: var(--t3); color: var(--t1); }
        .btn-nav-primary {
          font-size: 13px; font-weight: 600; color: #07080d;
          padding: 6px 16px; background: var(--g);
          border: none; border-radius: 8px; cursor: pointer;
          transition: all .15s; display: inline-flex; align-items: center; gap: 6px;
        }
        .btn-nav-primary:hover { background: #4ade80; }

        /* ── HERO ──────────────────────────────────────────────────── */
        .hero {
          padding: 136px 44px 88px;
          text-align: center;
          position: relative; overflow: hidden;
        }
        .hero-glow {
          position: absolute; top: 0; left: 50%; transform: translateX(-50%);
          width: 800px; height: 480px;
          background: radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.07) 0%, transparent 65%);
          pointer-events: none;
        }
        .hero-inner { position: relative; z-index: 1; max-width: 700px; margin: 0 auto; }

        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--bg-card); border: 1px solid var(--border);
          padding: 5px 14px; border-radius: 100px; margin-bottom: 36px;
          font-size: 11px; color: var(--t2); letter-spacing: 0.4px;
        }
        .badge-dot {
          width: 6px; height: 6px; border-radius: 50%; background: var(--g);
          animation: badge-pulse 2s ease-in-out infinite;
        }
        @keyframes badge-pulse { 0%,100% { opacity:1; } 50% { opacity:0.35; } }

        .hero-h1 {
          font-size: clamp(34px, 5.2vw, 58px);
          font-weight: 700;
          line-height: 1.13;
          letter-spacing: -0.03em;
          color: var(--t1);
          margin-bottom: 22px;
        }
        .hero-h1 em { color: var(--g-text); font-style: normal; }

        .hero-sub {
          font-size: 16px; line-height: 1.7; color: var(--t2);
          max-width: 520px; margin: 0 auto 40px;
        }

        .hero-actions {
          display: flex; align-items: center; justify-content: center;
          gap: 10px; flex-wrap: wrap; margin-bottom: 40px;
        }
        .btn-hero {
          font-size: 14px; font-weight: 600; color: #07080d;
          padding: 13px 26px; background: var(--g);
          border: none; border-radius: 9px; cursor: pointer;
          transition: all .2s; display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-hero:hover { background: #4ade80; box-shadow: 0 0 28px var(--g-glow); transform: translateY(-1px); }
        .btn-hero-ghost {
          font-size: 13px; font-weight: 500; color: var(--t2);
          padding: 13px 22px; background: transparent;
          border: 1px solid var(--border); border-radius: 9px; cursor: pointer;
          transition: all .15s; display: inline-flex; align-items: center;
        }
        .btn-hero-ghost:hover { color: var(--t1); border-color: var(--t3); }

        .hero-trust {
          display: flex; align-items: center; justify-content: center;
          gap: 22px; flex-wrap: wrap;
        }
        .trust-item {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; color: var(--t3);
        }

        /* ── TICKER ────────────────────────────────────────────────── */
        .ticker-wrap {
          border-top: 1px solid var(--border-sub);
          border-bottom: 1px solid var(--border-sub);
          background: var(--bg-card);
          overflow: hidden; position: relative;
        }
        .ticker-fade-l, .ticker-fade-r {
          position: absolute; top: 0; bottom: 0; width: 72px; z-index: 2; pointer-events: none;
        }
        .ticker-fade-l { left: 0; background: linear-gradient(to right, var(--bg-card), transparent); }
        .ticker-fade-r { right: 0; background: linear-gradient(to left, var(--bg-card), transparent); }
        .ticker-track {
          display: flex; padding: 10px 0;
          animation: ticker-roll 30s linear infinite;
          width: max-content;
        }
        @keyframes ticker-roll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .ticker-item {
          display: flex; align-items: center; gap: 7px;
          padding: 0 22px; border-right: 1px solid var(--border-sub);
          white-space: nowrap;
        }
        .t-sym { font-size: 9px; color: var(--t3); font-family: 'DM Mono', monospace; letter-spacing: 0.8px; }
        .t-price { font-size: 11px; color: var(--t1); font-family: 'DM Mono', monospace; font-weight: 500; }
        .t-up { font-size: 9px; color: var(--g); font-family: 'DM Mono', monospace; }
        .t-dn { font-size: 9px; color: var(--red); font-family: 'DM Mono', monospace; }

        /* ── STATS ─────────────────────────────────────────────────── */
        .stats-row {
          display: flex; flex-wrap: wrap;
          border-bottom: 1px solid var(--border-sub);
        }
        .stat-cell {
          flex: 1; min-width: 160px;
          padding: 40px 36px; text-align: center;
          border-right: 1px solid var(--border-sub);
        }
        .stat-cell:last-child { border-right: none; }
        .stat-n {
          font-size: 36px; font-weight: 700;
          letter-spacing: -0.04em; line-height: 1;
          color: var(--g-text); margin-bottom: 7px;
        }
        .stat-l {
          font-size: 11px; color: var(--t3);
          font-family: 'DM Mono', monospace; letter-spacing: 1.2px;
        }

        /* ── SECTION SHARED ────────────────────────────────────────── */
        .sec { padding: 96px 44px; }
        .sec-alt { background: var(--bg-card); border-top: 1px solid var(--border-sub); border-bottom: 1px solid var(--border-sub); }
        .sec-head {
          text-align: center; max-width: 580px;
          margin: 0 auto 60px;
        }
        .sec-tag {
          display: inline-block;
          font-size: 10px; font-weight: 500;
          font-family: 'DM Mono', monospace; letter-spacing: 2px;
          color: var(--g); text-transform: uppercase; margin-bottom: 14px;
        }
        .sec-h {
          font-size: clamp(24px, 3.2vw, 38px);
          font-weight: 700; letter-spacing: -0.025em; line-height: 1.2;
          color: var(--t1); margin-bottom: 13px;
        }
        .sec-h em { color: var(--g-text); font-style: normal; }
        .sec-p { font-size: 14px; line-height: 1.75; color: var(--t2); }

        /* ── PRODUCT SHOWCASE ──────────────────────────────────────── */
        .showcase-wrap { max-width: 980px; margin: 0 auto; }
        .terminal {
          border: 1px solid var(--border);
          border-radius: var(--r-lg); overflow: hidden;
          box-shadow: 0 40px 100px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03), 0 0 80px rgba(34,197,94,0.03);
        }
        .term-bar {
          background: #090b12; border-bottom: 1px solid var(--border);
          padding: 10px 16px; display: flex; align-items: center; gap: 12px;
        }
        .win-dots { display: flex; gap: 5px; }
        .win-dot { width: 9px; height: 9px; border-radius: 50%; }
        .term-url {
          flex: 1; background: var(--bg); border-radius: 5px;
          padding: 4px 12px; font-size: 9px; color: var(--t3);
          font-family: 'DM Mono', monospace; letter-spacing: 0.3px;
        }
        .term-nav {
          background: #090b12; border-bottom: 1px solid var(--border);
          padding: 8px 16px; display: flex; align-items: center; gap: 0;
        }
        .tn-brand {
          display: flex; align-items: center; gap: 6px;
          padding-right: 16px; border-right: 1px solid var(--border); margin-right: 14px;
        }
        .tn-mark {
          width: 17px; height: 17px;
          background: linear-gradient(135deg, #00C853, #69F0AE);
          border-radius: 4px; display: flex; align-items: center; justify-content: center;
        }
        .tn-name { font-size: 11px; letter-spacing: -0.03em; display: inline-flex; align-items: center; }
        .tn-name .wm-trade { font-weight: 300; color: #fff; }
        .tn-name .wm-x {
          font-weight: 800;
          background: linear-gradient(135deg, #00C853, #69F0AE);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .tn-prices { display: flex; overflow: hidden; flex: 1; }
        .tn-tick {
          padding: 0 12px; border-right: 1px solid var(--border);
          font-size: 9px; font-family: 'DM Mono', monospace;
          display: flex; align-items: center; gap: 5px; color: var(--t3); white-space: nowrap;
        }
        .tn-tick b { color: var(--t1); font-weight: 500; }
        .tn-live {
          margin-left: auto;
          font-size: 8px; font-family: 'DM Mono', monospace; letter-spacing: 1.5px;
          color: var(--g); border: 1px solid var(--g-border);
          padding: 2px 8px; border-radius: 3px;
          display: flex; align-items: center; gap: 4px;
        }
        .live-dot {
          width: 4px; height: 4px; border-radius: 50%; background: var(--g);
          animation: badge-pulse 1.5s ease-in-out infinite;
        }
        .term-body {
          display: grid; grid-template-columns: 155px 1fr;
          min-height: 340px;
        }
        .term-sidebar {
          background: #090b12; border-right: 1px solid var(--border); padding: 12px 0;
        }
        .sb-item {
          padding: 8px 15px; font-size: 8px; font-family: 'DM Mono', monospace;
          letter-spacing: 1.2px; color: var(--t3);
          display: flex; align-items: center; gap: 7px; cursor: pointer; transition: all .15s;
        }
        .sb-item.on { color: var(--g); background: var(--g-dim); }
        .sb-dot { width: 3px; height: 3px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
        .term-main { padding: 20px; background: var(--bg); }
        .tm-title { font-size: 13px; font-weight: 600; letter-spacing: -0.2px; margin-bottom: 2px; }
        .tm-sub { font-size: 8px; font-family: 'DM Mono', monospace; letter-spacing: 2px; color: var(--t3); margin-bottom: 14px; }
        .bias-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 13px; }
        .bias-chip {
          padding: 4px 10px; border-radius: 4px; font-size: 8px;
          font-family: 'DM Mono', monospace; letter-spacing: 0.5px;
          display: flex; align-items: center; gap: 4px; border: 1px solid;
        }
        .chip-bull { background: rgba(34,197,94,0.07); border-color: rgba(34,197,94,0.2); color: var(--g); }
        .chip-bear { background: rgba(239,68,68,0.07); border-color: rgba(239,68,68,0.2); color: var(--red); }
        .chip-neut { background: rgba(245,158,11,0.07); border-color: rgba(245,158,11,0.2); color: var(--amber); }
        .tm-chart {
          height: 150px; background: var(--bg-card);
          border: 1px solid var(--border); border-radius: 6px;
          overflow: hidden; margin-bottom: 12px;
        }
        .tm-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 6px; }
        .tm-cell { background: var(--bg-card); border: 1px solid var(--border); border-radius: 5px; padding: 9px 10px; }
        .tm-cell-label { font-size: 6px; font-family: 'DM Mono', monospace; letter-spacing: 1.5px; color: var(--t3); margin-bottom: 4px; }
        .tm-cell-val { font-size: 12px; font-weight: 600; letter-spacing: -0.3px; }
        .tm-cell-chg { font-size: 8px; font-family: 'DM Mono', monospace; margin-top: 2px; }

        /* ── FEATURES GRID ─────────────────────────────────────────── */
        .feat-grid {
          display: grid; grid-template-columns: repeat(3,1fr);
          gap: 1px; max-width: 980px; margin: 0 auto;
          background: var(--border-sub);
          border: 1px solid var(--border-sub); border-radius: var(--r-lg); overflow: hidden;
        }
        .feat-card {
          background: var(--bg-card); padding: 34px 28px;
          position: relative; transition: background .2s;
        }
        .feat-card:hover { background: var(--bg-raised); }
        .feat-icon-box {
          width: 38px; height: 38px; border-radius: 8px;
          background: var(--g-dim); border: 1px solid var(--g-border);
          display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
        }
        .feat-title { font-size: 14px; font-weight: 600; letter-spacing: -0.015em; margin-bottom: 8px; color: var(--t1); }
        .feat-desc { font-size: 13px; line-height: 1.65; color: var(--t2); }

        /* ── WHY / COMPARISON ──────────────────────────────────────── */
        .why-inner { max-width: 940px; margin: 0 auto; }
        .why-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: start; }
        .why-left {}
        .why-h {
          font-size: clamp(22px, 2.8vw, 34px); font-weight: 700;
          letter-spacing: -0.025em; line-height: 1.22; margin-bottom: 16px;
        }
        .why-h em { color: var(--g-text); font-style: normal; }
        .why-p { font-size: 14px; line-height: 1.8; color: var(--t2); margin-bottom: 22px; }
        .why-cta {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 13px; font-weight: 600; color: var(--g);
          padding: 10px 20px; border-radius: 8px;
          border: 1px solid var(--g-border); background: var(--g-dim);
          transition: all .15s; cursor: pointer;
        }
        .why-cta:hover { background: rgba(34,197,94,0.14); }
        .cmp-table { border: 1px solid var(--border); border-radius: var(--r-lg); overflow: hidden; }
        .cmp-head { display: grid; grid-template-columns: 1fr 1fr; background: var(--bg-raised); }
        .cmp-head-cell {
          padding: 11px 16px; font-size: 9px;
          font-family: 'DM Mono', monospace; letter-spacing: 2px;
        }
        .cmp-head-cell:first-child { border-right: 1px solid var(--border); color: var(--t3); }
        .cmp-head-cell:last-child { color: var(--g); }
        .cmp-row { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid var(--border-sub); }
        .cmp-cell {
          padding: 11px 16px; font-size: 12px;
          display: flex; align-items: center; gap: 7px; line-height: 1.4;
        }
        .cmp-cell:first-child { border-right: 1px solid var(--border-sub); color: var(--t3); }
        .cmp-cell:last-child { color: var(--t1); background: rgba(34,197,94,0.025); }

        /* ── PRICING ───────────────────────────────────────────────── */
        .pricing-grid {
          display: grid; grid-template-columns: repeat(3,1fr);
          gap: 14px; max-width: 840px; margin: 0 auto;
        }
        .p-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--r-lg); padding: 30px 26px;
          display: flex; flex-direction: column;
          position: relative; transition: border-color .2s;
        }
        .p-card.featured {
          border-color: var(--g-border);
          background: linear-gradient(155deg, rgba(34,197,94,0.05) 0%, var(--bg-card) 55%);
        }
        .p-badge {
          position: absolute; top: -1px; left: 50%; transform: translateX(-50%);
          background: var(--g); color: #07080d;
          font-size: 8px; font-weight: 600; font-family: 'DM Mono', monospace; letter-spacing: 1.5px;
          padding: 3px 12px; border-radius: 0 0 7px 7px;
        }
        .p-icon { margin-bottom: 12px; }
        .p-tier { font-size: 17px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 3px; }
        .p-tagline { font-size: 9px; font-family: 'DM Mono', monospace; color: var(--t3); letter-spacing: 1.5px; margin-bottom: 20px; }
        .p-price { font-size: 40px; font-weight: 700; letter-spacing: -0.04em; line-height: 1; margin-bottom: 2px; }
        .p-price sup { font-size: 16px; vertical-align: top; margin-top: 7px; display: inline-block; }
        .p-price sub { font-size: 12px; font-weight: 400; color: var(--t2); }
        .p-note { font-size: 9px; font-family: 'DM Mono', monospace; color: var(--t3); letter-spacing: 1.2px; margin-bottom: 24px; }
        .p-note em { color: var(--g); font-style: normal; }
        .p-btn {
          width: 100%; padding: 11px; border-radius: 8px;
          font-size: 13px; font-weight: 600; font-family: 'Inter', sans-serif;
          cursor: pointer; transition: all .18s; margin-bottom: 24px;
          border: none; display: block; text-align: center; letter-spacing: 0.1px;
        }
        .pbtn-ghost { background: transparent; border: 1px solid var(--border); color: var(--t2); }
        .pbtn-ghost:hover { border-color: var(--t3); color: var(--t1); }
        .pbtn-green { background: var(--g); color: #07080d; }
        .pbtn-green:hover { background: #4ade80; box-shadow: 0 0 22px var(--g-glow); }
        .pbtn-dim { background: var(--bg-raised); border: 1px solid var(--border); color: var(--t2); }
        .pbtn-dim:hover { background: var(--border); color: var(--t1); }
        .p-feats { list-style: none; flex: 1; }
        .p-feat {
          padding: 7px 0; border-bottom: 1px solid var(--border-sub);
          font-size: 12px; display: flex; align-items: flex-start; gap: 8px;
          color: var(--t2); line-height: 1.5;
        }
        .p-feat:last-child { border-bottom: none; }
        .p-feat.on { color: var(--t1); }
        .pricing-note {
          text-align: center; margin-top: 30px;
          font-size: 11px; font-family: 'DM Mono', monospace; color: var(--t3);
          display: flex; align-items: center; justify-content: center; gap: 22px; flex-wrap: wrap;
        }
        .pricing-note span { display: flex; align-items: center; gap: 5px; }

        /* ── FAQ ───────────────────────────────────────────────────── */
        .faq-wrap { max-width: 660px; margin: 0 auto; }
        details { border-bottom: 1px solid var(--border-sub); }
        details:first-child { border-top: 1px solid var(--border-sub); }
        summary {
          padding: 18px 0; cursor: pointer; list-style: none;
          font-size: 14px; font-weight: 500; color: var(--t1);
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          user-select: none; transition: color .15s;
        }
        summary::-webkit-details-marker { display: none; }
        .faq-chevron { color: var(--t3); transition: transform .22s, color .15s; flex-shrink: 0; }
        details[open] summary { color: var(--g-text); }
        details[open] .faq-chevron { transform: rotate(180deg); color: var(--g); }
        .faq-body { padding: 0 0 18px; font-size: 14px; line-height: 1.8; color: var(--t2); }

        /* ── FINAL CTA ─────────────────────────────────────────────── */
        .final-cta {
          padding: 120px 44px; text-align: center;
          position: relative; overflow: hidden;
          border-top: 1px solid var(--border-sub);
        }
        .final-glow {
          position: absolute; top: -80px; left: 50%; transform: translateX(-50%);
          width: 600px; height: 400px;
          background: radial-gradient(ellipse, rgba(34,197,94,0.07) 0%, transparent 65%);
          pointer-events: none;
        }
        .final-inner { position: relative; z-index: 1; max-width: 540px; margin: 0 auto; }
        .final-h {
          font-size: clamp(26px, 3.8vw, 44px); font-weight: 700;
          letter-spacing: -0.03em; line-height: 1.18; margin-bottom: 18px;
        }
        .final-h em { color: var(--g-text); font-style: normal; }
        .final-sub { font-size: 15px; color: var(--t2); line-height: 1.72; margin-bottom: 38px; }
        .final-actions { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; margin-bottom: 28px; }
        .final-trust { font-size: 12px; color: var(--t3); display: flex; align-items: center; justify-content: center; gap: 18px; flex-wrap: wrap; }
        .final-trust span { display: flex; align-items: center; gap: 5px; }

        /* ── FOOTER ────────────────────────────────────────────────── */
        footer {
          background: var(--bg-card); border-top: 1px solid var(--border-sub);
          padding: 26px 44px;
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;
        }
        .ft-brand { display: flex; align-items: center; gap: 8px; }
        .ft-mark {
          width: 18px; height: 18px;
          background: linear-gradient(135deg, #00C853, #69F0AE);
          border-radius: 4px; display: flex; align-items: center; justify-content: center;
        }
        .ft-name { font-size: 13px; letter-spacing: -0.04em; display: inline-flex; align-items: center; }
        .ft-name .wm-trade { font-weight: 300; color: #fff; }
        .ft-name .wm-x {
          font-weight: 800;
          background: linear-gradient(135deg, #00C853, #69F0AE);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .ft-links { display: flex; gap: 22px; list-style: none; }
        .ft-links a { font-size: 12px; color: var(--t3); transition: color .15s; }
        .ft-links a:hover { color: var(--t1); }
        .ft-copy { font-size: 11px; color: var(--t4); font-family: 'DM Mono', monospace; letter-spacing: 0.5px; }

        /* ── RESPONSIVE ────────────────────────────────────────────── */
        @media (max-width: 900px) {
          .feat-grid { grid-template-columns: repeat(2,1fr); }
          .pricing-grid { grid-template-columns: 1fr; max-width: 380px; margin: 0 auto; }
          .why-grid { grid-template-columns: 1fr; gap: 40px; }
          .term-body { grid-template-columns: 1fr; }
          .term-sidebar { display: none; }
          .tm-grid { grid-template-columns: repeat(2,1fr); }
          .stat-cell { border-right: none; border-bottom: 1px solid var(--border-sub); }
          .stat-cell:last-child { border-bottom: none; }
        }
        @media (max-width: 600px) {
          .nav { padding: 0 18px; }
          .nav-links { display: none; }
          .hero, .sec, .final-cta { padding-left: 20px; padding-right: 20px; }
          .showcase-wrap { padding: 0 20px; }
          .feat-grid { grid-template-columns: 1fr; }
          footer { flex-direction: column; align-items: flex-start; padding: 22px 20px; }
          .ft-links { flex-wrap: wrap; gap: 14px; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="nav">
        <a href="/" className="nav-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="TradeX" className="nav-logo" />
        </a>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#why">Why TradeX</a>
          <a href="#pricing">Pricing</a>
        </div>
        <div className="nav-actions">
          <a href="/login" className="btn-nav-ghost">Sign In</a>
          <a href="/login" className="btn-nav-primary">Get Started <ArrowRight /></a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-inner">
          <div className="hero-badge">
            <div className="badge-dot" />
            Live market intelligence · 24/5
          </div>
          <h1 className="hero-h1">
            The market context<br />
            <em>serious traders rely on.</em>
          </h1>
          <p className="hero-sub">
            Real-time AI analysis, live news catalysts, and institutional-grade data — built for Forex, Gold, and Crypto traders who want to understand the market, not just react to it.
          </p>
          <div className="hero-actions">
            <a href="/login" className="btn-hero">Start Free — No Card Required <ArrowRight /></a>
            <a href="#pricing" className="btn-hero-ghost">View Pricing</a>
          </div>
          <div className="hero-trust">
            {['Free plan available', '7-day trial on paid plans', 'Cancel anytime'].map(t => (
              <div className="trust-item" key={t}><Check /> {t}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="ticker-wrap">
        <div className="ticker-fade-l" /><div className="ticker-fade-r" />
        <div className="ticker-track">
          {[0, 1].map(pass => (
            <div key={pass} style={{ display: 'flex' }}>
              {TICKERS.map(({ sym, price, chg, up }) => (
                <div className="ticker-item" key={sym + pass}>
                  <span className="t-sym">{sym}</span>
                  <span className="t-price">{price}</span>
                  <span className={up ? 't-up' : 't-dn'}>{up ? '▲' : '▼'} {chg}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="stats-row">
        {([['15+', 'LIVE ASSETS'], ['24/5', 'MARKET COVERAGE'], ['9', 'INTELLIGENCE MODULES'], ['$0', 'TO GET STARTED']] as [string, string][]).map(([n, l]) => (
          <div className="stat-cell" key={l}>
            <div className="stat-n">{n}</div>
            <div className="stat-l">{l}</div>
          </div>
        ))}
      </div>

      {/* ── PRODUCT SHOWCASE ── */}
      <section className="sec sec-alt" id="features">
        <div className="sec-head">
          <span className="sec-tag">The Terminal</span>
          <h2 className="sec-h">One dashboard.<br /><em>Complete market clarity.</em></h2>
          <p className="sec-p">Built for traders who trade with context — not just price.</p>
        </div>
        <div className="showcase-wrap">
          <div className="terminal">
            <div className="term-bar">
              <div className="win-dots">
                <div className="win-dot" style={{ background: '#FF5F57' }} />
                <div className="win-dot" style={{ background: '#FEBC2E' }} />
                <div className="win-dot" style={{ background: '#28C840' }} />
              </div>
              <div className="term-url">tradex-ten.vercel.app/dashboard — Secured</div>
            </div>
            <div className="term-nav">
              <div className="tn-brand">
                <div className="tn-mark">
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 900, color: "#080808", lineHeight: 1 }}>X</span>
                </div>
                <span className="tn-name"><span className="wm-trade">trade</span><span className="wm-x">X</span></span>
              </div>
              <div className="tn-prices">
                {[['XAUUSD','4,731','up','+1.65%'],['BTCUSD','67,144','dn','−1.06%'],['EURUSD','1.1551','up','+0.12%'],['DXY','99.79','dn','−0.22%']].map(([s,p,d,c]) => (
                  <div className="tn-tick" key={s}>{s} <b>{p}</b> <span style={{ color: d === 'up' ? 'var(--g)' : 'var(--red)' }}>{c}</span></div>
                ))}
              </div>
              <div className="tn-live"><div className="live-dot" />LIVE</div>
            </div>
            <div className="term-body">
              <div className="term-sidebar">
                {['DASHBOARD','MARKET BIAS','CATALYSTS','ECONOMIC CAL.','POLICY MONITOR','ASSET MATRIX','SESSION INTEL','NEWS FLOW','AI BRIEFING'].map((item, i) => (
                  <div key={item} className={`sb-item${i === 0 ? ' on' : ''}`}>
                    {i === 0 && <div className="sb-dot" />}{item}
                  </div>
                ))}
              </div>
              <div className="term-main">
                <div className="tm-title">Command Center</div>
                <div className="tm-sub">REAL-TIME INTELLIGENCE · NEW YORK SESSION · LIVE</div>
                <div className="bias-row">
                  <div className="bias-chip chip-bull">▲ GOLD BULLISH 72%</div>
                  <div className="bias-chip chip-bear">▼ BTC BEARISH 61%</div>
                  <div className="bias-chip chip-bull">▲ EUR/USD BULLISH 54%</div>
                  <div className="bias-chip chip-neut">— DXY NEUTRAL</div>
                </div>
                <div className="tm-chart">
                  <svg viewBox="0 0 840 150" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                    <defs>
                      <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity=".13"/>
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    {[38,75,112].map(y => <line key={y} x1="0" y1={y} x2="840" y2={y} stroke="#1c1f2e" strokeWidth="1"/>)}
                    <path d="M0,125 C70,120 120,106 185,96 S280,78 338,66 S430,50 488,38 S578,24 636,16 S740,9 840,6 L840,150 L0,150 Z" fill="url(#chart-grad)"/>
                    <path d="M0,125 C70,120 120,106 185,96 S280,78 338,66 S430,50 488,38 S578,24 636,16 S740,9 840,6" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="840" cy="6" r="3" fill="#22c55e"/>
                    <circle cx="840" cy="6" r="7" fill="#22c55e" opacity=".14"/>
                    <rect x="12" y="8" width="154" height="19" rx="3" fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.18)" strokeWidth="1"/>
                    <text x="20" y="21" fontFamily="monospace" fontSize="8" fill="#22c55e" letterSpacing="1">BULLISH · 72% CONVICTION</text>
                  </svg>
                </div>
                <div className="tm-grid">
                  {[['GOLD (XAUUSD)','4,731','▲ +1.65%','var(--g)'],['BITCOIN','67,144','▼ −1.06%','var(--red)'],['EUR/USD','1.1551','▲ +0.12%','var(--g)'],['DXY INDEX','99.79','▼ −0.22%','var(--red)']].map(([l,v,c,col]) => (
                    <div className="tm-cell" key={l}>
                      <div className="tm-cell-label">{l}</div>
                      <div className="tm-cell-val" style={{ color: col }}>{v}</div>
                      <div className="tm-cell-chg" style={{ color: col }}>{c}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="sec">
        <div className="sec-head">
          <span className="sec-tag">Intelligence Modules</span>
          <h2 className="sec-h">Every edge, <em>one platform.</em></h2>
          <p className="sec-p">9 purpose-built modules covering every angle of informed, professional trading.</p>
        </div>
        <div className="feat-grid">
          {FEATURES.map(f => (
            <div className="feat-card" key={f.title}>
              <div className="feat-icon-box">{f.icon}</div>
              <div className="feat-title">{f.title}</div>
              <div className="feat-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHY / COMPARISON ── */}
      <section className="sec sec-alt" id="why">
        <div className="why-inner">
          <div className="why-grid">
            <div className="why-left">
              <span className="sec-tag" style={{ display: 'inline-block', marginBottom: 14 }}>Why TradeX</span>
              <h2 className="why-h">Stop trading blind.<br /><em>Trade with context.</em></h2>
              <p className="why-p">Most traders have price. TradeX gives you the narrative behind it — the news catalysts, AI bias signals, and session intelligence that turn chart patterns into informed decisions.</p>
              <p className="why-p">The difference between a winning trade and a stopped-out one is often 30 seconds of context you didn't have. TradeX closes that gap before every session.</p>
              <a href="/login" className="why-cta">Get started free <ArrowRight /></a>
            </div>
            <div>
              <div className="cmp-table">
                <div className="cmp-head">
                  <div className="cmp-head-cell">WITHOUT TRADEX</div>
                  <div className="cmp-head-cell">WITH TRADEX</div>
                </div>
                {COMPARE_ROWS.map(([bad, good]) => (
                  <div className="cmp-row" key={bad}>
                    <div className="cmp-cell"><Minus />{bad}</div>
                    <div className="cmp-cell"><Check size={12} />{good}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="sec" id="pricing">
        <div className="sec-head">
          <span className="sec-tag">Pricing</span>
          <h2 className="sec-h">Simple plans.<br /><em>Serious value.</em></h2>
          <p className="sec-p">Start free. Upgrade when you're ready. No hidden fees, no lock-in contracts.</p>
        </div>
        <div className="pricing-grid">
          {/* FREE */}
          <div className="p-card">
            <div className="p-icon"><CircleOIcon /></div>
            <div className="p-tier">Free</div>
            <div className="p-tagline">GET STARTED</div>
            <div className="p-price">$0</div>
            <div className="p-note">FOREVER FREE</div>
            <a href="/login" className="p-btn pbtn-ghost">Start for Free</a>
            <ul className="p-feats">
              {FREE_FEATURES.map(([on, feat]) => (
                <li key={feat} className={`p-feat${on ? ' on' : ''}`}>
                  {on ? <Check size={12} /> : <Minus />}{feat}
                </li>
              ))}
            </ul>
          </div>
          {/* PRO */}
          <div className="p-card featured">
            <div className="p-badge">MOST POPULAR</div>
            <div className="p-icon"><ZapGreenIcon /></div>
            <div className="p-tier">Pro</div>
            <div className="p-tagline">FULL TERMINAL</div>
            <div className="p-price"><sup>$</sup>29<sub>/mo</sub></div>
            <div className="p-note"><em>7-day free trial</em> · Cancel anytime</div>
            <a href="/pricing" className="p-btn pbtn-green">Start Free Trial</a>
            <ul className="p-feats">
              {PRO_FEATURES.map(feat => (
                <li key={feat} className="p-feat on"><Check size={12} />{feat}</li>
              ))}
            </ul>
          </div>
          {/* ELITE */}
          <div className="p-card">
            <div className="p-icon"><StarIcon /></div>
            <div className="p-tier">Elite</div>
            <div className="p-tagline">MAXIMUM EDGE</div>
            <div className="p-price"><sup>$</sup>99<sub>/mo</sub></div>
            <div className="p-note"><em>7-day free trial</em> · Cancel anytime</div>
            <a href="/pricing" className="p-btn pbtn-dim">Get Elite Access</a>
            <ul className="p-feats">
              {ELITE_FEATURES.map(feat => (
                <li key={feat} className="p-feat on"><Check size={12} />{feat}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="pricing-note">
          {['Secure payments via PayPal', 'Cancel anytime', '7-day free trial', 'No hidden fees'].map(n => (
            <span key={n}><Check size={11} /> {n}</span>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="sec sec-alt">
        <div className="sec-head">
          <span className="sec-tag">FAQ</span>
          <h2 className="sec-h">Common questions.</h2>
        </div>
        <div className="faq-wrap">
          {FAQS.map(({ q, a }) => (
            <details key={q}>
              <summary>
                {q}
                <span className="faq-chevron"><ChevronDown /></span>
              </summary>
              <div className="faq-body">{a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="final-cta">
        <div className="final-glow" />
        <div className="final-inner">
          <span className="sec-tag" style={{ display: 'block', marginBottom: 16 }}>Start Today</span>
          <h2 className="final-h">Trade with the context<br /><em>your competition doesn't have.</em></h2>
          <p className="final-sub">Join traders using TradeX to understand markets before they move — not after. Free to start, no credit card required.</p>
          <div className="final-actions">
            <a href="/login" className="btn-hero">Start Free — No Card Required <ArrowRight /></a>
            <a href="#pricing" className="btn-hero-ghost">Compare Plans</a>
          </div>
          <div className="final-trust">
            {['Free plan available', '7-day trial on Pro & Elite', 'Cancel anytime'].map(t => (
              <span key={t}><Check size={11} /> {t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer>
        <div className="ft-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="TradeX" style={{ height: 28, width: "auto", objectFit: "contain" }} />
        </div>
        <ul className="ft-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#why">Why TradeX</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="/login">Login</a></li>
        </ul>
        <span className="ft-copy">© 2025 TradeX · Market Intelligence Terminal</span>
      </footer>
    </>
  )
}
