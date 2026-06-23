/**
 * DOCX Export Servisi — Resmi Performans Değerlendirme Ölçeği belgesi üretir
 * Antigravity Service katmanı
 */
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, AlignmentType, BorderStyle, PageOrientation,
  convertInchesToTwip, HeightRule, TextDirection, TabStopType
} from 'docx';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

const BORDER = { style: BorderStyle.SINGLE, size: 1, color: '000000' };
const ALL_BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

export class DocxExportService {

  /** Tek bir bölüm ve performans türü için sayfa konfigürasyonu ve içeriği üretir */
  createSectionOptions(globalMeta, section, kriterler, performansTuru) {
    const dagilimKey = performansTuru === 'P1' ? 'p1DagilimListesi' : 'p2DagilimListesi';
    const notKey = performansTuru === 'P1' ? 'p1Notu' : 'p2Notu';

    // Özelleştirilebilir performans başlığı
    const customTitle = performansTuru === 'P1' 
      ? (globalMeta.p1Baslik || 'PERFORMANS DEĞERLENDİRME ÖLÇEĞİ') 
      : (globalMeta.p2Baslik || 'PERFORMANS DEĞERLENDİRME ÖLÇEĞİ');

    // Başlık paragrafları (Aynı font büyüklüğü (22), hepsi kalın (true), hepsi büyük harf)
    const cleanSinifSubesi = (section.sinifSubesi || '').replace(/^[A-ZÇĞİÖŞÜa-zçğıöşüİı]+\s*[\-\–\—\−]\s*/i, '').trim();
    const cleanDonem = (globalMeta.donemBilgisi || '')
      .replace(/\s*PUAN\s*(?:ÇİZELGESİ|İZELGESİ|ZELGESİ|ÇIZELGESI|IZELGESI|ZELGESI)/i, '')
      .trim();
    const headerParagraphs = [
      this._centered('T.C.', 22, true),
      this._centered('MİLLÎ EĞİTİM BAKANLIĞI', 22, true),
      this._centered(globalMeta.okulAdi.toUpperCase(), 22, true),
      this._centered(`${cleanDonem} ${section.dersAdi} DERSİ ${cleanSinifSubesi}`.toUpperCase(), 22, true),
      this._centered(customTitle.toUpperCase(), 22, true),
      new Paragraph({ text: '' }),
    ];

    // Kolon genişlik yüzdeleri (Toplamı 100 olmalı)
    const kWidth = 50 / kriterler.length; // Kriterlere eşit dağıtılan %50

    // Tablo başlık satırı (Kriter kolonları dikey)
    const headerCells = [
      this._headerCell('Sıra\nNo', 5, false),
      this._headerCell('Okul\nNo', 8, false),
      this._headerCell('Adı Soyadı', 30, false),
      ...kriterler.map(k => this._headerCell(`${k.kriterAdi}\n(${k.maxPuan} Puan)`, kWidth, true)),
      this._headerCell('Toplam', 7, false),
    ];

    // Kriter başlık satır yüksekliği
    const headerRow = new TableRow({ 
      children: headerCells, 
      tableHeader: true,
      height: { value: 2800, rule: HeightRule.ATLEAST }
    });

    // Öğrenci veri satırları (Kriterler listesinden okunarak kolon kayması önlendi)
    const dataRows = section.students.map((s, idx) => {
      const dagilim = s[dagilimKey] || [];
      const toplam = dagilim.reduce((sum, v) => sum + v, 0);
      return new TableRow({
        children: [
          this._dataCell(String(idx + 1), 5, true),
          this._dataCell(String(s.okulNo), 8, true),
          this._dataCell(s.adiSoyadi, 30, false),
          ...kriterler.map((_, kIdx) => {
            const val = dagilim[kIdx] !== undefined ? dagilim[kIdx] : 0;
            return this._dataCell(String(val), kWidth, true);
          }),
          this._dataCell(String(toplam), 7, true),
        ],
      });
    });

    // Sayfa genişliğine tam oturan tablo (%100 genişlik)
    const table = new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    // Öğretmen branş eki düzenlemesi (örn: KİMYA -> KİMYA ÖĞRETMENİ)
    const bransRaw = globalMeta.ogretmenBrans || '';
    const bransHeader = bransRaw.toUpperCase().includes('ÖĞRETMEN')
      ? bransRaw.toUpperCase()
      : `${bransRaw.toUpperCase()} ÖĞRETMENİ`;

    // Tablosuz, TabStop ile Hizalanmış İmza Paragrafları
    // A4 dikey sayfa net genişliği 10466 DXA civarıdır.
    // Sol sütun merkezi 2000 DXA, Sağ sütun merkezi 8200 DXA
    const signTabStops = [
      { type: TabStopType.CENTER, position: 2000 },
      { type: TabStopType.CENTER, position: 8200 }
    ];

    const signParagraphs = [
      new Paragraph({ text: '' }),
      new Paragraph({ text: '' }),
      new Paragraph({
        tabStops: signTabStops,
        children: [
          new TextRun({ text: "\t", font: 'Times New Roman' }), // Sol boş
          new TextRun({ text: "\t", font: 'Times New Roman' }), // Sağ boş
          new TextRun({ text: "... / ... / 202...", size: 20, font: 'Times New Roman' }) // Sağ tarih
        ]
      }),
      new Paragraph({
        tabStops: signTabStops,
        children: [
          new TextRun({ text: "\t", font: 'Times New Roman' }), // Sol boş
          new TextRun({ text: "\t", font: 'Times New Roman' }), // Sağ boş
          new TextRun({ text: "UYGUNDUR", bold: true, size: 20, font: 'Times New Roman' }) // Sağ UYGUNDUR
        ]
      }),
      new Paragraph({ text: '' }), // İmzalar için boşluk
      new Paragraph({
        tabStops: signTabStops,
        children: [
          new TextRun({ text: "\t", font: 'Times New Roman' }),
          new TextRun({ text: globalMeta.ogretmenAdi || 'Öğretmen Adı Soyadı', bold: true, size: 20, font: 'Times New Roman' }),
          new TextRun({ text: "\t", font: 'Times New Roman' }),
          new TextRun({ text: globalMeta.okulMuduru || 'Müdür Adı Soyadı', bold: true, size: 20, font: 'Times New Roman' })
        ]
      }),
      new Paragraph({
        tabStops: signTabStops,
        children: [
          new TextRun({ text: "\t", font: 'Times New Roman' }),
          new TextRun({ text: bransHeader, size: 20, font: 'Times New Roman' }),
          new TextRun({ text: "\t", font: 'Times New Roman' }),
          new TextRun({ text: "Okul Müdürü", size: 20, font: 'Times New Roman' })
        ]
      })
    ];

    return {
      properties: {
        page: {
          size: { orientation: PageOrientation.PORTRAIT, width: 11906, height: 16838 },
          margin: {
            top: convertInchesToTwip(0.5),
            bottom: convertInchesToTwip(0.5),
            left: convertInchesToTwip(0.5),
            right: convertInchesToTwip(0.5),
          },
        },
      },
      children: [
        ...headerParagraphs, 
        table, 
        ...signParagraphs
      ]
    };
  }

