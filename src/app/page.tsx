import React from 'react'

// ── Premium SVG icon components ──────────────────────────────
const Icon = ({ d, size = 18, color = '#00C853' }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
)
const IconPoly = ({ points, size = 18, color = '#00C853' }: { points: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points={points}/>
  </svg>
)
const ArrowRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)
const Check = ({ color = '#00C853' }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const Cross = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2a2a2a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

// Feature icons
const TrendingUp = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
const Brain    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.84A2.5 2.5 0 0 1 9.5 2"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.84A2.5 2.5 0 0 0 14.5 2"/></svg>
const Calendar = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
const Zap      = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
const Shield   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
const Clock    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const Grid     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
const BarChart = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
const Monitor  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>

// Plan icons
const CircleIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="9"/></svg>
const ZapGreen   = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
const StarGold   = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>

const FEATURES = [
  { num:'01', icon:<TrendingUp/>, title:'Market Bias Engine',   body:'AI-powered directional conviction per asset. Get a <strong>clear Bullish / Bearish / Neutral signal</strong> with confidence percentage — updated live as news breaks.' },
  { num:'02', icon:<Brain/>,      title:'AI Market Briefing',   body:'<strong>Your daily intelligence report.</strong> AI synthesizes overnight news, macro shifts, and session drivers into one actionable briefing before you trade.' },
  { num:'03', icon:<Calendar/>,   title:'Economic Calendar',    body:'Not just a calendar — <strong>every event comes with AI-generated Gold and USD impact analysis.</strong> Know what to expect before the number drops.' },
  { num:'04', icon:<Zap/>,        title:'Catalysts & News Flow',body:'Live market-moving events categorized by impact. <strong>Central banks. Geopolitics. Inflation. Crypto.</strong> Filtered so you only see what matters.' },
  { num:'05', icon:<Shield/>,     title:'Trump Monitor',        body:'Real-time tracking of policy signals and statements. <strong>Impact score, affected assets, sentiment</strong> — know before markets react.' },
  { num:'06', icon:<Clock/>,      title:'Session Intelligence', body:"Asia. London. New York. <strong>Know which session you're in</strong>, expected volatility behavior, and optimal windows per asset class." },
  { num:'07', icon:<Grid/>,       title:'Asset Matrix',         body:'Cross-market correlations and macro regime overview. <strong>Risk sentiment, rate regime, USD regime</strong> — see the macro picture instantly.' },
  { num:'08', icon:<BarChart/>,   title:'Live Charts',          body:'TradingView-powered charts for <strong>Gold, Forex, Crypto, and Indices.</strong> Real-time prices with full charting tools — all inside the terminal.' },
  { num:'09', icon:<Monitor/>,    title:'Command Center',       body:'The <strong>mission control of your trading day.</strong> All key signals, bias, and narrative — in one view, updated in real time.' },
]

const FREE_FEATS  = [[true,'5 tracked assets'],[true,'Delayed prices (15 min)'],[true,'Basic economic calendar'],[true,'Limited news feed'],[false,'AI Briefing'],[false,'Market Bias Engine'],[false,'Trump Monitor'],[false,'Session Intelligence']]
const PRO_FEATS   = ['All assets — Gold, Forex, Crypto','Real-time live prices','Full economic calendar + analysis','AI Market Briefing','Market Bias Engine','Trump Monitor','Session Intelligence','Catalysts + News Flow']
const ELITE_FEATS = ['Everything in Pro','Priority data feeds','Advanced AI analysis','Asset Matrix (full)','Custom alerts','Mobile APK access','Priority support','Early access to features']

const COMPARE = [
  ['Guess why price moved',       'See news on the candle'],
  ['No direction before entry',   'AI bias + conviction %'],
  ['React to news late',          'Catalyst feed — live'],
  ['Tab-switch for calendar',     'Calendar with AI analysis'],
  ['Miss Trump market moves',     'Trump Monitor — live'],
  ['Trade the wrong session',     'Session intelligence guide'],
]

const TICKERS = ['XAUUSD·4,731·+1.65%·up','BTCUSD·67,144·-1.06%·dn','EURUSD·1.1551·+0.12%·up','GBPUSD·1.3255·+0.08%·up','USOIL·85.41·+0.21%·up','ETHUSD·2,095·+0.04%·up','USDJPY·159.20·-0.08%·dn','DXY·99.79·-0.22%·dn']

export default function LandingPage() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet"/>
      <style>{`
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
        html{scroll-behavior:smooth}
        :root{
          --g:#00C853;--g2:#00E676;--g-dim:rgba(0,200,83,.18);--g-faint:rgba(0,200,83,.06);
          --bg:#050505;--bg2:#090909;--bg3:#0d0d0d;
          --b1:#111111;--b2:#1a1a1a;--b3:#242424;
          --t1:#ffffff;--t2:#aaaaaa;--t3:#555555;
          --red:#FF3B3B;--gold:#F5A623;
        }
        body{background:var(--bg);color:var(--t1);font-family:'Inter',sans-serif;overflow-x:hidden;-webkit-font-smoothing:antialiased}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:var(--bg)}
        ::-webkit-scrollbar-thumb{background:var(--b2);border-radius:2px}
        a{text-decoration:none;color:inherit}

        /* NAV */
        .nav{position:fixed;top:0;left:0;right:0;z-index:500;height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 48px;border-bottom:1px solid var(--b1);background:rgba(5,5,5,.9);backdrop-filter:blur(24px)}
        .nav-brand{display:flex;align-items:center;gap:10px}
        .nav-icon{width:28px;height:28px;background:var(--g);border-radius:5px;display:flex;align-items:center;justify-content:center}
        .nav-name{font-size:15px;font-weight:700;letter-spacing:-0.02em}
        .nav-name em{color:var(--g);font-style:normal}
        .nav-links{display:flex;gap:36px}
        .nav-links a{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;color:var(--t3);transition:color .2s}
        .nav-links a:hover{color:var(--t1)}
        .nav-right{display:flex;gap:10px}
        .btn-ghost{background:transparent;border:1px solid var(--b2);color:var(--t2);font-size:11px;padding:8px 18px;border-radius:5px;font-family:'Inter',sans-serif;font-weight:600;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center}
        .btn-ghost:hover{border-color:var(--b3);color:var(--t1)}
        .btn-green{background:var(--g);color:#050505;font-size:12px;padding:9px 20px;border-radius:5px;font-family:'Inter',sans-serif;font-weight:600;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:6px;border:none}
        .btn-green:hover{background:var(--g2);box-shadow:0 0 28px var(--g-dim);transform:translateY(-1px)}

        /* HERO */
        .hero{position:relative;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:120px 48px 64px;text-align:center;overflow:hidden}
        .hero-grid{position:absolute;inset:0;background-image:linear-gradient(var(--b1) 1px,transparent 1px),linear-gradient(90deg,var(--b1) 1px,transparent 1px);background-size:72px 72px;animation:drift 80s linear infinite}
        @keyframes drift{0%{background-position:0 0}100%{background-position:72px 72px}}
        .hero-glow{position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);width:800px;height:500px;background:radial-gradient(ellipse,rgba(0,200,83,.1) 0%,transparent 65%);pointer-events:none}
        .hero-corner{position:absolute;width:100px;height:100px;pointer-events:none}
        .tl{top:80px;left:48px;border-top:1px solid var(--b2);border-left:1px solid var(--b2)}
        .tr{top:80px;right:48px;border-top:1px solid var(--b2);border-right:1px solid var(--b2)}
        .hero-inner{position:relative;z-index:2;max-width:800px}
        .pill{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--b2);background:rgba(13,13,13,.95);padding:6px 16px;border-radius:100px;margin-bottom:40px;animation:up .7s ease both}
        .pill-dot{width:6px;height:6px;border-radius:50%;background:var(--g);animation:pulse 2s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 6px var(--g)}50%{opacity:.3;box-shadow:none}}
        .pill-text{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;color:var(--g)}
        .hero-h1{font-size:clamp(48px,7vw,72px);font-weight:700;line-height:1.1;letter-spacing:-0.02em;margin-bottom:24px;animation:up .7s .1s ease both;opacity:0;font-family:'Inter',sans-serif}
        .hero-h1 em{color:var(--g);font-style:normal;display:block}
        .hero-sub{font-family:'DM Mono',monospace;font-size:13px;line-height:1.85;color:var(--t2);max-width:500px;margin:0 auto 44px;animation:up .7s .2s ease both;opacity:0}
        .hero-ctas{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;margin-bottom:52px;animation:up .7s .3s ease both;opacity:0}
        .cta-primary{background:var(--g);color:#050505;font-family:'Inter',sans-serif;font-weight:600;font-size:13px;padding:15px 34px;border-radius:5px;display:inline-flex;align-items:center;gap:8px;transition:all .2s;border:none;cursor:pointer}
        .cta-primary:hover{background:var(--g2);box-shadow:0 0 48px var(--g-dim);transform:translateY(-2px)}
        .cta-ghost{border:1px solid var(--b2);color:var(--t2);font-family:'DM Mono',monospace;font-size:11px;padding:15px 28px;border-radius:5px;letter-spacing:2px;transition:all .2s}
        .cta-ghost:hover{border-color:var(--b3);color:var(--t1)}
        .trust{display:flex;align-items:center;justify-content:center;gap:32px;flex-wrap:wrap;animation:up .7s .4s ease both;opacity:0}
        .trust-item{display:flex;align-items:center;gap:7px;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;color:var(--t3)}
        @keyframes up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}

        /* TICKER */
        .ticker{position:relative;z-index:2;width:100%;margin-top:80px;border-top:1px solid var(--b1);border-bottom:1px solid var(--b1);background:rgba(9,9,9,.95);overflow:hidden;animation:up .7s .5s ease both;opacity:0}
        .ticker-fl,.ticker-fr{position:absolute;top:0;bottom:0;width:100px;z-index:3;pointer-events:none}
        .ticker-fl{left:0;background:linear-gradient(to right,var(--bg2),transparent)}
        .ticker-fr{right:0;background:linear-gradient(to left,var(--bg2),transparent)}
        .ticker-track{display:flex;padding:12px 0;animation:scroll 30s linear infinite;width:max-content}
        @keyframes scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .tick{display:flex;align-items:center;gap:8px;padding:0 28px;border-right:1px solid var(--b1);font-family:'DM Mono',monospace;font-size:11px;white-space:nowrap}
        .t-sym{color:var(--t3);font-size:9px;letter-spacing:1px}
        .t-p{color:var(--t1);font-weight:500}
        .t-up{color:var(--g);font-size:9px}
        .t-dn{color:var(--red);font-size:9px}

        /* PROOF */
        .proof{border-top:1px solid var(--b1);border-bottom:1px solid var(--b1);background:var(--bg2);padding:60px 48px;display:flex;align-items:center;justify-content:center;flex-wrap:wrap}
        .proof-stat{flex:1;min-width:140px;max-width:220px;padding:0 40px;text-align:center;border-right:1px solid var(--b1)}
        .proof-stat:last-child{border-right:none}
        .proof-n{font-size:40px;font-weight:700;letter-spacing:-0.02em;line-height:1;margin-bottom:8px;color:var(--t1)}
        .proof-n span{color:var(--g)}
        .proof-l{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;color:var(--t3)}

        /* SECTION HEADER */
        .sh{text-align:center;margin-bottom:72px}
        .tag{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:4px;color:var(--g);display:block;margin-bottom:14px}
        .sh h2{font-size:clamp(32px,4.5vw,54px);font-weight:700;letter-spacing:-0.02em;line-height:1.1}
        .sh h2 em{color:var(--g);font-style:normal}
        .sh p{font-family:'DM Mono',monospace;font-size:12px;color:var(--t2);margin-top:14px;line-height:1.8}

        /* PREVIEW */
        .preview{padding:120px 48px;position:relative;overflow:hidden}
        .preview::before{content:'';position:absolute;top:-200px;left:50%;transform:translateX(-50%);width:900px;height:600px;background:radial-gradient(ellipse,var(--g-faint) 0%,transparent 65%);pointer-events:none}

        /* TERMINAL SHELL */
        .shell{max-width:1000px;margin:0 auto;border:1px solid var(--b2);border-radius:12px;overflow:hidden;box-shadow:0 80px 160px rgba(0,0,0,.85),0 0 100px var(--g-faint)}
        .shell-bar{background:var(--bg3);border-bottom:1px solid var(--b1);padding:11px 18px;display:flex;align-items:center;gap:14px}
        .s-dots{display:flex;gap:6px}
        .s-dot{width:10px;height:10px;border-radius:50%}
        .s-url{flex:1;background:var(--bg);border-radius:4px;padding:5px 14px;font-family:'DM Mono',monospace;font-size:9px;color:var(--t3)}
        .shell-nav{background:var(--bg3);border-bottom:1px solid var(--b1);padding:9px 18px;display:flex;align-items:center}
        .s-logo{display:flex;align-items:center;gap:8px;padding-right:24px;border-right:1px solid var(--b1);margin-right:18px}
        .s-logo-icon{width:20px;height:20px;background:var(--g);border-radius:4px;display:flex;align-items:center;justify-content:center}
        .s-logo-name{font-size:12px;font-weight:700;letter-spacing:-.3px}
        .s-logo-name em{color:var(--g);font-style:normal}
        .s-ticks{display:flex;flex:1;overflow:hidden}
        .s-tick{padding:0 16px;border-right:1px solid var(--b1);font-family:'DM Mono',monospace;font-size:9px;display:flex;align-items:center;gap:6px;color:var(--t3);white-space:nowrap}
        .s-tick b{color:var(--t1);font-weight:500}
        .s-badges{display:flex;gap:8px;margin-left:auto}
        .s-badge{font-family:'DM Mono',monospace;font-size:8px;letter-spacing:2px;padding:3px 10px;border-radius:3px;display:flex;align-items:center;gap:5px}
        .s-live{border:1px solid rgba(0,200,83,.3);color:var(--g)}
        .s-geo{background:rgba(245,166,35,.08);border:1px solid rgba(245,166,35,.2);color:var(--gold)}
        .live-dot{width:4px;height:4px;border-radius:50%;background:var(--g);animation:pulse 1.5s infinite}
        .shell-body{display:grid;grid-template-columns:178px 1fr;min-height:400px;background:var(--bg2)}
        .s-sidebar{background:var(--bg3);border-right:1px solid var(--b1);padding:14px 0}
        .sb{padding:9px 18px;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;color:var(--t3);display:flex;align-items:center;gap:9px;cursor:pointer;transition:all .15s}
        .sb:hover{color:var(--t2)}
        .sb.on{color:var(--g);background:var(--g-faint)}
        .sb-dot{width:4px;height:4px;border-radius:50%;background:var(--g);flex-shrink:0}
        .s-content{padding:22px}
        .s-title{font-size:15px;font-weight:700;letter-spacing:-.3px;margin-bottom:4px}
        .s-sub{font-family:'DM Mono',monospace;font-size:8px;letter-spacing:2px;color:var(--t3);margin-bottom:18px}
        .bias-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
        .bc{padding:6px 13px;border-radius:4px;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;display:flex;align-items:center;gap:6px;border:1px solid}
        .bc-bull{background:rgba(0,200,83,.07);border-color:rgba(0,200,83,.2);color:var(--g)}
        .bc-bear{background:rgba(255,59,59,.07);border-color:rgba(255,59,59,.2);color:var(--red)}
        .bc-neut{background:rgba(245,166,35,.07);border-color:rgba(245,166,35,.2);color:var(--gold)}
        .mini-chart{background:var(--bg);border:1px solid var(--b1);border-radius:6px;height:180px;overflow:hidden;margin-bottom:14px}
        .data-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
        .dc{background:var(--bg);border:1px solid var(--b1);border-radius:6px;padding:11px 13px;transition:border-color .2s}
        .dc:hover{border-color:var(--b2)}
        .dc-l{font-family:'DM Mono',monospace;font-size:7px;letter-spacing:2px;color:var(--t3);margin-bottom:5px}
        .dc-v{font-size:14px;font-weight:700;letter-spacing:-.3px}
        .dc-c{font-family:'DM Mono',monospace;font-size:8px;margin-top:3px}

        /* FEATURES */
        .features{padding:120px 48px;background:var(--bg2);border-top:1px solid var(--b1);border-bottom:1px solid var(--b1)}
        .feat-grid{max-width:1000px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--b1);border:1px solid var(--b1);border-radius:12px;overflow:hidden}
        .feat-card{background:var(--bg2);padding:38px 34px;position:relative;overflow:hidden;transition:background .25s}
        .feat-card:hover{background:var(--bg3)}
        .feat-card::after{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--g),transparent);opacity:0;transition:opacity .3s}
        .feat-card:hover::after{opacity:1}
        .feat-num{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;color:var(--b3);margin-bottom:22px}
        .feat-icon{width:42px;height:42px;border-radius:9px;background:var(--g-faint);border:1px solid rgba(0,200,83,.12);display:flex;align-items:center;justify-content:center;margin-bottom:18px}
        .feat-title{font-size:15px;font-weight:700;letter-spacing:-0.02em;margin-bottom:10px}
        .feat-body{font-family:'DM Mono',monospace;font-size:10.5px;line-height:1.8;color:var(--t2)}
        .feat-body strong{color:var(--t1);font-weight:500}

        /* WHY */
        .why{padding:120px 48px}
        .why-inner{max-width:960px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
        .why-h{font-size:clamp(28px,3.5vw,46px);font-weight:700;letter-spacing:-0.02em;line-height:1.1;margin-bottom:22px}
        .why-h em{color:var(--g);font-style:normal}
        .why-p{font-family:'DM Mono',monospace;font-size:11px;line-height:1.9;color:var(--t2);margin-bottom:28px}
        .compare{border:1px solid var(--b1);border-radius:12px;overflow:hidden}
        .cmp-head{display:grid;grid-template-columns:1fr 1fr;background:var(--bg3)}
        .cmp-h{padding:13px 18px;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;text-align:center;border-bottom:1px solid var(--b1)}
        .cmp-h:first-child{border-right:1px solid var(--b1);color:var(--t3)}
        .cmp-h:last-child{color:var(--g)}
        .cmp-row{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--b1)}
        .cmp-row:last-child{border-bottom:none}
        .cmp-cell{padding:13px 18px;font-family:'DM Mono',monospace;font-size:10px;display:flex;align-items:center;gap:9px;line-height:1.4}
        .cmp-cell:first-child{border-right:1px solid var(--b1);color:var(--t3)}
        .cmp-cell:last-child{color:var(--t1);background:var(--g-faint)}

        /* PRICING */
        .pricing{padding:120px 48px;background:var(--bg2);border-top:1px solid var(--b1)}
        .pricing-grid{max-width:880px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .pc{background:var(--bg);border:1px solid var(--b1);border-radius:12px;padding:34px 30px;position:relative;transition:border-color .2s;display:flex;flex-direction:column}
        .pc:hover{border-color:var(--b2)}
        .pc.pro{border-color:rgba(0,200,83,.28);background:linear-gradient(160deg,rgba(0,200,83,.04) 0%,var(--bg) 60%)}
        .pc.pro::before{content:'MOST POPULAR';position:absolute;top:-1px;left:50%;transform:translateX(-50%);background:var(--g);color:#050505;font-family:'DM Mono',monospace;font-size:7.5px;font-weight:700;letter-spacing:2.5px;padding:4px 14px;border-radius:0 0 6px 6px}
        .pc-icon{margin-bottom:16px}
        .pc-tier{font-size:20px;font-weight:700;letter-spacing:-0.02em;margin-bottom:4px}
        .pc-desc{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;color:var(--t3);margin-bottom:24px}
        .pc-price{font-size:46px;font-weight:700;letter-spacing:-0.02em;line-height:1;margin-bottom:2px}
        .pc-price sup{font-size:18px;vertical-align:top;margin-top:10px;display:inline-block;letter-spacing:0}
        .pc-price sub{font-size:13px;font-weight:400;letter-spacing:0;color:var(--t2)}
        .pc-trial{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;color:var(--t3);margin-bottom:28px}
        .pc-trial span{color:var(--g)}
        .pc-btn{width:100%;padding:13px;border-radius:6px;font-family:'Inter',sans-serif;font-weight:600;font-size:12px;letter-spacing:.3px;cursor:pointer;transition:all .2s;margin-bottom:28px;border:none;display:block;text-align:center}
        .pbo{background:transparent;border:1px solid var(--b2);color:var(--t2)}
        .pbo:hover{border-color:var(--b3);color:var(--t1)}
        .pbg{background:var(--g);color:#050505}
        .pbg:hover{background:var(--g2);box-shadow:0 0 28px var(--g-dim)}
        .pbd{background:var(--bg3);border:1px solid var(--b2);color:var(--t2)}
        .pbd:hover{background:var(--b1);color:var(--t1)}
        .pc-feats{list-style:none;flex:1}
        .pf{padding:9px 0;border-bottom:1px solid var(--b1);font-family:'DM Mono',monospace;font-size:9.5px;display:flex;align-items:flex-start;gap:9px;color:var(--t2);line-height:1.5}
        .pf:last-child{border-bottom:none}
        .pf.on{color:var(--t1)}
        .pnote{text-align:center;margin-top:36px;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;color:var(--t3);display:flex;align-items:center;justify-content:center;gap:28px;flex-wrap:wrap}
        .pnote span{display:flex;align-items:center;gap:7px;color:var(--t3)}

        /* FINAL CTA */
        .fcta{padding:140px 48px;text-align:center;position:relative;overflow:hidden;border-top:1px solid var(--b1)}
        .fcta::before{content:'';position:absolute;top:-150px;left:50%;transform:translateX(-50%);width:900px;height:600px;background:radial-gradient(ellipse,rgba(0,200,83,.09) 0%,transparent 65%);pointer-events:none}
        .fc-inner{position:relative;z-index:2}
        .fc-h{font-size:clamp(38px,6vw,76px);font-weight:700;letter-spacing:-0.02em;line-height:1.05;margin-bottom:22px;font-family:'Inter',sans-serif}
        .fc-h em{color:var(--g);font-style:normal}
        .fc-sub{font-family:'DM Mono',monospace;font-size:12px;color:var(--t2);letter-spacing:.5px;margin-bottom:48px;max-width:460px;margin-left:auto;margin-right:auto;line-height:1.8}
        .fc-btns{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;margin-bottom:40px}
        .fc-trust{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;color:var(--t3);display:flex;align-items:center;justify-content:center;gap:24px;flex-wrap:wrap}
        .fc-trust span{display:flex;align-items:center;gap:6px}

        /* FOOTER */
        footer{background:var(--bg2);border-top:1px solid var(--b1);padding:32px 48px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
        .ft-brand{display:flex;align-items:center;gap:8px}
        .ft-icon{width:20px;height:20px;background:var(--g);border-radius:4px;display:flex;align-items:center;justify-content:center}
        .ft-name{font-size:13px;font-weight:700}
        .ft-name em{color:var(--g);font-style:normal}
        .ft-links{display:flex;gap:28px;list-style:none}
        .ft-links a{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;color:var(--t3);transition:color .2s}
        .ft-links a:hover{color:var(--t1)}
        .ft-copy{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;color:var(--b3)}

        /* RESPONSIVE */
        @media(max-width:960px){.feat-grid{grid-template-columns:repeat(2,1fr)}.pricing-grid{grid-template-columns:1fr;max-width:400px;margin:0 auto}.why-inner{grid-template-columns:1fr;gap:52px}.shell-body{grid-template-columns:1fr}.s-sidebar{display:none}.data-row{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:640px){.nav{padding:0 20px}.nav-links{display:none}.hero,.preview,.features,.why,.pricing,.fcta{padding:80px 20px}.hero-corner{display:none}.proof{padding:40px 20px}.feat-grid{grid-template-columns:1fr}footer{padding:24px 20px;flex-direction:column;text-align:center}.ft-links{justify-content:center;flex-wrap:wrap}}
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <div className="nav-brand">
          <div className="nav-icon">
            <Icon d="M3 18 9 12 13 16 21 6" color="#050505" size={14}/>
          </div>
          <span className="nav-name">trade<em>X</em></span>
        </div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#why">Why TradeX</a>
          <a href="#pricing">Pricing</a>
          <a href="/login">Login</a>
        </div>
        <div className="nav-right">
          <a href="/login" className="btn-ghost">Sign In</a>
          <a href="/login" className="btn-green">Start Free <ArrowRight/></a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-grid"/>
        <div className="hero-glow"/>
        <div className="hero-corner tl"/>
        <div className="hero-corner tr"/>
        <div className="hero-inner">
          <div className="pill">
            <div className="pill-dot"/>
            <span className="pill-text">Live market intelligence — 24/5</span>
          </div>
          <h1 className="hero-h1">
            The market moves<br/>before you see it.
            <em>Now you go first.</em>
          </h1>
          <p className="hero-sub">Real-time AI analysis. Live news context. Institutional-grade data — for Forex, Gold, and Crypto traders who refuse to be late.</p>
          <div className="hero-ctas">
            <a href="/login" className="cta-primary">Start Free — No Card Required <ArrowRight/></a>
            <a href="#pricing" className="cta-ghost">VIEW PRICING</a>
          </div>
          <div className="trust">
            {['REAL-TIME DATA','AI-POWERED ANALYSIS','CANCEL ANYTIME','7-DAY FREE TRIAL'].map(t => (
              <div className="trust-item" key={t}><Check/>{t}</div>
            ))}
          </div>
        </div>
        <div className="ticker">
          <div className="ticker-fl"/><div className="ticker-fr"/>
          <div className="ticker-track">
            {[...Array(2)].map((_,i) => (
              <div key={i} style={{display:'flex'}}>
                {TICKERS.map(t => {
                  const [sym,p,chg,dir] = t.split('·')
                  return (
                    <div className="tick" key={sym+i}>
                      <span className="t-sym">{sym}</span>
                      <span className="t-p">{p}</span>
                      <span className={dir==='up'?'t-up':'t-dn'}>{dir==='up'?'▲':'▼'} {chg}</span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROOF */}
      <section className="proof">
        {[['15','+ LIVE ASSETS'],['24','/5 DATA FEED'],['10','+ MODULES'],['$0','TO START']].map(([n,l]) => (
          <div className="proof-stat" key={l}>
            <div className="proof-n"><span>{n}</span></div>
            <div className="proof-l">{l}</div>
          </div>
        ))}
      </section>

      {/* TERMINAL PREVIEW */}
      <section className="preview" id="features">
        <div className="sh">
          <span className="tag">THE TERMINAL</span>
          <h2>One dashboard.<br/><em>Total clarity.</em></h2>
          <p>Built for traders who trade news, not just charts.</p>
        </div>
        <div className="shell">
          <div className="shell-bar">
            <div className="s-dots">
              <div className="s-dot" style={{background:'#FF5F57'}}/>
              <div className="s-dot" style={{background:'#FEBC2E'}}/>
              <div className="s-dot" style={{background:'#28C840'}}/>
            </div>
            <div className="s-url">tradex-ten.vercel.app/dashboard · Secured</div>
          </div>
          <div className="shell-nav">
            <div className="s-logo">
              <div className="s-logo-icon"><Icon d="M3 18 9 12 13 16 21 6" color="#050505" size={11}/></div>
              <span className="s-logo-name">trade<em>X</em></span>
            </div>
            <div className="s-ticks">
              {[['XAUUSD','4,731','up','+1.65%'],['BTCUSD','67,144','dn','−1.06%'],['EURUSD','1.1551','up','+0.12%'],['DXY','99.79','dn','−0.22%']].map(([s,p,d,c]) => (
                <div className="s-tick" key={s}>{s} <b>{p}</b> <span style={{color:d==='up'?'var(--g)':'var(--red)'}}>{c}</span></div>
              ))}
            </div>
            <div className="s-badges">
              <div className="s-badge s-live"><div className="live-dot"/>LIVE</div>
              <div className="s-badge s-geo">GEOPOLITICAL</div>
            </div>
          </div>
          <div className="shell-body">
            <div className="s-sidebar">
              {['DASHBOARD','MARKET BIAS','CATALYSTS','ECONOMIC CAL.','TRUMP MONITOR','ASSET MATRIX','SESSION INTEL','NEWS FLOW','AI BRIEFING'].map((item,i) => (
                <div key={item} className={`sb${i===0?' on':''}`}>{i===0&&<div className="sb-dot"/>}{item}</div>
              ))}
            </div>
            <div className="s-content">
              <div className="s-title">Command Center</div>
              <div className="s-sub">REAL-TIME MARKET INTELLIGENCE · LIVE · NEW YORK SESSION</div>
              <div className="bias-row">
                <div className="bc bc-bull"><IconPoly points="23 6 13.5 15.5 8.5 10.5 1 18" size={10}/> GOLD — BULLISH 59%</div>
                <div className="bc bc-bear"><IconPoly points="1 18 13.5 8.5 8.5 13.5 23 6" size={10}/> BTC — BEARISH 61%</div>
                <div className="bc bc-bull"><IconPoly points="23 6 13.5 15.5 8.5 10.5 1 18" size={10}/> EUR/USD — BULLISH 54%</div>
                <div className="bc bc-neut" style={{borderColor:'rgba(245,166,35,.2)'}}>— DXY — NEUTRAL</div>
              </div>
              <div className="mini-chart">
                <svg viewBox="0 0 900 180" preserveAspectRatio="none" style={{width:'100%',height:'100%'}}>
                  <defs>
                    <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00C853" stopOpacity=".16"/>
                      <stop offset="100%" stopColor="#00C853" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  {[45,90,135].map(y => <line key={y} x1="0" y1={y} x2="900" y2={y} stroke="#111" strokeWidth="1"/>)}
                  {[225,450,675].map(x => <line key={x} x1={x} y1="0" x2={x} y2="180" stroke="#111" strokeWidth="1"/>)}
                  <path d="M0,140 C60,135 100,120 150,115 S240,100 290,88 S380,72 430,60 S520,48 570,38 S660,22 710,18 S800,10 900,8 L900,180 L0,180 Z" fill="url(#cg)"/>
                  <path d="M0,140 C60,135 100,120 150,115 S240,100 290,88 S380,72 430,60 S520,48 570,38 S660,22 710,18 S800,10 900,8" fill="none" stroke="#00C853" strokeWidth="1.8" strokeLinecap="round"/>
                  <circle cx="900" cy="8" r="3.5" fill="#00C853"/>
                  <circle cx="900" cy="8" r="8" fill="#00C853" opacity=".15"/>
                  <rect x="14" y="10" width="188" height="22" rx="3" fill="rgba(0,200,83,.08)" stroke="rgba(0,200,83,.2)" strokeWidth="1"/>
                  <text x="24" y="25" fontFamily="monospace" fontSize="9" fill="#00C853" letterSpacing="1.5">BULLISH · 59% CONVICTION</text>
                </svg>
              </div>
              <div className="data-row">
                {[['GOLD (XAUUSD)','4,731','▲ +1.65%','var(--g)'],['BITCOIN','67,144','▼ −1.06%','var(--red)'],['EUR/USD','1.1551','▲ +0.12%','var(--g)'],['DXY INDEX','99.79','▼ −0.22%','var(--red)']].map(([l,v,c,col]) => (
                  <div className="dc" key={l}>
                    <div className="dc-l">{l}</div>
                    <div className="dc-v" style={{color:col}}>{v}</div>
                    <div className="dc-c" style={{color:col}}>{c}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features">
        <div className="sh">
          <span className="tag">INTELLIGENCE MODULES</span>
          <h2>Every edge.<br/><em>One platform.</em></h2>
          <p>9 purpose-built modules — everything serious traders need, nothing they don&apos;t.</p>
        </div>
        <div className="feat-grid">
          {FEATURES.map(f => (
            <div className="feat-card" key={f.num}>
              <div className="feat-num">{f.num}</div>
              <div className="feat-icon">{f.icon}</div>
              <div className="feat-title">{f.title}</div>
              <div className="feat-body" dangerouslySetInnerHTML={{__html:f.body}}/>
            </div>
          ))}
        </div>
      </section>

      {/* WHY */}
      <section className="why" id="why">
        <div className="why-inner">
          <div>
            <span className="tag">WHY TRADEX</span>
            <h2 className="why-h">Most traders react.<br/><em>TradeX traders anticipate.</em></h2>
            <p className="why-p">Basic tools give you price. TradeX gives you <strong style={{color:'var(--t1)'}}>context</strong> — the news behind every candle, AI reading the market narrative, and a bias engine telling you direction before you enter.</p>
            <p className="why-p">The difference between a profitable trade and a stop-out is often just <strong style={{color:'var(--t1)'}}>30 seconds of context</strong> you didn&apos;t have. TradeX closes that gap.</p>
            <a href="/login" className="cta-primary" style={{display:'inline-flex',fontSize:'12px',padding:'12px 24px'}}>Get Your Edge <ArrowRight/></a>
          </div>
          <div className="compare">
            <div className="cmp-head">
              <div className="cmp-h">WITHOUT TRADEX</div>
              <div className="cmp-h">WITH TRADEX</div>
            </div>
            {COMPARE.map(([bad,good]) => (
              <div className="cmp-row" key={bad}>
                <div className="cmp-cell"><Cross/>{bad}</div>
                <div className="cmp-cell"><Check/>{good}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing" id="pricing">
        <div className="sh">
          <span className="tag">PRICING</span>
          <h2>Simple plans.<br/><em>Serious edge.</em></h2>
          <p>Start free. Upgrade when you&apos;re ready. Cancel anytime.</p>
        </div>
        <div className="pricing-grid">
          <div className="pc">
            <div className="pc-icon"><CircleIcon/></div>
            <div className="pc-tier">Free</div>
            <div className="pc-desc">GET STARTED</div>
            <div className="pc-price">$0</div>
            <div className="pc-trial">FOREVER FREE</div>
            <a href="/login" className="pc-btn pbo">Start Free</a>
            <ul className="pc-feats">
              {(FREE_FEATS as [boolean,string][]).map(([on,f]) => (
                <li key={f} className={`pf${on?' on':''}`}>{on?<Check/>:<Cross/>}{f}</li>
              ))}
            </ul>
          </div>
          <div className="pc pro">
            <div className="pc-icon"><ZapGreen/></div>
            <div className="pc-tier">Pro</div>
            <div className="pc-desc">FULL TERMINAL</div>
            <div className="pc-price"><sup>$</sup>29<sub>/mo</sub></div>
            <div className="pc-trial"><span>7-day free trial</span> · Cancel anytime</div>
            <a href="/pricing" className="pc-btn pbg">Get Pro — Start Free</a>
            <ul className="pc-feats">
              {PRO_FEATS.map(f => <li key={f} className="pf on"><Check/>{f}</li>)}
            </ul>
          </div>
          <div className="pc">
            <div className="pc-icon"><StarGold/></div>
            <div className="pc-tier">Elite</div>
            <div className="pc-desc">MAXIMUM EDGE</div>
            <div className="pc-price"><sup>$</sup>99<sub>/mo</sub></div>
            <div className="pc-trial"><span>7-day free trial</span> · Cancel anytime</div>
            <a href="/pricing" className="pc-btn pbd">Get Elite Access</a>
            <ul className="pc-feats">
              {ELITE_FEATS.map(f => <li key={f} className="pf on"><Check/>{f}</li>)}
            </ul>
          </div>
        </div>
        <div className="pnote">
          {['SECURE PAYMENTS VIA PAYPAL','CANCEL ANYTIME','7-DAY FREE TRIAL','NO HIDDEN FEES'].map(n => (
            <span key={n}><Check/>{n}</span>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="fcta">
        <div className="fc-inner">
          <span className="tag">THE BOTTOM LINE</span>
          <h2 className="fc-h">Stop reacting.<br/><em>Start trading with intelligence.</em></h2>
          <p className="fc-sub">Every second you trade without context is a second your competition has the edge. Close the gap.</p>
          <div className="fc-btns">
            <a href="/login" className="cta-primary">Start Free — No Card Required <ArrowRight/></a>
            <a href="#pricing" className="cta-ghost">VIEW PLANS</a>
          </div>
          <div className="fc-trust">
            {['FREE TO START','7-DAY TRIAL ON PRO & ELITE','CANCEL ANYTIME'].map(t => (
              <span key={t}><Check/>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="ft-brand">
          <div className="ft-icon"><Icon d="M3 18 9 12 13 16 21 6" color="#050505" size={10}/></div>
          <span className="ft-name">trade<em>X</em></span>
        </div>
        <ul className="ft-links">
          <li><a href="#features">FEATURES</a></li>
          <li><a href="#why">WHY TRADEX</a></li>
          <li><a href="#pricing">PRICING</a></li>
          <li><a href="/login">LOGIN</a></li>
        </ul>
        <span className="ft-copy">© 2025 TRADEX · MARKET INTELLIGENCE TERMINAL</span>
      </footer>
    </>
  )
}
