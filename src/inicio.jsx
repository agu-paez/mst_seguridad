import React, { useEffect, useState } from 'react';

function Inicio() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <div className="inicio-container">
      <div className="inicio-hero">
        <div className="hero-bg-shapes">
          <div className="shape shape-1" />
          <div className="shape shape-2" />
          <div className="shape shape-3" />
        </div>
        
        {/* ACÁ ACTUALIZAMOS LOS TEXTOS PRINCIPALES */}
        <div className={`hero-content ${visible ? 'visible' : ''}`}>
          <div className="hero-badge">Seguridad & Energía</div>
          <h1 className="hero-title">
            <span className="hero-title-main">MST Alarmas</span>
            <span className="hero-title-sub">& Paneles Solares</span>
          </h1>
          <p className="hero-desc">
            Los mejores sistemas de prevención y monitoreo para tu seguridad, sumado a soluciones de energía solar para tu hogar o comercio.
          </p>
        </div>

        <div className="hero-stats">
          <div className="stat-item">
            <span className="stat-number">+500</span>
            <span className="stat-label">Clientes Satisfechos</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number">+5</span>
            <span className="stat-label">Años de Experiencia</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number">24/7</span>
            <span className="stat-label">Soporte Técnico</span>
          </div>
        </div>
      </div>

      <div className="caracteristicas-section">
        <div className="section-header">
          <span className="section-tag">¿Por qué elegirnos?</span>
          {/* CAMBIAMOS EL TÍTULO PARA INCLUIR LA ENERGÍA */}
          <h2 className="section-title">Tecnología que <span className="gradient-text">protege y alimenta</span> lo que importa</h2>
        </div>

        <div className="caracteristicas-grid">
          
          {/* TARJETA 1: ALARMAS */}
          <div className="caracteristica-tarjeta">
            <div className="card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3>Alta Tecnología</h3>
            <p>Sensores infrarrojos y sistemas de alarma de última generación listos para instalar.</p>
            <div className="card-shine" />
          </div>

          {/* TARJETA 2: PANELES SOLARES (NUEVA) */}
          <div className="caracteristica-tarjeta">
            <div className="card-icon">
              {/* Este SVG dibuja un panel solar */}
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="8" y1="3" x2="8" y2="21" />
                <line x1="16" y1="3" x2="16" y2="21" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
              </svg>
            </div>
            <h3>Energía Solar</h3>
            <p>Instalación de paneles solares para que ahorres en tu factura y cuides el medio ambiente.</p>
            <div className="card-shine" />
          </div>

          {/* TARJETA 3: STOCK */}
          <div className="caracteristica-tarjeta">
            <div className="card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" />
                <path d="M3 14v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" />
                <circle cx="7" cy="14" r="1" />
                <circle cx="17" cy="14" r="1" />
              </svg>
            </div>
            <h3>Stock Inmediato</h3>
            <p>Retiro en el acto de equipos o envíos configurados rápidos para nuestra zona.</p>
            <div className="card-shine" />
          </div>

        </div>
      </div>
    </div>
  );
}

export default Inicio;