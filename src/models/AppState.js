/**
 * E-Okul Performans Ölçeği - Veri Modelleri
 * Antigravity Data Models katmanı
 */

/** @typedef {{okulAdi:string, dersAdi:string, sinifSubesi:string, donemBilgisi:string, haftalikSaat:string}} MetadataModel */
/** @typedef {{id:number, okulNo:number, adiSoyadi:string, p1Notu:number, p2Notu:number, p1DagilimListesi:number[], p2DagilimListesi:number[]}} StudentModel */
/** @typedef {{id:string, kriterAdi:string, maxPuan:number}} KriterModel */
/** @typedef {{id:string, sinifSubesi:string, dersAdi:string, mudurYardimcisi:string, students:StudentModel[]}} SectionModel */

/** Varsayılan MetadataModel oluşturur */
export function createMetadata(overrides = {}) {
  return { okulAdi: '', dersAdi: '', sinifSubesi: '', donemBilgisi: '', haftalikSaat: '', p1Baslik: 'SINIF İÇİ', p2Baslik: 'PERFORMANS ÇALIŞMASI', ogretmenAdi: '', ogretmenBrans: '', okulMuduru: '', ...overrides };
}

/** Varsayılan StudentModel oluşturur */
export function createStudent(overrides = {}) {
  return { id: 0, okulNo: 0, adiSoyadi: '', p1Notu: 0, p2Notu: 0, p1DagilimListesi: [], p2DagilimListesi: [], ...overrides };
}

/** Varsayılan KriterModel oluşturur */
export function createKriter(overrides = {}) {
  return { id: crypto.randomUUID(), kriterAdi: '', maxPuan: 0, ...overrides };
}

/** Varsayılan SectionModel oluşturur */
export function createSection(overrides = {}) {
  return { id: crypto.randomUUID(), sinifSubesi: '', dersAdi: '', mudurYardimcisi: '', students: [], ...overrides };
}

/** Uygulamanın başlangıç state'ini oluşturur */
export function createInitialState() {
  return {
    globalMeta: { okulAdi: '', donemBilgisi: '', dersAdi: '', haftalikSaat: '', p1Baslik: 'SINIF İÇİ', p2Baslik: 'PERFORMANS ÇALIŞMASI', ogretmenAdi: '', ogretmenBrans: '', okulMuduru: '' },
    sections: [],
    p1Kriterleri: [
      createKriter({ kriterAdi: 'Dersi öğrenmeye istekli oluşu', maxPuan: 10 }),
      createKriter({ kriterAdi: 'Derse hazırlıklı gelir.', maxPuan: 10 }),
      createKriter({ kriterAdi: 'Ödevlerini tam ve zamanında yapar.', maxPuan: 20 }),
      createKriter({ kriterAdi: 'Dersin ve sınıfın huzurunu bozacak hareketlerden kaçınır.', maxPuan: 20 }),
      createKriter({ kriterAdi: 'Ders Sırasında Defter ve Kitaplarını Aktif Olarak kullanır', maxPuan: 20 }),
      createKriter({ kriterAdi: 'Yapılan ara testlerdeki başarısı.', maxPuan: 20 }),
    ],
    p2Kriterleri: [
      createKriter({ kriterAdi: 'Araştırma Sorusu ve Hedeflere uygunluk', maxPuan: 10 }),
      createKriter({ kriterAdi: 'Kaynakların güncelliği ve güvenilirliği.', maxPuan: 10 }),
      createKriter({ kriterAdi: 'Veri toplama sürecinin düzeni ve doğruluğu.', maxPuan: 20 }),
      createKriter({ kriterAdi: 'Görsel materyallerin kullanımının uygunluğu.', maxPuan: 20 }),
      createKriter({ kriterAdi: 'Araştırmanın özgünlüğü.', maxPuan: 20 }),
      createKriter({ kriterAdi: 'Sözlü veya yazılı sunumun etkili ve anlaşılır oluşu.', maxPuan: 20 }),
    ],
    isProcessing: false,
    currentStep: 'upload',
  };
}
