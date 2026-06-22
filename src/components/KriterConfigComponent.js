import { createKriter } from '../models/AppState.js';

/**
 * Kriter Konfigürasyon Bileşeni — P1 ve P2 kriterlerini düzenler ve doğrular
 */
export class KriterConfigComponent {
  constructor(containerId, stateManager, distributeAction) {
    this.container = document.getElementById(containerId);
    this.state = stateManager;
    this.distributeAction = distributeAction;

    // Kriter listelerini ve global meta'yı dinliyoruz
    this.state.subscribe('p1Kriterleri', () => this.render());
    this.state.subscribe('p2Kriterleri', () => this.render());
    this.state.subscribe('globalMeta', () => this.render());
    this.state.subscribe('isProcessing', () => this.render());
  }

  render() {
    const p1 = this.state.get('p1Kriterleri') || [];
    const p2 = this.state.get('p2Kriterleri') || [];
    const isProcessing = this.state.get('isProcessing') || false;

    const meta = this.state.get('globalMeta') || {};
    const p1Baslik = meta.p1Baslik || 'Performans - 1 Kriterleri';
    const p2Baslik = meta.p2Baslik || 'Performans - 2 Kriterleri';

    const p1Total = p1.reduce((sum, k) => sum + (parseInt(k.maxPuan) || 0), 0);
    const p2Total = p2.reduce((sum, k) => sum + (parseInt(k.maxPuan) || 0), 0);

    const p1Valid = p1Total === 100;
    const p2Valid = p2Total === 100;
    const allValid = p1Valid && p2Valid;

    this.container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          <span>Değerlendirme Kriterleri Yapılandırması</span>
        </div>
        
        <div class="kriter-grids">
          <!-- P1 Kriterleri -->
          <div class="kriter-column">
            <div class="kriter-title-row">
              <input type="text" class="input-field header-editable-input" id="p1-title-input" value="${p1Baslik}" placeholder="P1 Başlık" ${isProcessing ? 'disabled' : ''} style="font-size: 1.05rem; font-weight: 600; background: transparent; border: none; border-bottom: 1px dashed var(--text-muted); padding: 4px 0; border-radius: 0; width: 220px;" />
              <span class="badge ${p1Valid ? 'badge-success' : 'badge-danger'}">Toplam: ${p1Total} / 100</span>
            </div>
            <div class="kriter-list" id="p1-list">
              ${p1.map((k, idx) => this._kriterRow('p1', k, idx)).join('')}
            </div>
            <button class="btn btn-secondary btn-sm mt-3" id="add-p1-btn" ${isProcessing ? 'disabled' : ''}>
              + Yeni Kriter Ekle
            </button>
          </div>

          <!-- P2 Kriterleri -->
          <div class="kriter-column">
            <div class="kriter-title-row">
              <input type="text" class="input-field header-editable-input" id="p2-title-input" value="${p2Baslik}" placeholder="P2 Başlık" ${isProcessing ? 'disabled' : ''} style="font-size: 1.05rem; font-weight: 600; background: transparent; border: none; border-bottom: 1px dashed var(--text-muted); padding: 4px 0; border-radius: 0; width: 220px;" />
              <span class="badge ${p2Valid ? 'badge-success' : 'badge-danger'}">Toplam: ${p2Total} / 100</span>
            </div>
            <div class="kriter-list" id="p2-list">
              ${p2.map((k, idx) => this._kriterRow('p2', k, idx)).join('')}
            </div>
            <button class="btn btn-secondary btn-sm mt-3" id="add-p2-btn" ${isProcessing ? 'disabled' : ''}>
              + Yeni Kriter Ekle
            </button>
          </div>
        </div>

        ${!allValid ? `
          <div class="alert alert-warning mt-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>Devam edebilmek için her iki performans türünün de kriter puan toplamları tam olarak 100 olmalıdır.</span>
          </div>
        ` : ''}

        <div class="card-footer mt-4">
          <button class="btn btn-primary" id="distribute-btn" ${!allValid || isProcessing ? 'disabled' : ''}>
            ${isProcessing ? '<span class="spinner spinner-inline"></span> Puanlar Dağıtılıyor...' : 'Puanları Dağıt ve Önizle'}
          </button>
        </div>
      </div>
    `;

    this._bindEvents(p1, p2, isProcessing);
  }

  _kriterRow(type, kriter, index) {
    return `
      <div class="kriter-row" data-id="${kriter.id}" data-type="${type}">
        <input type="text" class="input-field kriter-name" value="${kriter.kriterAdi}" placeholder="Kriter Adı" data-index="${index}" />
        <input type="number" class="input-field kriter-max-score" value="${kriter.maxPuan}" placeholder="Max Puan" min="5" max="100" step="5" data-index="${index}" />
        <button class="btn btn-danger btn-icon delete-kriter-btn" data-index="${index}" title="Sil">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    `;
  }

  _bindEvents(p1, p2, isProcessing) {
    if (isProcessing) return;

    // Başlıkların Değiştirilmesi
    const p1TitleInput = document.getElementById('p1-title-input');
    if (p1TitleInput) {
      p1TitleInput.addEventListener('change', (e) => {
        const meta = this.state.get('globalMeta');
        meta.p1Baslik = e.target.value;
        this.state.setState('globalMeta', meta);
      });
    }

    const p2TitleInput = document.getElementById('p2-title-input');
    if (p2TitleInput) {
      p2TitleInput.addEventListener('change', (e) => {
        const meta = this.state.get('globalMeta');
        meta.p2Baslik = e.target.value;
        this.state.setState('globalMeta', meta);
      });
    }

    // P1 Kriter Değişiklikleri
    this.container.querySelectorAll('[data-type="p1"] .kriter-name').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index);
        p1[idx].kriterAdi = e.target.value;
        this.state.setState('p1Kriterleri', p1);
      });
    });

    this.container.querySelectorAll('[data-type="p1"] .kriter-max-score').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index);
        p1[idx].maxPuan = Math.max(0, parseInt(e.target.value) || 0);
        this.state.setState('p1Kriterleri', p1);
      });
    });

    // P2 Kriter Değişiklikleri
    this.container.querySelectorAll('[data-type="p2"] .kriter-name').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index);
        p2[idx].kriterAdi = e.target.value;
        this.state.setState('p2Kriterleri', p2);
      });
    });

    this.container.querySelectorAll('[data-type="p2"] .kriter-max-score').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index);
        p2[idx].maxPuan = Math.max(0, parseInt(e.target.value) || 0);
        this.state.setState('p2Kriterleri', p2);
      });
    });

    // Kriter Ekleme
    document.getElementById('add-p1-btn').addEventListener('click', () => {
      p1.push(createKriter({ kriterAdi: 'Yeni Kriter', maxPuan: 10 }));
      this.state.setState('p1Kriterleri', p1);
    });

    document.getElementById('add-p2-btn').addEventListener('click', () => {
      p2.push(createKriter({ kriterAdi: 'Yeni Kriter', maxPuan: 10 }));
      this.state.setState('p2Kriterleri', p2);
    });

    // Silme Butonları
    this.container.querySelectorAll('[data-type="p1"] .delete-kriter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const row = e.target.closest('.kriter-row');
        const idx = parseInt(row.querySelector('.kriter-name').dataset.index);
        p1.splice(idx, 1);
        this.state.setState('p1Kriterleri', p1);
      });
    });

    this.container.querySelectorAll('[data-type="p2"] .delete-kriter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const row = e.target.closest('.kriter-row');
        const idx = parseInt(row.querySelector('.kriter-name').dataset.index);
        p2.splice(idx, 1);
        this.state.setState('p2Kriterleri', p2);
      });
    });

    // Dağıtma Butonu
    document.getElementById('distribute-btn').addEventListener('click', async () => {
      try {
        await this.distributeAction();
      } catch (err) {
        alert('Hata: ' + err.message);
      }
    });
  }
}
