import { formatImageUrl } from './imageHelper';
import { getAmenityIcon } from './amenityIcons';

/**
 * Helper to ensure full absolute URLs for popup windows & print engine
 */
const getFullUrl = (url) => {
  if (!url) return 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80';
  const formatted = formatImageUrl(url);
  if (formatted.startsWith('/')) {
    return window.location.origin + formatted;
  }
  return formatted;
};

/**
 * Generates a printable property catalog window with full images, floor plans, and amenities.
 * Features unique property code (e.g. PROP-PUN-9106) for broker referrals.
 */
export const generateClientCatalog = (property, configurations = [], amenities = [], specifications = [], media = {}) => {
  if (!property) return;

  const catalogWindow = window.open('', '_blank', 'width=1100,height=900');
  if (!catalogWindow) {
    alert('Please allow pop-ups in your browser to download/print the property catalog.');
    return;
  }

  const mainPhoto = media.images && media.images.length > 0 
    ? getFullUrl(media.images[0].url)
    : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80';

  const galleryImages = (media.images || []).slice(0, 9);
  const floorPlanMedia = media.floor_plans || [];

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Property Catalog - ${property.property_code}</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: #0f172a;
          background-color: #ffffff;
          margin: 0;
          padding: 20px;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Outfit', sans-serif;
        }
        .header-bar {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #ffffff;
          border-radius: 16px;
          padding: 24px 32px;
          margin-bottom: 24px;
        }
        .smart-code-pill {
          background-color: #f59e0b;
          color: #0f172a;
          font-weight: 800;
          font-size: 1.1rem;
          padding: 6px 18px;
          border-radius: 30px;
          display: inline-block;
          letter-spacing: 1px;
        }
        .hero-banner {
          position: relative;
          margin-bottom: 28px;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.12);
        }
        .hero-img {
          width: 100%;
          height: 380px;
          object-fit: cover;
          display: block;
        }
        .hero-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 24px 32px;
          background: linear-gradient(transparent, rgba(15,23,42,0.92));
          color: #ffffff;
        }
        .section-card {
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 28px;
          background-color: #ffffff;
          page-break-inside: avoid;
        }
        .amenity-chip {
          background-color: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .broker-footer-box {
          background-color: #ecfdf5;
          border: 2px dashed #059669;
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          margin-top: 32px;
          page-break-inside: avoid;
        }
        @media print {
          .no-print { display: none !important; }
          body { padding: 0; }
          .section-card { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>

      <!-- Print Floating Trigger Bar -->
      <div class="no-print d-flex justify-content-between align-items-center bg-dark text-white p-3 mb-4 rounded-3 shadow">
        <div>
          <span class="fw-700 text-warning fs-6"><i class="bi bi-file-earmark-pdf-fill me-1"></i> Real Estate Property Catalog</span>
        </div>
        <button onclick="window.print()" class="btn btn-warning fw-700 px-4 py-2 rounded-pill shadow-sm">
          <i class="bi bi-printer-fill me-1"></i> Print / Save as PDF
        </button>
      </div>

      <!-- Header Bar -->
      <div class="header-bar d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <span class="small text-light text-uppercase tracking-wider opacity-75 d-block mb-1">Official Real Estate Property Catalog</span>
          <h2 class="fw-800 m-0 text-white"><i class="bi bi-building me-2 text-warning"></i>${property.property_type ? property.property_type.toUpperCase() : 'PREMIUM'} PROPERTY CATALOG</h2>
          <p class="mb-0 text-light opacity-90 small mt-1"><i class="bi bi-geo-alt-fill text-warning me-1"></i> Location: ${property.location}, ${property.city}</p>
        </div>
        <div class="text-end">
          <span class="small text-light d-block mb-1">REFERRAL SMART PROPERTY CODE</span>
          <span class="smart-code-pill"><i class="bi bi-qr-code me-1.5"></i> ${property.property_code}</span>
        </div>
      </div>

      <!-- Hero Banner Image -->
      <div class="hero-banner">
        <img src="${mainPhoto}" class="hero-img" alt="Property Main Image" onerror="this.src='https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'" />
        <div class="hero-overlay d-flex justify-content-between align-items-end flex-wrap">
          <div>
            <h3 class="fw-800 text-white mb-1">${property.property_type ? property.property_type.toUpperCase() : 'RESIDENTIAL'} HOLDINGS</h3>
            <p class="text-light mb-0 small"><i class="bi bi-geo-alt text-warning me-1"></i> ${property.address}</p>
          </div>
          <div class="text-end">
            ${property.rera_id ? `<span class="badge bg-warning text-dark fw-700 px-3 py-2 rounded-pill fs-6 mb-1">RERA ID: ${property.rera_id}</span>` : ''}
            <div class="text-light small">Status: <span class="fw-700 text-uppercase text-success">${property.availability_status || 'Available'}</span></div>
          </div>
        </div>
      </div>

      <!-- Key Details & Configurations Table with Floor Plans -->
      <div class="section-card">
        <h4 class="fw-800 text-primary mb-3"><i class="bi bi-grid-3x3-gap-fill me-2"></i>Pricing & BHK Configurations</h4>
        ${configurations && configurations.length > 0 ? `
          <div class="table-responsive">
            <table class="table table-bordered align-middle">
              <thead class="table-dark">
                <tr>
                  <th>Variant / Configuration</th>
                  <th>Carpet Area</th>
                  <th>Total Cost Approx</th>
                  <th>Estimated EMI (/Mo)</th>
                  <th>Floor Plan</th>
                </tr>
              </thead>
              <tbody>
                ${configurations.map(c => {
                  const fpUrl = c.floor_plan_url || c.floor_plan;
                  return `
                    <tr>
                      <td class="fw-700 text-dark">${c.bhk_type}</td>
                      <td>${c.carpet_area} Sq. Ft.</td>
                      <td class="text-success fw-800">₹${Number(c.price).toLocaleString('en-IN')}</td>
                      <td class="fw-600">${c.estimated_emi ? `₹${Number(c.estimated_emi).toLocaleString('en-IN')}` : 'Price On Request'}</td>
                      <td>
                        ${fpUrl ? `
                          <div class="d-flex align-items-center gap-2">
                            <a href="${getFullUrl(fpUrl)}" target="_blank" class="btn btn-sm btn-outline-primary fw-600 py-1 px-2">
                              <i class="bi bi-box-arrow-up-right me-1"></i> View Plan
                            </a>
                            <img src="${getFullUrl(fpUrl)}" style="max-width: 90px; max-height: 60px; object-fit: contain; border: 1px solid #cbd5e1; border-radius: 6px;" alt="Floor Plan" onerror="this.style.display='none'" />
                          </div>
                        ` : '<span class="text-muted small">N/A</span>'}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : `<p class="text-muted mb-0">Pricing details available upon direct request with broker.</p>`}
      </div>

      <!-- Overview Section -->
      ${property.highlights ? `
        <div class="section-card">
          <h4 class="fw-800 text-dark mb-2"><i class="bi bi-info-circle-fill me-2 text-primary"></i>Property Overview</h4>
          <p class="text-secondary leading-relaxed mb-0">${property.highlights}</p>
        </div>
      ` : ''}

      <!-- Project Amenities Section -->
      ${amenities && amenities.length > 0 ? `
        <div class="section-card">
          <h4 class="fw-800 text-dark mb-3"><i class="bi bi-patch-check-fill me-2 text-success"></i>Project Amenities</h4>
          <div class="row g-3">
            ${amenities.map(a => {
              const iconInfo = getAmenityIcon(a);
              return `
                <div class="col-6 col-md-4">
                  <div class="amenity-chip">
                    <i class="bi ${iconInfo.icon} fs-4" style="color: ${iconInfo.color};"></i>
                    <span class="fw-700 small text-dark">${a}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Technical Specifications Section -->
      ${specifications && specifications.length > 0 ? `
        <div class="section-card">
          <h4 class="fw-800 text-dark mb-3"><i class="bi bi-sliders me-2 text-warning"></i>Technical Specifications</h4>
          <div class="row g-3">
            ${specifications.map(s => `
              <div class="col-md-6 border-bottom pb-2">
                <strong class="text-dark d-block">${s.title}</strong>
                <span class="text-muted small">${s.details}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Image Photo Gallery Section with Full <img> Elements -->
      ${galleryImages.length > 0 ? `
        <div class="section-card">
          <h4 class="fw-800 text-dark mb-3"><i class="bi bi-images me-2 text-info"></i>Project Photo Gallery</h4>
          <div class="row g-3">
            ${galleryImages.map(img => `
              <div class="col-6 col-md-4">
                <div style="border-radius: 12px; overflow: hidden; border: 1px solid #cbd5e1; background-color: #f8fafc;">
                  <img src="${getFullUrl(img.url)}" alt="${img.name || 'Property Image'}" style="width: 100%; height: 170px; object-fit: cover; display: block;" onerror="this.src='https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'" />
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Client Referral Broker Callout -->
      <div class="broker-footer-box">
        <h4 class="fw-800 text-success mb-2"><i class="bi bi-person-badge-fill me-2"></i>Interested in Viewing this Property?</h4>
        <p class="fs-6 text-dark mb-2">Please share the Unique Property Referral Code <strong>${property.property_code}</strong> with your assigned real estate advisor or channel partner.</p>
        <span class="badge bg-success text-white px-3 py-2 fs-6 rounded-pill">Property Code: ${property.property_code}</span>
      </div>

    </body>
    </html>
  `;

  catalogWindow.document.write(htmlContent);
  catalogWindow.document.close();
};

