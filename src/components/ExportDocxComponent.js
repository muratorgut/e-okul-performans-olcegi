/**
 * Word Belgelerini Dışa Aktarma Bileşeni
 */
export class ExportDocxComponent {
  constructor(containerId, stateManager, generateAction) {
    this.container = document.getElementById(containerId);
    this.state = stateManager;
    this.generateAction = generateAction;

    this.zipProgress = { current: 0, total: 0, active: false };

    this.state.subscribe('sections', () => this.render());
    this.state.subscribe('isProcessing', () => this.render());
    this.state.subscribe('currentStep', () => {
      if (this.state.get('currentStep') === 'export') {
        this.render();
      }
    });
  }

  render() {
    const sections = this.state.get('sections') || [];
    const isProcessing = this.state.get('isProcessing') || false;

    if (sections.length === 0) {
      this.container.innerHTML = '';
      return;
    }

    const progressPercent = this.zipProgress.total > 0
      ? Math.round((this.zipProgress.current / this.zipProgress.total) * 100)
      : 0;

    this.container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Belgeleri Oluştur ve İndir</span>
        </div>

        <div class="export-hero-section text-center">
          <p class="export-subtitle mt-1 mb-4">
            Tüm sınıf listeleri ve performans not dağılımları başarıyla hazırlandı. 
            Aşağıdan tüm belgeleri tek seferde ZIP olarak, tek bir Word dosyasında birleşik olarak veya sınıfları tek tek indirebilirsiniz.
          </p>

          <!-- Toplu İndirme Kartı -->
          <div class="zip-download-box">
            <div class="zip-icon-wrapper">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <h3 class="mt-3">Tüm Sınıfları ve Performansları İndir</h3>
            <p class="text-sm text-secondary mb-4">
              Toplam ${sections.length * 2} adet değerlendirme ölçeği tablosu hazırlanacaktır.
            </p>

            ${this.zipProgress.active ? `
              <div class="progress-container">
                <div class="progress-bar-wrapper">
                  <div class="progress-bar" style="width: ${progressPercent}%"></div>
                </div>
                <span class="progress-text">İşlem yapılıyor: ${this.zipProgress.current} / ${this.zipProgress.total} (%${progressPercent})</span>
              </div>
            ` : `
              <div class="flex-center gap-3 flex-wrap">
                <button class="btn btn-primary btn-lg px-4" id="download-zip-btn" ${isProcessing ? 'disabled' : ''}>
                  Tümünü İndir (ZIP Arşivi)
                </button>
                <button class="btn btn-success btn-lg px-4" id="download-single-docx-btn" ${isProcessing ? 'disabled' : ''}>
                  Tümünü İndir (Tek Word Dosyası)
                </button>
              </div>
            `}
          </div>
        </div>

        <div class="divider mt-5 mb-4"><span>Veya Sınıf Sınıf İndirin</span></div>

        <!-- Sınıf Listesi Tablosu -->
        <div class="table-container">
          <table class="export-table">
            <thead>
              <tr>
                <th>Sınıf / Şube</th>
                <th>Ders Adı</th>
                <th width="120" class="text-center">Öğrenci</th>
                <th width="300" class="text-center">Aksiyonlar</th>
              </tr>
            </thead>
            <tbody>
              ${sections.map(sec => `
                <tr>
                  <td>
                    <span class="font-semibold text-white">${sec.sinifSubesi}</span>
                  </td>
                  <td>${sec.dersAdi}</td>
                  <td class="text-center">
                    <span class="badge badge-info">${sec.students.length} Öğrenci</span>
                  </td>
                  <td class="text-center">
                    <div class="flex-center gap-2">
                      <button class="btn btn-secondary btn-sm download-single-btn" data-id="${sec.id}" data-type="P1" ${isProcessing ? 'disabled' : ''}>
                        P1 İndir
                      </button>
                      <button class="btn btn-secondary btn-sm download-single-btn" data-id="${sec.id}" data-type="P2" ${isProcessing ? 'disabled' : ''}>
                        P2 İndir
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="card-footer mt-5 flex-between">
          <button class="btn btn-ghost" id="export-back-btn">
            ← Önizlemeye Geri Dön
          </button>
          <button class="btn btn-secondary" id="restart-btn">
            Yeni Dosya Yükle
          </button>
        </div>
      </div>
    `;

    this._bindEvents(sections);
  }

  _bindEvents(sections) {
    // ZIP İndirme
    const zipBtn = document.getElementById('download-zip-btn');
    if (zipBtn) {
      zipBtn.addEventListener('click', async () => {
        this.zipProgress = { current: 0, total: sections.length * 2, active: true };
        this.render();

        try {
          await this.generateAction.exportAll((current, total) => {
            this.zipProgress.current = current;
            this.render();
          });
        } catch (err) {
          alert('ZIP paketi oluşturulurken bir hata oluştu: ' + err.message);
        } finally {
          this.zipProgress.active = false;
          this.render();
        }
      });
    }

    // Tek Word Dosyası Olarak İndirme
    const singleDocxBtn = document.getElementById('download-single-docx-btn');
    if (singleDocxBtn) {
      singleDocxBtn.addEventListener('click', async () => {
        this.zipProgress = { current: 0, total: sections.length * 2, active: true };
        this.render();

        try {
          await this.generateAction.exportAllSingleDocx((current, total) => {
            this.zipProgress.current = current;
            this.render();
          });
        } catch (err) {
          alert('Word dosyası birleştirilirken bir hata oluştu: ' + err.message);
        } finally {
          this.zipProgress.active = false;
          this.render();
        }
      });
    }

    // Tekli İndirme
    this.container.querySelectorAll('.download-single-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        const type = e.target.dataset.type;
        try {
          await this.generateAction.exportSingle(id, type);
        } catch (err) {
          alert('Belge oluşturulurken hata oluştu: ' + err.message);
        }
      });
    });

    // Geri ve Yeniden Başlatma Butonları
    const backBtn = document.getElementById('export-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.state.setState('currentStep', 'preview');
      });
    }

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        if (confirm('Tüm verileriniz sıfırlanacak ve baştan başlayacaksınız. Emin misiniz?')) {
          // Sayfa yenileme en basit ve güvenli state temizleme yoludur
          window.location.reload();
        }
      });
    }
  }
}
