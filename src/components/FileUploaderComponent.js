/**
 * Dosya Yükleme Bileşeni — Drag & Drop + Dosya Seçici
 */
/**
 * Dosya Yükleme Bileşeni — Drag & Drop + Dosya Seçici (XLS + PDF Destekli)
 */
export class FileUploaderComponent {
  constructor(containerId, onFileLoaded) {
    this.container = document.getElementById(containerId);
    this.onFileLoaded = onFileLoaded;
  }

  render() {
    this.container.innerHTML = `
      <div class="card">
        <div class="upload-zone" id="upload-zone">
          <div class="upload-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <h3 class="upload-title">E-Okul puan çizelgesini sürükleyip bırakın</h3>
          <p class="upload-subtitle">veya dosya seçmek için tıklayın <br/><span style="font-size: 0.8rem; color: var(--text-muted);">(İsteğe Bağlı: Tam sınıf/ders isimleri için Excel ile birlikte PDF çıktısını da yükleyebilirsiniz)</span></p>
          <div class="upload-formats">
            <span class="badge">Excel (.xls, .xlsx)</span>
            <span class="badge badge-info">PDF (.pdf)</span>
          </div>
          <input type="file" id="file-input" accept=".xls,.xlsx,.csv,.pdf" multiple hidden />
        </div>
      </div>
    `;

    const zone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');

    zone.addEventListener('click', () => fileInput.click());

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) this._handleFiles(files, zone);
    });

    fileInput.addEventListener('change', () => {
      const files = fileInput.files;
      if (files.length > 0) this._handleFiles(files, zone);
    });
  }

  _handleFiles(files, zone) {
    let excelFile = null;
    let pdfFile = null;

    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (['xls', 'xlsx', 'csv'].includes(ext)) {
        excelFile = file;
      } else if (ext === 'pdf') {
        pdfFile = file;
      }
    }

    if (!excelFile) {
      alert('Lütfen en azından bir adet Excel (.xls, .xlsx) veya CSV dosyası yükleyin.');
      zone.classList.remove('uploaded');
      this.render();
      return;
    }

    zone.classList.add('uploaded');
    
    let fileInfoHtml = `
      <div class="upload-success">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <h3 class="upload-title">${excelFile.name}</h3>
        <p class="upload-subtitle">${(excelFile.size / 1024 / 1024).toFixed(2)} MB · Excel yüklendi</p>
    `;

    if (pdfFile) {
      fileInfoHtml += `
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--card-border); width: 100%;">
          <h4 class="upload-title" style="font-size: 0.95rem; color: #a5b4fc; margin-bottom: 4px;">📄 ${pdfFile.name}</h4>
          <p class="upload-subtitle" style="margin-bottom: 0;">${(pdfFile.size / 1024 / 1024).toFixed(2)} MB · PDF yüklendi (Sınıf & Ders adları buradan eşleştirilecek)</p>
        </div>
      `;
    }

    fileInfoHtml += `
        <div class="spinner" id="parse-spinner"></div>
      </div>
    `;

    zone.innerHTML = fileInfoHtml;

    // FileReader ile okuma işlemlerini Promise ile sar
    const readExcel = () => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ buffer: e.target.result, name: excelFile.name });
        reader.readAsArrayBuffer(excelFile);
      });
    };

    const readPdf = () => {
      if (!pdfFile) return Promise.resolve(null);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ buffer: e.target.result, name: pdfFile.name });
        reader.readAsArrayBuffer(pdfFile);
      });
    };

    Promise.all([readExcel(), readPdf()]).then(([excelData, pdfData]) => {
      this.onFileLoaded(excelData, pdfData);
    });
  }
}
