/**
 * Dosya yükleme ve meta veri ayıklama aksiyonu
 */
import { FileParserService } from '../services/FileParserService.js';

export function createParseAction(stateManager) {
  const parser = new FileParserService();

  return async (arrayBuffer, fileName, pdfBuffer, pdfName) => {
    stateManager.setState('isProcessing', true);
    try {
      const result = parser.parse(arrayBuffer, fileName);
      
      // Eğer PDF dosyası da yüklendiyse, sayfa bazlı meta verileri çek ve bölümlere eşleştir
      if (pdfBuffer) {
        try {
          const pdfMeta = await parser.parsePdf(pdfBuffer);
          console.log("PDF'ten okunan sınıf ve ders bilgileri:", pdfMeta);
          
          result.sections.forEach((section, idx) => {
            if (pdfMeta[idx]) {
              if (pdfMeta[idx].sinifSubesi) {
                section.sinifSubesi = pdfMeta[idx].sinifSubesi;
              }
              if (pdfMeta[idx].dersAdi) {
                section.dersAdi = pdfMeta[idx].dersAdi;
              }
            }
          });
        } catch (pdfErr) {
          console.warn("PDF ayrıştırılırken hata oluştu, Excel tahminleri kullanılacak:", pdfErr);
        }
      }

      stateManager.setState('globalMeta', result.globalMeta);
      stateManager.setState('sections', result.sections);
      stateManager.setState('currentStep', 'configure');
    } catch (err) {
      console.error('Dosya ayrıştırma hatası:', err);
      throw err;
    } finally {
      stateManager.setState('isProcessing', false);
    }
  };
}
