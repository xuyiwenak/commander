import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// ── 品牌常量 ──────────────────────────────────────────────────────────────────

const COMPANY_CN  = '北京星火耀穹科技有限公司';
const COMPANY_EN  = 'StarrySpark Technology Co., Ltd.';
const ICP_MAIN    = '京ICP备2026019258号';
const ICP_PUBLIC  = '';
const ICP_LINK    = 'https://beian.miit.gov.cn/';
const ICP_PSB_LINK = 'https://beian.mps.gov.cn/';

const MANDIS_ADMIN_URL  = '/login/mandis';
const BEGREAT_ADMIN_URL = '/login/begreat';

// ── Logo Mark SVG ─────────────────────────────────────────────────────────────

function SparkMark({ size = 64 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-36 -36 72 72"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="-36" x2="0" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#ffd166" />
          <stop offset="50%"  stopColor="#f5a623" />
          <stop offset="100%" stopColor="#e8890d" />
        </linearGradient>
      </defs>
      {/* 四角星主体 */}
      <path
        d="M0,-30 C2,-10 10,-2 30,0 C10,2 2,10 0,30 C-2,10 -10,2 -30,0 C-10,-2 -2,-10 0,-30Z"
        fill="url(#spark-grad)"
      />
      {/* 四角装饰点 */}
      <circle cx="18"  cy="-18" r="3.5" fill="#ffd166" opacity="0.8" />
      <circle cx="18"  cy="18"  r="3.5" fill="#ffd166" opacity="0.65" />
      <circle cx="-18" cy="18"  r="3.5" fill="#ffd166" opacity="0.6" />
      <circle cx="-18" cy="-18" r="3.5" fill="#ffd166" opacity="0.8" />
    </svg>
  );
}

function SparkMarkSmall() {
  return (
    <svg width="22" height="22" viewBox="-24 -24 48 48" fill="none" aria-hidden="true">
      <path
        d="M0,-20 C1.5,-6 6,-1.5 20,0 C6,1.5 1.5,6 0,20 C-1.5,6 -6,1.5 -20,0 C-6,-1.5 -1.5,-6 0,-20Z"
        fill="#f5a623"
      />
      <circle cx="13"  cy="-13" r="2.5" fill="#ffd166" opacity="0.75" />
      <circle cx="13"  cy="13"  r="2.5" fill="#ffd166" opacity="0.65" />
      <circle cx="-13" cy="13"  r="2.5" fill="#ffd166" opacity="0.6" />
      <circle cx="-13" cy="-13" r="2.5" fill="#ffd166" opacity="0.75" />
    </svg>
  );
}

// ── Star Field ────────────────────────────────────────────────────────────────

function StarField() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const STAR_COUNT = 110;
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < STAR_COUNT; i++) {
      const el = document.createElement('div');
      const size  = Math.random() * 1.8 + 0.4;
      const dur   = (Math.random() * 4 + 3).toFixed(1);
      const minOp = (Math.random() * 0.15 + 0.04).toFixed(2);
      const maxOp = (Math.random() * 0.45 + 0.25).toFixed(2);
      const delay = (Math.random() * 6).toFixed(1);

      el.style.cssText = [
        'position:absolute',
        'border-radius:50%',
        'background:#fff',
        `width:${size}px`,
        `height:${size}px`,
        `left:${(Math.random() * 100).toFixed(2)}%`,
        `top:${(Math.random() * 100).toFixed(2)}%`,
        `--min-op:${minOp}`,
        `--max-op:${maxOp}`,
        `opacity:${minOp}`,
        `animation:star-twinkle ${dur}s ${delay}s ease-in-out infinite alternate`,
      ].join(';');

      fragment.appendChild(el);
    }

    container.appendChild(fragment);
    return () => { container.innerHTML = ''; };
  }, []);

  return <div ref={ref} style={STAR_FIELD_STYLE} aria-hidden="true" />;
}

// ── Product Card ──────────────────────────────────────────────────────────────

interface ProductCardProps {
  accent: string;
  nameEn: string;
  nameCn: string;
  desc: string;
  adminUrl: string;
  icon: React.ReactNode;
}

