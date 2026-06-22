/**
 * E-Okul XLS/XLSX/CSV Dosya Ayrıştırma Servisi
 * Antigravity Service katmanı
 */
import * as XLSX from 'xlsx';
import { createSection, createStudent } from '../models/AppState.js';

export class FileParserService {
  /**
   * Ham dosya verisini ayrıştırır, meta verileri ve öğrenci bölümlerini döndürür
   * @param {ArrayBuffer} arrayBuffer
   * @param {string} fileName
   */
  parse(arrayBuffer, fileName) {
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // 1) Meta verileri ilk 20 satırdan dinamik olarak ayıkla
    const globalMeta = this._extractMeta(rows);

    // 2) Sınır satırlarını bul (Toplam veya Başarı istatistik satırları)
    const boundaries = [];
    rows.forEach((row, i) => {
      const col0Val = String(row[0] || '');
      if (typeof row[0] === 'string' && (col0Val.includes('Toplam') || col0Val.includes('Başarı') || col0Val.includes('Bașarı') || col0Val.includes('Basari'))) {
        boundaries.push(i);
      }
    });

    // 3) Her bölüm için öğrenci listesini çıkar
    const sections = [];
    let sectionStart = this._findFirstStudentRow(rows);

    for (let b = 0; b < boundaries.length; b++) {
      const sectionEnd = boundaries[b];
      // Her bölüm (sınıf) için aktif performans sütunlarını dinamik tespit et
      const { p1Col, p2Col } = this._findActivePerfColumns(rows, sectionStart, sectionEnd);
      const students = this._extractStudents(rows, sectionStart, sectionEnd, p1Col, p2Col);

      // Müdür yardımcısını Toplam satırından sonra bul
      const mudurYard = this._extractMudurYardimcisi(rows, sectionEnd);

      // Sınıf etiketleme
      let sinifLabel, dersLabel;
      if (b === 0) {
        sinifLabel = globalMeta.sinifSubesiIlk || `Bölüm ${b + 1}`;
        dersLabel = globalMeta.dersAdi || '';
      } else {
        // Şube harfi A'dan itibaren ilerle — aynı müdür yardımcısı grubunda
        sinifLabel = `Bölüm ${b + 1}`;
        dersLabel = globalMeta.dersAdi || '';
      }

      sections.push(createSection({
        sinifSubesi: sinifLabel,
        dersAdi: dersLabel,
        mudurYardimcisi: mudurYard,
        students,
      }));

      // Sonraki bölümün başlangıcı: Toplam satırından 5 satır sonra (Toplam + boş + öğretmen + 2 boş)
      sectionStart = sectionEnd + 5;
      // Gerçek ilk öğrenci satırını bul
      while (sectionStart < rows.length) {
        const r = rows[sectionStart];
        const nr = r ? parseInt(r[0], 10) : NaN;
        if (!isNaN(nr) && nr >= 1 && typeof r[2] === 'string' && r[2].trim()) break;
        sectionStart++;
      }
    }

    // Otomatik sınıf etiketlerini akıllıca ata
    this._autoLabelSections(sections, globalMeta);

    // Öğretmen ve Müdür isimlerini Excel'deki ilk imza satırından dinamik olarak ayıkla
    let ogretmenAdi = '';
    let okulMuduru = '';
    if (boundaries.length > 0) {
      const sigs = this._extractOgretmenVeMudur(rows, boundaries[0]);
      ogretmenAdi = sigs.ogretmenAdi;
      okulMuduru = sigs.okulMuduru;
    }

    return {
      globalMeta: {
        okulAdi: globalMeta.okulAdi,
        donemBilgisi: globalMeta.donemBilgisi,
        dersAdi: globalMeta.dersAdi,
        haftalikSaat: globalMeta.haftalikSaat,
        p1Baslik: 'SINIF İÇİ',
        p2Baslik: 'PERFORMANS ÇALIŞMASI',
        ogretmenAdi: ogretmenAdi || '',
        ogretmenBrans: globalMeta.dersAdi || '',
        okulMuduru: okulMuduru || '',
      },
      sections,
    };
  }

