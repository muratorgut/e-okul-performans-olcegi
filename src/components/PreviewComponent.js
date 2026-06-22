/**
 * Dağıtım Sonucu Önizleme Bileşeni
 */
export class PreviewComponent {
  constructor(containerId, stateManager) {
    this.container = document.getElementById(containerId);
    this.state = stateManager;

    this.currentSectionIdx = 0;
    this.currentPT = 'P1'; // 'P1' veya 'P2'

    this.state.subscribe('sections', () => this.render());
    this.state.subscribe('currentStep', () => {
      if (this.state.get('currentStep') === 'preview') {
        this.render();
      }
    });
  }

  render() {
    const sections = this.state.get('sections') || [];
    if (sections.length === 0) {
      this.container.innerHTML = '';
      return;
    }

    const currentSection = sections[this.currentSectionIdx];
    if (!currentSection) {
      this.container.innerHTML = '';
      return;
    }

    const meta = this.state.get('globalMeta') || {};
    const p1Baslik = meta.p1Baslik || 'Performans - 1 Kriterleri';
    const p2Baslik = meta.p2Baslik || 'Performans - 2 Kriterleri';

    const kriterler = this.currentPT === 'P1'
      ? this.state.get('p1Kriterleri')
      : this.state.get('p2Kriterleri');

    const dagilimKey = this.currentPT === 'P1' ? 'p1DagilimListesi' : 'p2DagilimListesi';
    const notKey = this.currentPT === 'P1' ? 'p1Notu' : 'p2Notu';

    this.container.innerHTML = `
      <div class="card">
        <div class="card-header flex-between">
          <div class="flex-align gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span>Dağıtılan Puanların Önizlemesi</span>
          </div>
          
          <div class="preview-controls">
            <!-- Sınıf Seçimi -->
            <select class="select-field" id="preview-section-select">
              ${sections.map((sec, idx) => `
                <option value="${idx}" ${idx === this.currentSectionIdx ? 'selected' : ''}>
                  ${sec.sinifSubesi} (${sec.students.length} Öğrenci)
                </option>
              `).join('')}
            </select>

            <!-- P1 / P2 Seçimi -->
            <div class="btn-group">
              <button class="btn btn-tab ${this.currentPT === 'P1' ? 'active' : ''}" id="pt-p1-btn">${p1Baslik}</button>
              <button class="btn btn-tab ${this.currentPT === 'P2' ? 'active' : ''}" id="pt-p2-btn">${p2Baslik}</button>
            </div>
          </div>
        </div>

        <div class="table-container">
          <table class="preview-table">
            <thead>
              <tr>
                <th width="80">Sıra No</th>
                <th width="100">Okul No</th>
                <th>Adı Soyadı</th>
                ${kriterler.map(k => `<th>${k.kriterAdi}<br/><span class="sub-th">(Max ${k.maxPuan})</span></th>`).join('')}
                <th width="100">Toplam Not</th>
              </tr>
            </thead>
            <tbody>
              ${currentSection.students.map((student, idx) => {
                const dagilim = student[dagilimKey] || [];
                const total = dagilim.reduce((a, b) => a + b, 0);
                const originalNot = student[notKey];
                const hasMismatch = total !== originalNot;

                return `
                  <tr class="${hasMismatch ? 'row-error' : ''}">
                    <td class="text-center">${idx + 1}</td>
                    <td class="text-center font-semibold">${student.okulNo}</td>
                    <td>${student.adiSoyadi}</td>
                    ${kriterler.map((_, kIdx) => {
                      const val = dagilim[kIdx] !== undefined ? dagilim[kIdx] : '';
                      return `<td class="text-center score-cell font-mono">${val}</td>`;
                    }).join('')}
                    <td class="text-center font-bold font-mono score-total ${hasMismatch ? 'text-danger' : 'text-success'}">
                      ${total}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="card-footer mt-4">
          <button class="btn btn-primary" id="preview-next-btn">
            Belgeleri İndirme Adımına Geç
          </button>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    const select = document.getElementById('preview-section-select');
    if (select) {
      select.addEventListener('change', (e) => {
        this.currentSectionIdx = parseInt(e.target.value);
        this.render();
      });
    }

    const p1Btn = document.getElementById('pt-p1-btn');
    if (p1Btn) {
      p1Btn.addEventListener('click', () => {
        this.currentPT = 'P1';
        this.render();
      });
    }

    const p2Btn = document.getElementById('pt-p2-btn');
    if (p2Btn) {
      p2Btn.addEventListener('click', () => {
        this.currentPT = 'P2';
        this.render();
      });
    }

    const nextBtn = document.getElementById('preview-next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.state.setState('currentStep', 'export');
      });
    }
  }
}