function ProductCard({ accent, nameEn, nameCn, desc, adminUrl, icon }: ProductCardProps) {
  const navigate = useNavigate();

  return (
    <div
      style={{ ...CARD_BASE, '--accent': accent } as React.CSSProperties}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = accent;
        el.style.transform = 'translateY(-4px)';
        (el.querySelector('.card-stripe') as HTMLElement).style.opacity = '1';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'rgba(255,255,255,0.08)';
        el.style.transform = 'translateY(0)';
        (el.querySelector('.card-stripe') as HTMLElement).style.opacity = '0';
      }}
    >
      {/* 顶部强调线 */}
      <div
        className="card-stripe"
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 2, background: accent, opacity: 0, transition: 'opacity 0.3s',
        }}
      />

      <div style={CARD_ICON_STYLE}>{icon}</div>
      <div style={{ fontSize: 11, letterSpacing: '0.15em', color: accent, marginBottom: 8, fontWeight: 500 }}>
        {nameEn}
      </div>
      <div style={{ fontSize: 20, fontWeight: 500, color: '#e8eaf0', marginBottom: 14 }}>{nameCn}</div>
      <div style={{ fontSize: 14, lineHeight: 1.75, color: '#7a8399', marginBottom: 32 }}>{desc}</div>

      <button
        onClick={() => navigate(adminUrl)}
        style={{ ...BTN_BASE, borderColor: accent, color: accent }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = accent;
          (e.currentTarget as HTMLElement).style.color = '#fff';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = accent;
        }}
      >
        进入管理后台
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
          <path d="M7 1l5 5-5 5-1.4-1.4L9.2 6 5.6 2.4 7 1z" />
        </svg>
      </button>
    </div>
  );
}

// ── Portal Page ───────────────────────────────────────────────────────────────

export default function Portal() {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const nav = navRef.current;
      if (!nav) return;
      if (window.scrollY > 20) {
        nav.style.background   = 'rgba(7,10,21,0.9)';
        nav.style.backdropFilter = 'blur(12px)';
        nav.style.borderBottomColor = 'rgba(255,255,255,0.08)';
      } else {
        nav.style.background   = 'transparent';
        nav.style.backdropFilter = 'none';
        nav.style.borderBottomColor = 'transparent';
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* CSS 全局动画注入 */}
      <style>{KEYFRAMES}</style>

      <div style={PAGE_STYLE}>
        <StarField />

        {/* ── Nav ── */}
        <nav ref={navRef} style={NAV_STYLE}>
          <div style={NAV_LOGO_STYLE}>
            <SparkMarkSmall />
            <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: '0.04em', color: '#e8eaf0' }}>
              StarrySpark
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#7a8399', letterSpacing: '0.06em' }}>
              {COMPANY_CN}
            </span>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section style={HERO_STYLE}>
          <div style={{ filter: 'drop-shadow(0 0 24px rgba(245,166,35,0.45))', animation: 'pulse-glow 3s ease-in-out infinite alternate', marginBottom: 24 }}>
            <SparkMark size={72} />
          </div>

          <h1 style={HERO_WORDMARK_STYLE}>
            <span style={{ color: '#f5a623', fontWeight: 700 }}>Starry</span>
            <span style={{ fontWeight: 200 }}>Spark</span>
          </h1>
          <p style={HERO_CN_STYLE}>{COMPANY_CN}</p>

          <div style={{ width: 1, height: 56, background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), transparent)', margin: '0 auto' }} />

          <p style={{ fontSize: 15, color: '#7a8399', marginTop: 32, letterSpacing: '0.06em' }}>
            赋能创意与成长的科技力量
          </p>
        </section>

        {/* ── Products ── */}
        <section style={SECTION_STYLE}>
          <p style={LABEL_STYLE}>Management Portal</p>
          <h2 style={SECTION_TITLE_STYLE}>选择管理系统</h2>

          <div style={GRID_STYLE}>
            <ProductCard
              accent="#4dbfb4"
              nameEn="MANDIS"
              nameCn="曼蒂斯艺术工作室"
              adminUrl={MANDIS_ADMIN_URL}
              desc="艺术疗愈与创意教育管理平台，负责用户、作品、课程及反馈的日常运营管理。"
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4dbfb4" strokeWidth="1.5" aria-hidden="true">
                  <path d="M12 19c0 0-7-4.5-7-9a7 7 0 0 1 14 0c0 4.5-7 9-7 9z" />
                  <circle cx="12" cy="10" r="2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              }
            />
            <ProductCard
              accent="#7c6af5"
              nameEn="BEGREAT"
              nameCn="倍可大职业测评"
              adminUrl={BEGREAT_ADMIN_URL}
              desc="基于大五人格的科学职业测评系统，管理用户、测评记录、支付及职业数据配置。"
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c6af5" strokeWidth="1.5" aria-hidden="true">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              }
            />
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={FOOTER_STYLE}>
          <div style={{ fontSize: 12, color: '#4a5168', lineHeight: 1.9 }}>
            <div>© {new Date().getFullYear()} {COMPANY_CN}</div>
            <div style={{ marginTop: 2 }}>{COMPANY_EN}. All rights reserved.</div>
          </div>
          <div style={{ fontSize: 12, color: '#4a5168', lineHeight: 1.9, textAlign: 'right' }}>
            <a href={ICP_LINK} target="_blank" rel="noopener noreferrer" style={{ color: '#4a5168', textDecoration: 'none' }}>
              {ICP_MAIN}
            </a>
            {ICP_PUBLIC && (
              <>
                <br />
                <a href={ICP_PSB_LINK} target="_blank" rel="noopener noreferrer" style={{ color: '#4a5168', textDecoration: 'none' }}>
                  {ICP_PUBLIC}
                </a>
              </>
            )}
          </div>
        </footer>
      </div>
    </>
  );
}

