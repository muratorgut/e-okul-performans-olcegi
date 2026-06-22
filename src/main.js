import { createInitialState } from './models/AppState.js';
import { StateManager } from './state/StateManager.js';

// Actions
import { createParseAction } from './actions/ParseAndExtractMetadataAction.js';
import { createDistributeAction } from './actions/DistributeScoresAction.js';
import { createGenerateAction } from './actions/GenerateDocxAction.js';

// Components
import { FileUploaderComponent } from './components/FileUploaderComponent.js';
import { MetadataDisplayComponent } from './components/MetadataDisplayComponent.js';
import { SectionManagerComponent } from './components/SectionManagerComponent.js';
import { KriterConfigComponent } from './components/KriterConfigComponent.js';
import { PreviewComponent } from './components/PreviewComponent.js';
import { ExportDocxComponent } from './components/ExportDocxComponent.js';

// 1. State ve StateManager Başlatma
const initialState = createInitialState();
const stateManager = new StateManager(initialState);

// 2. Aksiyonları Oluşturma
const parseAction = createParseAction(stateManager);
const distributeAction = createDistributeAction(stateManager);
const generateAction = createGenerateAction(stateManager);

// 3. UI Bileşenlerini Başlatma
const uploader = new FileUploaderComponent('file-uploader-container', async (excelData, pdfData) => {
  try {
    await parseAction(excelData.buffer, excelData.name, pdfData?.buffer, pdfData?.name);
    // Yükleme tamamlandığında bir sonraki adıma geç
    stateManager.setState('currentStep', 'configure');
  } catch (err) {
    alert('Dosya ayrıştırılırken bir hata oluştu: ' + err.message);
    // Spinner'ı kapatmak için uploader'ı yeniden render et
    uploader.render();
  }
});
uploader.render();

const metadataDisplay = new MetadataDisplayComponent('metadata-display-container', stateManager);
const sectionManager = new SectionManagerComponent('section-manager-container', stateManager);
const kriterConfig = new KriterConfigComponent('kriter-config-container', stateManager, distributeAction);
const previewComp = new PreviewComponent('preview-container', stateManager);
const exportComp = new ExportDocxComponent('export-container', stateManager, generateAction);

// İlk renderlar
metadataDisplay.render();
sectionManager.render();
kriterConfig.render();
previewComp.render();
exportComp.render();

// 4. Wizard Adım Yönetimi (Reaktif Step Switcher)
const steps = ['upload', 'configure', 'preview', 'export'];

stateManager.subscribe('currentStep', (state) => {
  const currentStep = state.currentStep;
  const currentIdx = steps.indexOf(currentStep);

  // Panellerin görünürlüğünü güncelle
  steps.forEach(step => {
    const panel = document.getElementById(`panel-${step}`);
    if (panel) {
      if (step === currentStep) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    }

    // Stepper halkalarının durumunu güncelle
    const stepNode = document.getElementById(`step-node-${step}`);
    if (stepNode) {
      const nodeIdx = steps.indexOf(step);
      if (nodeIdx < currentIdx) {
        stepNode.classList.add('completed');
        stepNode.classList.remove('active');
      } else if (nodeIdx === currentIdx) {
        stepNode.classList.add('active');
        stepNode.classList.remove('completed');
      } else {
        stepNode.classList.remove('active', 'completed');
      }
    }
  });

  // Sayfayı en yukarı kaydır
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
