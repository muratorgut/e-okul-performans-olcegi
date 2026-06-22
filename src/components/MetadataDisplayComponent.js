/**
 * Meta Veri Görüntüleme Bileşeni — Okul/Ders/Dönem bilgilerini gösterir ve düzenletir
 */
export class MetadataDisplayComponent {
  constructor(containerId, stateManager) {
    this.container = document.getElementById(containerId);
    this.state = stateManager;
    this.state.subscribe('globalMeta', () => this.render());
  }

  render() {
    const meta = this.state.get('globalMeta');
    if (!meta || !meta.okulAdi) { this.container.innerHTML = ''; return; }

    this.container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>Dosya Bilgileri</span>
        </div>
        <div class="metadata-grid">
          ${this._field('Okul Adı', meta.okulAdi, 'okulAdi')}
          ${this._field('Dönem', meta.donemBilgisi, 'donemBilgisi')}
          ${this._field('Ders Adı', meta.dersAdi, 'dersAdi')}
          ${this._field('Haftalık Saat', meta.haftalikSaat, 'haftalikSaat')}
          ${this._field('Öğretmen Adı Soyadı', meta.ogretmenAdi, 'ogretmenAdi')}
          ${this._field('Öğretmen Branşı', meta.ogretmenBrans, 'ogretmenBrans')}
          ${this._field('Okul Müdürü', meta.okulMuduru, 'okulMuduru')}
        </div>
      </div>
    `;

    // Input event listener'ları
    this.container.querySelectorAll('.metadata-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const key = e.target.dataset.key;
        const meta = this.state.get('globalMeta');
        meta[key] = e.target.value;
        this.state.setState('globalMeta', meta);
      });
    });
  }

  _field(label, value, key) {
    return `
      <div class="metadata-field">
        <label class="metadata-label">${label}</label>
        <input class="input-field metadata-input" type="text" value="${value || ''}" data-key="${key}" />
      </div>
    `;
  }
}
