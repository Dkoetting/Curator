import { useEffect, useMemo, useState } from 'react';
import './splash-screen.css';

const defaultWatermarks = [
  { className: 'primary', alt: '' },
  { className: 'secondary', alt: '' },
  { className: 'tertiary', alt: '' },
  { className: 'quaternary', alt: '' },
  { className: 'quinary', alt: '' },
  { className: 'senary', alt: '' },
  { className: 'septenary', alt: '' },
  { className: 'octonary', alt: '' },
];

const defaultPoints = [
  'Regulatorische Entwicklungen, KRITIS-Signale und Marktbewegungen werden in einen ruhigen, entscheidungsfaehigen Arbeitsfluss ueberfuehrt.',
  'Quellen, Themen und Freigaben bleiben nachvollziehbar, damit aus Recherche belastbare Veroeffentlichungen werden.',
];

export default function SplashScreen({
  logoSrc = '/assets/Logo.jpg',
  portraitSrc = '/assets/dirk-portrait.jpg',
  visibleDuration = 15000,
  brandKicker = 'Institute Workbench',
  brandName = 'Dr. DirKInstitute',
  personName = 'Dr. Dirk Koetting',
  personRole = 'KI-Governance, IT-Sicherheit und kuratierte Entscheidungsgrundlagen',
  title = 'Content Intelligence fuer belastbare Entscheidungen.',
  text = 'Der Curator verdichtet priorisierte Recherche, redaktionell anschlussfaehige Entwuerfe und ein belastbares Lagebild fuer KI-Governance im DACH-Raum.',
  points = defaultPoints,
  statusText = 'Research Briefing wird vorbereitet',
  footerText = 'Kuratiertes Monitoring, redaktionelle Vorbereitung und Freigabe in einer belastbaren Arbeitsoberflaeche.',
  onComplete,
}) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    document.body.classList.add('splash-active');

    const timer = window.setTimeout(() => {
      setHidden(true);
      document.body.classList.remove('splash-active');
      if (typeof onComplete === 'function') onComplete();
    }, visibleDuration);

    return () => {
      window.clearTimeout(timer);
      document.body.classList.remove('splash-active');
    };
  }, [onComplete, visibleDuration]);

  const watermarkItems = useMemo(() => defaultWatermarks, []);

  return (
    <div className={`splash-screen${hidden ? ' is-hidden' : ''}`} aria-hidden={hidden}>
      {watermarkItems.map((item) => (
        <div className={`splash-watermark ${item.className}`} key={item.className}>
          <img src={logoSrc} alt={item.alt} />
        </div>
      ))}

      <div className="splash-shell">
        <div className="splash-portrait">
          <img src={portraitSrc} alt={`${personName} Portrait`} />
          <div className="splash-portrait-badge">
            <strong>{personName}</strong>
            <span>{personRole}</span>
          </div>
        </div>

        <div className="splash-card">
          <div className="splash-brand">
            <img src={logoSrc} alt={`${brandName} Logo`} />
            <div>
              <div className="splash-kicker">{brandKicker}</div>
              <div className="splash-brand-name">{brandName}</div>
            </div>
          </div>

          <div className="splash-copy">
            <h1 className="splash-title">{title}</h1>
            <p className="splash-text">{text}</p>
          </div>

          <div className="splash-points">
            {points.map((point) => (
              <div className="splash-point" key={point}>
                {point}
              </div>
            ))}
          </div>

          <div className="splash-footer">
            <div className="splash-status">
              <div className="splash-status-line">
                <span className="splash-status-dot"></span>
                {statusText}
              </div>
              <div className="splash-progress">
                <span style={{ animationDuration: `${visibleDuration}ms` }}></span>
              </div>
            </div>
            <div className="splash-meta">{footerText}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
