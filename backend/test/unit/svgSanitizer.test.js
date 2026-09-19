const { sanitizeSvg } = require('../../src/utils/svgSanitizer');

describe('SVG Sanitizer Birim Testleri (AC-23 / Güvenlik)', () => {
  it('AC-23: Zararsız SVG içeriğini değiştirmeden korumalıdır', () => {
    const validSvg = '<svg width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" /></svg>';
    const sanitized = sanitizeSvg(validSvg);
    expect(sanitized).toContain('<svg');
    expect(sanitized).toContain('<circle');
    expect(sanitized).toContain('fill="yellow"');
  });

  it('AC-23: <script> etiketlerini ve içeriğini temizlemelidir', () => {
    const maliciousSvg = '<svg><script>alert("XSS")</script><rect width="100" height="100" /></svg>';
    const sanitized = sanitizeSvg(maliciousSvg);
    expect(sanitized).not.toContain('<script');
    expect(sanitized).not.toContain('alert("XSS")');
    expect(sanitized).toContain('<rect width="100" height="100" />');
  });

  it('AC-23: Inline on* olay dinleyicilerini (onload, onerror, onclick vb.) temizlemelidir', () => {
    const maliciousSvg = '<svg onload="alert(1)"><circle cx="10" cy="10" r="5" onclick="fetch(\'/api/steal\')" onerror="malicious()" /></svg>';
    const sanitized = sanitizeSvg(maliciousSvg);
    expect(sanitized).not.toContain('onload');
    expect(sanitized).not.toContain('onclick');
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).toContain('<svg');
    expect(sanitized).toContain('<circle cx="10" cy="10" r="5"');
  });

  it('AC-23: href ve xlink:href içindeki javascript: ve data:text/html bağlantılarını temizlemelidir', () => {
    const maliciousSvg = '<svg><a href="javascript:alert(1)"><text>Link</text></a><a xlink:href="javascript:evil()"><text>Link2</text></a><a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="><text>Link3</text></a></svg>';
    const sanitized = sanitizeSvg(maliciousSvg);
    expect(sanitized).not.toContain('javascript:alert(1)');
    expect(sanitized).not.toContain('javascript:evil()');
    expect(sanitized).not.toContain('data:text/html');
  });

  it('AC-23: <iframe>, <object>, <embed>, <foreignObject> gibi tehlikeli etiketleri temizlemelidir', () => {
    const maliciousSvg = '<svg><foreignObject width="100" height="50"><iframe src="http://evil.com"></iframe></foreignObject><embed src="evil.swf" /><object data="evil.pdf"></object></svg>';
    const sanitized = sanitizeSvg(maliciousSvg);
    expect(sanitized).not.toContain('foreignObject');
    expect(sanitized).not.toContain('iframe');
    expect(sanitized).not.toContain('embed');
    expect(sanitized).not.toContain('object');
  });

  it('AC-23: XML entity injection (XXE / DOCTYPE) tanımlarını kaldırmalıdır', () => {
    const xxeSvg = '<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg>&xxe;</svg>';
    const sanitized = sanitizeSvg(xxeSvg);
    expect(sanitized).not.toContain('<!DOCTYPE');
    expect(sanitized).not.toContain('<!ENTITY');
  });
});
