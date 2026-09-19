const {
  calcQuestionScore,
  buildScoreTable,
  findScore,
  sanitizeExcelCell
} = require('../../src/controllers/surveyController');

describe('Puanlama ve Güvenlik Birim Testleri (P-04, P-06)', () => {
  describe('Puan Hesaplama (calcQuestionScore)', () => {
    it('AC-SCORE-1 rating tipindeki soru için sayısal puanı döndürmeli', () => {
      const q = { type: 'rating' };
      expect(calcQuestionScore(q, '5')).toBe(5);
      expect(calcQuestionScore(q, 4)).toBe(4);
      expect(calcQuestionScore(q, null)).toBe(0);
    });

    it('AC-SCORE-2 multiple_choice tipindeki soru için seçenek puanını hesaplamalı', () => {
      const q = {
        type: 'multiple_choice',
        options: [
          { text: 'İyi', score: 10 },
          { text: 'Orta', score: 5 },
          { text: 'Kötü', score: 0 }
        ]
      };
      expect(calcQuestionScore(q, 'İyi')).toBe(10);
      expect(calcQuestionScore(q, 'Orta')).toBe(5);
      expect(calcQuestionScore(q, 'Bilinmeyen')).toBe(0);
    });

    it('AC-SCORE-3 matrix tipindeki soru için satır bazlı toplam puanı hesaplamalı', () => {
      const q = {
        type: 'matrix',
        options: {
          rows: ['Hız', 'Kalite', 'İletişim'],
          columns: [
            { text: 'Mükemmel', score: 10 },
            { text: 'Yetersiz', score: 2 }
          ]
        }
      };
      // 0: Hız -> Mükemmel (10), 1: Kalite -> Yetersiz (2), 2: İletişim -> Mükemmel (10) => 22
      const answer = { '0': 'Mükemmel', '1': 'Yetersiz', '2': 'Mükemmel' };
      expect(calcQuestionScore(q, answer)).toBe(22);
    });
  });

  describe('Puan Tablosu Oluşturma (buildScoreTable)', () => {
    it('AC-SCORE-4 çoktan seçmeli yanıtlardan frekans ve toplam puan tablosu oluşturmalı', () => {
      const q = {
        type: 'multiple_choice',
        options: [
          { text: 'Evet', score: 10 },
          { text: 'Hayır', score: 0 }
        ]
      };
      const answers = [
        { value: 'Evet' },
        { value: 'Evet' },
        { value: 'Hayır' }
      ];
      const table = buildScoreTable(q, answers);
      expect(table).toEqual([
        { text: 'Evet', score: 10, count: 2, totalScore: 20 },
        { text: 'Hayır', score: 0, count: 1, totalScore: 0 }
      ]);
    });
  });

  describe('Excel Formül Enjeksiyonu Koruması (P-06)', () => {
    it('AC-22 zararlı formül önekleri içeren hücre değerlerini güvenli hale getirmeli', () => {
      expect(sanitizeExcelCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(sanitizeExcelCell('+cmd|/c calc')).toBe("'+cmd|/c calc");
      expect(sanitizeExcelCell('-10+20')).toBe("'-10+20");
      expect(sanitizeExcelCell('@SUM(1,2)')).toBe("'@SUM(1,2)");
      expect(sanitizeExcelCell('\tTabText')).toBe("'\tTabText");
    });

    it('AC-22 zararsız ve sayısal değerleri değiştirmeden bırakmalı', () => {
      expect(sanitizeExcelCell('Normal Metin')).toBe('Normal Metin');
      expect(sanitizeExcelCell(12345)).toBe(12345);
      expect(sanitizeExcelCell(true)).toBe(true);
      expect(sanitizeExcelCell(null)).toBe('');
      expect(sanitizeExcelCell(undefined)).toBe('');
    });
  });
});
