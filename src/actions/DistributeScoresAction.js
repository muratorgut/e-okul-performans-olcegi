/**
 * Puan dağıtım aksiyonu — kriterlere göre tüm öğrencilerin puanlarını dağıtır
 */
import { ScoreDistributionService } from '../services/ScoreDistributionService.js';

export function createDistributeAction(stateManager) {
  const service = new ScoreDistributionService();

  return async () => {
    const p1Kriterleri = stateManager.get('p1Kriterleri');
    const p2Kriterleri = stateManager.get('p2Kriterleri');

    // Doğrulama
    const v1 = service.validateKriteler(p1Kriterleri);
    const v2 = service.validateKriteler(p2Kriterleri);
    if (!v1.valid) throw new Error(`P1 Kriterleri: ${v1.message}`);
    if (!v2.valid) throw new Error(`P2 Kriterleri: ${v2.message}`);

    stateManager.setState('isProcessing', true);
    try {
      const sections = stateManager.get('sections');
      const updated = service.distributeForAllSections(sections, p1Kriterleri, p2Kriterleri);
      stateManager.setState('sections', updated);
      stateManager.setState('currentStep', 'preview');
    } finally {
      stateManager.setState('isProcessing', false);
    }
  };
}
