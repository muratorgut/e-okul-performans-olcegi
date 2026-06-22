/**
 * DOCX oluşturma ve indirme aksiyonu
 */
import { DocxExportService } from '../services/DocxExportService.js';

export function createGenerateAction(stateManager) {
  const service = new DocxExportService();

  return {
    /** Tek bir bölüm+performans türü için DOCX indir */
    async exportSingle(sectionId, performansTuru) {
      const state = stateManager.getState();
      const section = state.sections.find(s => s.id === sectionId);
      if (!section) throw new Error('Bölüm bulunamadı');
      const kriterler = performansTuru === 'P1' ? state.p1Kriterleri : state.p2Kriterleri;
      await service.exportSingleDocx(state.globalMeta, section, kriterler, performansTuru);
    },

    /** Tüm bölümlerin P1+P2 DOCX dosyalarını ZIP olarak indir */
    async exportAll(onProgress) {
      stateManager.setState('isProcessing', true);
      try {
        const state = stateManager.getState();
        await service.exportAllAsZip(state.globalMeta, state.sections, state.p1Kriterleri, state.p2Kriterleri, onProgress);
      } finally {
        stateManager.setState('isProcessing', false);
      }
    },

    /** Tüm bölümlerin P1+P2 DOCX tablolarını tek bir sıralı DOCX dosyasında birleştirip indir */
    async exportAllSingleDocx(onProgress) {
      stateManager.setState('isProcessing', true);
      try {
        const state = stateManager.getState();
        await service.exportAllInSingleDocx(state.globalMeta, state.sections, state.p1Kriterleri, state.p2Kriterleri, onProgress);
      } finally {
        stateManager.setState('isProcessing', false);
      }
    }
  };
}