  /** İlk 20 satırdan meta verileri dinamik çeker */
  _extractMeta(rows) {
    const meta = { okulAdi: '', donemBilgisi: '', sinifSubesiIlk: '', dersAdi: '', haftalikSaat: '' };
    const limit = Math.min(20, rows.length);

    for (let i = 0; i < limit; i++) {
      const col0 = String(rows[i][0] || '');
      const col2 = String(rows[i][2] || '').replace(/^:\s*/, '').trim();

      if (col0.includes('PUAN') && (col0.includes('ZELGES') || col0.includes('İZELGES'))) {
        meta.donemBilgisi = col0.trim();
      }
      if ((col0.includes('Okul') || col0.includes('Kurum')) && !col0.includes('Numara')) {
        if (col2) meta.okulAdi = col2;
      }
      if (col0.includes('ubesi') || col0.includes('ınıf')) {
        meta.sinifSubesiIlk = col2.replace(/^[A-ZÇĞİÖŞÜa-zçğıöşüİı]+\s*[\-\–\—\−]\s*/i, '').trim();
      }
      if (col0.includes('Dersin')) {
        meta.dersAdi = col2;
      }
      if (col0.includes('Saat')) {
        meta.haftalikSaat = col2;
      }
    }
    return meta;
  }

  /** P1 ve P2 sütun indekslerini başlık satırlarından dinamik bulur */
  _findPerfColumns(rows) {
    let y4Col = -1, y5Col = -1;
    let p1Col = -1, p2Col = -1;
    
    const searchRange = Math.min(25, rows.length);
    for (let i = 0; i < searchRange; i++) {
      const row = rows[i];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c]).trim();
        if (val === 'Y4') y4Col = c;
        if (val === 'Y5') y5Col = c;
        if (val === 'P1') p1Col = c;
        if (val === 'P2') p2Col = c;
      }
    }

    const firstStudentIdx = this._findFirstStudentRow(rows);
    let hasY4Data = false;

    if (y4Col !== -1 && firstStudentIdx !== -1) {
      for (let i = firstStudentIdx; i < Math.min(firstStudentIdx + 20, rows.length); i++) {
        const val = rows[i]?.[y4Col];
        if (val !== undefined && val !== '' && val !== 0 && val !== '0') {
          hasY4Data = true;
          break;
        }
      }
    }

    let finalP1Col = 9;
    let finalP2Col = 10;

    if (hasY4Data) {
      finalP1Col = y4Col;
      finalP2Col = y5Col !== -1 ? y5Col : y4Col;
    } else if (p1Col !== -1) {
      finalP1Col = p1Col;
      finalP2Col = p2Col !== -1 ? p2Col : p1Col;
    } else if (y4Col !== -1) {
      finalP1Col = y4Col;
      finalP2Col = y5Col !== -1 ? y5Col : y4Col;
    }

    return { p1Col: finalP1Col, p2Col: finalP2Col };
  }

  /** Belirli bir sınıfın satır aralığındaki (startRow - endRow) aktif Y1..Y5 sütunlarını bulur */
  _findActivePerfColumns(rows, startRow, endRow) {
    // 1) Bölümdeki öğrenci sayısını ve her sütun için girilen not sayılarını say
    let studentCount = 0;
    const colGradeCounts = { 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };

    for (let i = startRow; i < endRow; i++) {
      const row = rows[i];
      if (row) {
        const nr = parseInt(row[0], 10);
        if (!isNaN(nr) && nr >= 1) {
          studentCount++;
          for (let c = 6; c <= 10; c++) {
            const val = row[c];
            if (val !== undefined && val !== '' && val !== 0 && val !== '0') {
              colGradeCounts[c]++;
            }
          }
        }
      }
    }

    // 2) Aktif sütunları belirle (öğrencilerin en az %50'si için not girilmiş olmalı)
    const activeCols = [];
    const threshold = studentCount > 0 ? studentCount * 0.5 : 1;

    for (let c = 6; c <= 10; c++) {
      if (colGradeCounts[c] >= threshold) {
        activeCols.push(c);
      }
    }

    // 3) Eğer en az 2 adet sınıf geneli aktif sütun varsa, son 2 tanesini P1 ve P2 olarak al
    if (activeCols.length >= 2) {
      return {
        p1Col: activeCols[activeCols.length - 2],
        p2Col: activeCols[activeCols.length - 1]
      };
    }

    // 4) Yeterli aktif veri yoksa şablon başlıklarına göre fallback yap
    return this._findPerfColumns(rows);
  }

  /** Veri satırlarının başladığı ilk satırı bulur (sıra no = 1 olan satır) */
  _findFirstStudentRow(rows) {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r) {
        const nr = parseInt(r[0], 10);
        if (!isNaN(nr) && nr === 1 && typeof r[2] === 'string' && r[2].trim()) return i;
      }
    }
    return 18; // fallback
  }

  /** Belirli satır aralığından öğrenci verilerini çıkarır */
  _extractStudents(rows, startRow, endRow, p1Col, p2Col) {
    const students = [];
    let idCounter = 1;
    for (let i = startRow; i < endRow; i++) {
      const row = rows[i];
      if (!row) continue;
      // Öğrenci satırı: col0 sayısal (sıra no), col2 metin (isim)
      const nr = parseInt(row[0], 10);
      if (!isNaN(nr) && nr >= 1 && typeof row[2] === 'string' && row[2].trim()) {
        const p1Raw = row[p1Col];
        const p2Raw = row[p2Col];
        students.push(createStudent({
          id: idCounter++,
          okulNo: typeof row[1] === 'number' ? row[1] : parseInt(row[1]) || 0,
          adiSoyadi: String(row[2]).trim(),
          p1Notu: this._parseNote(p1Raw),
          p2Notu: this._parseNote(p2Raw),
        }));
      }
    }
    return students;
  }

  /** Not değerini sayıya dönüştürür */
  _parseNote(val) {
    if (val === '' || val == null) return 0;
    const n = typeof val === 'number' ? val : parseInt(String(val).trim(), 10);
    return isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
  }

  /** Toplam satırından sonraki öğretmen/müdür yardımcısı satırını okur */
  _extractMudurYardimcisi(rows, toplamRow) {
    // Toplam → boş → öğretmen satırı (toplamRow + 2)
    const teacherRow = rows[toplamRow + 2];
    if (!teacherRow) return '';
    const col5 = String(teacherRow[5] || '');
    // "İLKER SARAÇOĞLU\nMÜDÜR YARDIMCISI" formatında
    return col5.split('\n')[0].trim();
  }

  /** Toplam satırından sonraki öğretmen ve müdür imza isimlerini okur */
  _extractOgretmenVeMudur(rows, toplamRow) {
    const signatureRow = rows[toplamRow + 2];
    if (!signatureRow) return { ogretmenAdi: '', okulMuduru: '' };

    const col0 = String(signatureRow[0] || '');
    const col10 = String(signatureRow[10] || '');

    // Görev ünvanlarını temizle
    const ogretmenAdi = col0.split('\n')[0].replace(/DERS\s+ÖĞRETMENİ/i, '').trim();
    const okulMuduru = col10.split('\n')[0].replace(/MÜDÜR/i, '').trim();

    return { ogretmenAdi, okulMuduru };
  }

  /** Bölümlere otomatik sınıf/şube etiketi atar */
  _autoLabelSections(sections, globalMeta) {
    if (sections.length === 0) return;

    // İlk bölümden sınıf ve şube bilgisini parse et
    const firstLabel = globalMeta.sinifSubesiIlk || '';
    // Boşlukları temizleyerek "9. S I N I F / A   Ş UBESI" gibi aralıklı yazımları destekle
    const normalized = firstLabel.replace(/\s+/g, '');
    const match = normalized.match(/(\d+)\.[Ss][Iıİi\u0131\u0130][Nn][Iıİi\u0131\u0130][Ff]\/([A-Z])(?:[Şş\u015e\u015f][Uu][Bb][Ee][Ss][Iıİi\u0131\u0130])?/i);

    if (match) {
      const baseGrade = parseInt(match[1]);
      const baseChar = match[2].charCodeAt(0); // 'A' = 65

      let currentGrade = baseGrade;
      let charIndex = 0;
      let prevMudur = sections[0].mudurYardimcisi;

      for (let i = 0; i < sections.length; i++) {
        // Müdür yardımcısı değiştiyse sınıf seviyesi de değişmiş demektir
        if (i > 0 && sections[i].mudurYardimcisi && sections[i].mudurYardimcisi !== prevMudur) {
          currentGrade = currentGrade === 10 ? 12 : currentGrade + 1;
          charIndex = 0;
          prevMudur = sections[i].mudurYardimcisi;
        }

        const sube = String.fromCharCode(65 + charIndex); // A, B, C...
        if (i === 0) {
          sections[i].sinifSubesi = firstLabel;
        } else {
          sections[i].sinifSubesi = `${currentGrade}. Sınıf / ${sube} Şubesi`;
        }
        charIndex++;
      }
    }
  }

  /**
   * PDF dosya verisini sayfa sayfa analiz ederek sınıf ve ders isimlerini çıkarır
   * @param {ArrayBuffer} arrayBuffer
   * @returns {Promise<Array<{sinifSubesi: string, dersAdi: string}>>}
   */
  async parsePdf(arrayBuffer) {
    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) {
      throw new Error('PDF.js kütüphanesi yüklenemedi.');
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const pageMeta = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const textItems = textContent.items.map(item => item.str);
      const pageText = textItems.join(' ');

      const parts = pageText.split(":");
      if (parts.length >= 6) {
        // Sınıfı/Şubesi genellikle 4. indekstedir
        let sinif = parts[4].trim();
        sinif = sinif.split("Sıra")[0].split("Dersin")[0].split("Haftalık")[0].split("Ders Yılı")[0].trim();
        sinif = sinif.replace(/^[A-ZÇĞİÖŞÜa-zçğıöşüİı]+\s*[\-\–\—\−]\s*/i, '').trim();

        // Dersin Adı genellikle 5. indekstedir
        let ders = parts[5].trim();
        ders = ders.split("Sıra")[0].split("Haftalık")[0].split("Y A Z I L I")[0].split("Ö Ğ R E N C İ")[0].trim();

        // Temizleme sonrası boş kalırsa veya anormal uzunluktaysa regex fallback yap
        if (!sinif || sinif.length > 50) {
          const match = pageText.match(/Sınıfı\s*\/\s*Şubesi\s*:\s*([^:\n\r]+)/i);
          sinif = match ? match[1].split("Dersin")[0].trim() : '';
          sinif = sinif.replace(/^[A-ZÇĞİÖŞÜa-zçğıöşüİı]+\s*[\-\–\—\−]\s*/i, '').trim();
        }
        if (!ders || ders.length > 50) {
          const match = pageText.match(/Dersin\s*Adı\s*:\s*([^:\n\r]+)/i);
          ders = match ? match[1].split("Sıra")[0].trim() : '';
        }

        pageMeta.push({
          sinifSubesi: sinif,
          dersAdi: ders
        });
      } else {
        // Fallback regex araması
        const sinifMatch = pageText.match(/Sınıfı\s*\/\s*Şubesi\s*:\s*([^:\n\r]+)/i);
        const dersMatch = pageText.match(/Dersin\s*Adı\s*:\s*([^:\n\r]+)/i);

        const sinif = sinifMatch ? sinifMatch[1].split("Dersin")[0].trim() : '';
        const cleanSinif = sinif.replace(/^[A-ZÇĞİÖŞÜa-zçğıöşüİı]+\s*[\-\–\—\−]\s*/i, '').trim();

        pageMeta.push({
          sinifSubesi: cleanSinif,
          dersAdi: dersMatch ? dersMatch[1].split("Sıra")[0].trim() : ''
        });
      }
    }

    return pageMeta;
  }
}
