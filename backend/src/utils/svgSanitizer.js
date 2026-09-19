/**
 * Sunucu tarafı SVG XSS Sanitizer
 * SVG içeriğindeki zararlı JavaScript, XML Entity (XXE), olay dinleyicileri ve tehlikeli etiketleri temizler.
 */

function sanitizeSvg(svgContent) {
  if (typeof svgContent !== 'string') {
    return '';
  }

  let sanitized = svgContent;

  // 1. XXE / DTD saldırılarına karşı DOCTYPE ve ENTITY engelleme
  sanitized = sanitized.replace(/<!DOCTYPE[\s\S]*?>/gi, '');
  sanitized = sanitized.replace(/<!ENTITY[\s\S]*?>/gi, '');

  // 2. Kapsayıcı tehlikeli etiketlerin (içerikleriyle birlikte) temizlenmesi
  const containerTags = [
    'script',
    'iframe',
    'object',
    'embed',
    'foreignObject',
    'applet',
    'frame',
    'frameset',
    'audio',
    'video'
  ];

  for (const tag of containerTags) {
    // Çift etiketli yapı: <tag ...>...</tag>
    const pairedRegex = new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, 'gi');
    // Tek/self-closing etiket: <tag ... />
    const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');

    // İç içe durumlar için döngüsel temizlik
    while (pairedRegex.test(sanitized)) {
      sanitized = sanitized.replace(pairedRegex, '');
    }
    sanitized = sanitized.replace(selfClosingRegex, '');
  }

  // 3. Tekil meta / link / base etiketlerinin temizlenmesi
  const singleTags = ['meta', 'link', 'base'];
  for (const tag of singleTags) {
    const singleRegex = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
    sanitized = sanitized.replace(singleRegex, '');
  }

  // 4. Inline olay dinleyicilerinin kaldırılması (onload, onerror, onclick, onmouseover vb.)
  // Örn: onload="alert(1)", onclick='run()', onfocus=doSomething()
  sanitized = sanitized.replace(/\s+on[a-zA-Z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // 5. href ve xlink:href içindeki zararlı URL şemalarının kaldırılması (javascript:, vbscript:, data:text/html)
  sanitized = sanitized.replace(
    /\s+(?:xlink:href|href)\s*=\s*(?:"\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^"]*"|'\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^']*'|[^\s>]*javascript:[^\s>]*)/gi,
    ''
  );

  // 6. CSS / style içi zararlı javascript: ve expression() ifadelerinin kaldırılması
  sanitized = sanitized.replace(/expression\s*\([^)]*\)/gi, '');
  sanitized = sanitized.replace(/url\s*\(\s*["']?\s*javascript:[^"')]*["']?\s*\)/gi, '');

  return sanitized.trim();
}

module.exports = { sanitizeSvg };
