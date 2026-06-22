/**
 * Puan Dağıtım Algoritması Servisi
 * 5'in katları şeklinde rastgele dağıtım + küsurat kontrolü
 */
export class ScoreDistributionService {

  /** Kriterlerin toplam puanını doğrular */
  validateKriteler(kriterler) {
    const total = kriterler.reduce((s, k) => s + k.maxPuan, 0);
    return {
      valid: total === 100,
      total,
      message: total === 100 ? 'Toplam puan doğru: 100' : `Toplam puan ${total}, 100 olmalı (${total < 100 ? `${100 - total} eksik` : `${total - 100} fazla`})`,
    };
  }

  /**
   * Hedef puanı kriterlere 5'in katları halinde rastgele dağıtır
   * @param {number} hedefPuan - Öğrencinin e-okul notu (0-100)
   * @param {Array<{id:string, kriterAdi:string, maxPuan:number}>} kriterler
   * @returns {number[]} Her kriter için atanmış puan dizisi
   */
  distributeScore(hedefPuan, kriterler) {
    // Kenar durumları
    hedefPuan = Math.round(hedefPuan);
    if (hedefPuan <= 0) return kriterler.map(() => 0);
    if (hedefPuan > 100) hedefPuan = 100;
    if (hedefPuan === 100) return kriterler.map(k => k.maxPuan);

    const n = kriterler.length;
    const result = new Array(n).fill(0);

    // 5'in katı olan taban ve küsurat
    const base = Math.floor(hedefPuan / 5) * 5;
    const kusurat = hedefPuan - base;
    const birimSayisi = base / 5;

    // Her kriter için max birim sayısı
    const maxBirimler = kriterler.map(k => Math.floor(k.maxPuan / 5));
    const toplamMaxBirim = maxBirimler.reduce((s, v) => s + v, 0);

    // Birimleri ağırlıklı rastgele dağıt
    const atananBirimler = new Array(n).fill(0);
    let kalanBirim = birimSayisi;

    // EĞER NOT >= 70 ise ve yeterli alan varsa, her kritere en az 5 puan (1 birim) ön tanımlı vererek 0 alınmasını engelle
    if (hedefPuan >= 70 && birimSayisi >= n) {
      atananBirimler.fill(1);
      kalanBirim = birimSayisi - n;
    }

    // Fisher-Yates shuffle yardımcı
    const shuffleIndices = () => {
      const idx = Array.from({ length: n }, (_, i) => i);
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
      return idx;
    };

    // Birim birim dağıt (Her döngüde sadece 1 adet 5 puanlık birim yerleştir)
    let maxAttempts = birimSayisi * 10;
    while (kalanBirim > 0 && maxAttempts-- > 0) {
      const indices = shuffleIndices();
      let placed = false;
      for (const i of indices) {
        if (atananBirimler[i] < maxBirimler[i]) {
          atananBirimler[i]++;
          kalanBirim--;
          placed = true;
          break; // Sadece 1 birim yerleştirip tekrar karıştırıyoruz
        }
      }
      if (!placed) break; // Tüm kriterler dolu
    }

    // Birimleri puana çevir
    for (let i = 0; i < n; i++) {
      result[i] = atananBirimler[i] * 5;
    }

    // Küsurat dağıtımı (1-4 puan)
    if (kusurat > 0) {
      let kalanKusurat = kusurat;
      const shuffled = shuffleIndices();
      for (const i of shuffled) {
        if (kalanKusurat <= 0) break;
        const headroom = kriterler[i].maxPuan - result[i];
        if (headroom > 0) {
          const ekle = Math.min(kalanKusurat, headroom);
          result[i] += ekle;
          kalanKusurat -= ekle;
        }
      }
    }

    // Son doğrulama — toplam hedef puana eşit olmalı
    const toplam = result.reduce((s, v) => s + v, 0);
    if (toplam !== hedefPuan) {
      // Fark varsa son kriterlere ekle/çıkar
      let fark = hedefPuan - toplam;
      for (let i = n - 1; i >= 0 && fark !== 0; i--) {
        if (fark > 0) {
          const ekle = Math.min(fark, kriterler[i].maxPuan - result[i]);
          result[i] += ekle;
          fark -= ekle;
        } else {
          const cikar = Math.min(-fark, result[i]);
          result[i] -= cikar;
          fark += cikar;
        }
      }
    }

    return result;
  }

  /** Tek bir öğrenci için P1 ve P2 dağılımını hesaplar */
  distributeForStudent(student, p1Kriterler, p2Kriterler) {
    return {
      ...student,
      p1DagilimListesi: this.distributeScore(student.p1Notu, p1Kriterler),
      p2DagilimListesi: this.distributeScore(student.p2Notu, p2Kriterler),
    };
  }

  /** Tüm bölümlerdeki tüm öğrenciler için dağıtım yapar */
  distributeForAllSections(sections, p1Kriterler, p2Kriterler) {
    return sections.map(section => ({
      ...section,
      students: section.students.map(s => this.distributeForStudent(s, p1Kriterler, p2Kriterler)),
    }));
  }
}
