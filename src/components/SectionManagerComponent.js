/**
 * Bölüm (Sınıf) Yönetim Bileşeni — Sınıf etiketlerini düzenletir
 */
export class SectionManagerComponent {
  constructor(containerId, stateManager) {
    this.container = document.getElementById(containerId);
    this.state = stateManager;
    this.state.subscribe('sections', () => this.render());
  }

  render() {
    const sections = this.state.get('sections');
    if (!sections || sections.length === 0) { this.container.innerHTML = ''; return; }

    this.container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          <span>Sınıf Bölümleri</span>
          <span class="badge">${sections.length} bölüm</span>
        </div>
        <div class="section-list">
          ${sections.map((s, i) => `
            <div class="section-item">
              <span class="section-number">${i + 1}</span>
              <input class="input-field section-sinif" type="text" value="${s.sinifSubesi}" data-idx="${i}" data-field="sinifSubesi" placeholder="Sınıf / Şube" />
              <input class="input-field section-ders" type="text" value="${s.dersAdi}" data-idx="${i}" data-field="dersAdi" placeholder="Ders Adı" />
              <span class="badge badge-info">${s.students.length} öğrenci</span>
              ${s.mudurYardimcisi ? `<span class="section-admin">${s.mudurYardimcisi}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.container.querySelectorAll('.section-sinif, .section-ders').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        const field = e.target.dataset.field;
        const sections = this.state.get('sections');
        sections[idx][field] = e.target.value;
        this.state.setState('sections', sections);
      });
    });
  }
}