// ── Style Constants ───────────────────────────────────────────────────────────

const KEYFRAMES = `
  @keyframes star-twinkle {
    from { opacity: var(--min-op, 0.05); transform: scale(0.8); }
    to   { opacity: var(--max-op, 0.4);  transform: scale(1.2); }
  }
  @keyframes pulse-glow {
    from { filter: drop-shadow(0 0 16px rgba(245,166,35,0.3)); }
    to   { filter: drop-shadow(0 0 28px rgba(245,166,35,0.6)); }
  }
`;

const STAR_FIELD_STYLE: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
};

const PAGE_STYLE: React.CSSProperties = {
  position: 'relative',
  minHeight: '100vh',
  background: '#070a15',
  color: '#e8eaf0',
  fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif',
  overflowX: 'hidden',
};

const NAV_STYLE: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0, right: 0,
  zIndex: 100,
  height: 60,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 48px',
  borderBottom: '1px solid transparent',
  transition: 'background 0.3s, border-color 0.3s, backdrop-filter 0.3s',
};

const NAV_LOGO_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const HERO_STYLE: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '120px 24px 80px',
};

const HERO_WORDMARK_STYLE: React.CSSProperties = {
  fontSize: 'clamp(40px, 7vw, 72px)',
  letterSpacing: '0.12em',
  color: '#fff',
  marginBottom: 12,
  lineHeight: 1,
};

const HERO_CN_STYLE: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 300,
  letterSpacing: '0.22em',
  color: '#7a8399',
  marginBottom: 40,
};

const SECTION_STYLE: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  padding: '80px 48px 100px',
};

const LABEL_STYLE: React.CSSProperties = {
  textAlign: 'center',
  fontSize: 11,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: '#f5a623',
  marginBottom: 14,
};

const SECTION_TITLE_STYLE: React.CSSProperties = {
  textAlign: 'center',
  fontSize: 28,
  fontWeight: 300,
  color: '#e8eaf0',
  marginBottom: 52,
  letterSpacing: '0.06em',
};

const GRID_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: 24,
  maxWidth: 840,
  margin: '0 auto',
};

const CARD_BASE: React.CSSProperties = {
  background: '#0d1526',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: '36px 36px 32px',
  position: 'relative',
  overflow: 'hidden',
  transition: 'border-color 0.25s, transform 0.25s',
};

const CARD_ICON_STYLE: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 10,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 20,
};

const BTN_BASE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '9px 20px',
  borderRadius: 8,
  border: '1px solid',
  background: 'transparent',
  fontSize: 13,
  cursor: 'pointer',
  transition: 'background 0.2s, color 0.2s',
  fontFamily: 'inherit',
};

const FOOTER_STYLE: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  borderTop: '1px solid rgba(255,255,255,0.06)',
  padding: '28px 48px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 12,
};