  /** Tek bir DOCX belgesi oluşturur */
  createDocx(globalMeta, section, kriterler, performansTuru) {
    const sectionOptions = this.createSectionOptions(globalMeta, section, kriterler, performansTuru);
    return new Document({
      sections: [sectionOptions]
    });
  }

  /** Dosya adı oluşturur (Türkçe karakter sanitize) */
  generateFileName(section, dersAdi, performansTuru) {
    const sanitize = (s) => s
      .replace(/ç/gi, 'c').replace(/ğ/gi, 'g').replace(/ı/gi, 'i')
      .replace(/ö/gi, 'o').replace(/ş/gi, 's').replace(/ü/gi, 'u')
      .replace(/İ/g, 'I').replace(/[^a-zA-Z0-9\-_]/g, '_')
      .replace(/_+/g, '_').replace(/^_|_$/g, '');

    const sinif = sanitize(section.sinifSubesi);
    const ders = sanitize(dersAdi);
    return `${sinif}_${ders}_${performansTuru}_Performans_Olcegi.docx`;
  }

  /** Tek DOCX indirme */
  async exportSingleDocx(globalMeta, section, kriterler, performansTuru) {
    const doc = this.createDocx(globalMeta, section, kriterler, performansTuru);
    const blob = await Packer.toBlob(doc);
    const fileName = this.generateFileName(section, section.dersAdi || globalMeta.dersAdi, performansTuru);
    saveAs(blob, fileName);
  }

  /** Tüm DOCX dosyalarını ZIP olarak indir */
  async exportAllAsZip(globalMeta, sections, p1Kriterler, p2Kriterler, onProgress) {
    const zip = new JSZip();
    const total = sections.length * 2;
    let done = 0;

    for (const section of sections) {
      for (const pt of ['P1', 'P2']) {
        const kriterler = pt === 'P1' ? p1Kriterler : p2Kriterler;
        const doc = this.createDocx(globalMeta, section, kriterler, pt);
        const blob = await Packer.toBlob(doc);
        const fileName = this.generateFileName(section, section.dersAdi || globalMeta.dersAdi, pt);
        zip.file(fileName, blob);
        done++;
        if (onProgress) onProgress(done, total);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, 'Performans_Olcekleri.zip');
  }

  /** Tüm sınıfları ve performans türlerini sırayla tek bir DOCX belgesinde birleştirir */
  async exportAllInSingleDocx(globalMeta, sections, p1Kriterler, p2Kriterler, onProgress) {
    const docSections = [];
    const total = sections.length * 2;
    let done = 0;

    for (const section of sections) {
      for (const pt of ['P1', 'P2']) {
        const kriterler = pt === 'P1' ? p1Kriterler : p2Kriterler;
        const sectionOptions = this.createSectionOptions(globalMeta, section, kriterler, pt);
        docSections.push(sectionOptions);
        done++;
        if (onProgress) onProgress(done, total);
      }
    }

    const doc = new Document({
      sections: docSections
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, 'Tum_Performans_Olcekleri_Birlesik.docx');
  }

  // — Yardımcı metodlar —

  _centered(text, fontSize, bold) {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold, size: fontSize, font: 'Times New Roman' })],
    });
  }

  _headerCell(text, widthPercent, vertical) {
    return new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      borders: ALL_BORDERS,
      textDirection: vertical ? TextDirection.BOTTOM_TO_TOP_LEFT_TO_RIGHT : TextDirection.LEFT_TO_RIGHT_TOP_TO_BOTTOM,
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, size: 18, font: 'Times New Roman' })],
      })],
      verticalAlign: 'center',
    });
  }

  _dataCell(text, widthPercent, centered) {
    return new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      borders: ALL_BORDERS,
      children: [new Paragraph({
        alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [new TextRun({ text, size: 18, font: 'Times New Roman' })],
      })],
      verticalAlign: 'center',
    });
  }
}
