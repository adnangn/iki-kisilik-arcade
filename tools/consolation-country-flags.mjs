// Local, simplified national flags inside the same pastel reserve-card frame.
// References: Tuvalu National Flag Act; nauru.gov.nr/about-naoero;
// palaugov.pw/about-palau/flag; timor-leste.gov.tl/?lang=pt&p=34;
// rminitijela.com/wp-content/uploads/2025/01/1979-0001_1.pdf.
// Small emblems retain their identifying shapes; these are pixel illustrations.
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
const polygon = (points, fill) => `<polygon points="${points}" fill="${fill}"/>`;
const rect = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
const path = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
const circle = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const star = (x, y, radius, fill = '#fff', points = 5, rotation = -90) => polygon(Array.from({ length: points * 2 }, (_, i) => {
  const angle = (rotation + i * 180 / points) * Math.PI / 180;
  const r = i % 2 ? radius * .4 : radius;
  return `${+(x + Math.cos(angle) * r).toFixed(2)},${+(y + Math.sin(angle) * r).toFixed(2)}`;
}).join(' '), fill);

function flag(code) {
  const red = '#cf2337', yellow = '#f7d34b', navy = '#153768';
  switch (code) {
    case 'tv': {
      const union = rect(0, 0, 90, 50, '#183c76')
        + '<path d="M0 0L90 50M90 0L0 50" stroke="#fff" stroke-width="10"/>'
        + '<path d="M0 0L90 50M90 0L0 50" stroke="#ce2436" stroke-width="4"/>'
        + rect(36, 0, 18, 50, '#fff') + rect(0, 18, 90, 14, '#fff')
        + rect(40, 0, 10, 50, '#ce2436') + rect(0, 21, 90, 8, '#ce2436');
      return rect(0, 0, 180, 100, '#58b4dc')
        + '<defs><clipPath id="tv-canton"><rect width="90" height="50"/></clipPath></defs>'
        + `<g clip-path="url(#tv-canton)">${union}</g>`
        + [[104, 82], [122, 67], [140, 72], [146, 51], [165, 56], [125, 41], [143, 28], [154, 12], [172, 20]]
          .map(([x, y]) => star(x, y, 7, yellow)).join('');
    }
    case 'nr': return rect(0, 0, 180, 100, '#113476') + rect(0, 46, 180, 8, '#f6cd35') + star(45, 75, 17, '#fff', 12);
    case 'ki': {
      let sun = '';
      for (let i = 0; i < 17; i++) {
        const a = Math.PI + i * Math.PI / 16, b = a - .045, c = a + .045;
        sun += polygon(`${90 + Math.cos(b) * 14},${56 + Math.sin(b) * 14} ${90 + Math.cos(a) * 29},${56 + Math.sin(a) * 29} ${90 + Math.cos(c) * 14},${56 + Math.sin(c) * 14}`, yellow);
      }
      let waves = '';
      for (let i = 0; i < 6; i++) {
        const y = 55 + i * 8;
        waves += path(`M0 ${y}Q15 ${y - 7} 30 ${y}T60 ${y}T90 ${y}T120 ${y}T150 ${y}T180 ${y}V100H0Z`, i % 2 ? '#1552a0' : '#fff');
      }
      // Frigatebird: angular wings, hooked head and forked tail above the sun.
      const bird = path('M54 15L73 18L88 24L103 18L128 12L112 23L98 27L104 34L95 31L88 35L89 28L78 24L66 22Z', yellow)
        + path('M88 24L83 16L78 15L76 18L81 18L84 26Z', yellow);
      return rect(0, 0, 180, 100, '#c52235') + sun + circle(90, 56, 16, yellow) + waves + bird;
    }
    case 'vu': return rect(0, 0, 180, 50, '#d0213d') + rect(0, 50, 180, 50, '#17884c')
      + path('M0 0L65 43H180V57H65L0 100Z', '#161616')
      + path('M0 8L66 47H180V53H66L0 92Z', '#f7d140')
      + polygon('0,17 56,50 0,83', '#161616')
      + '<path d="M24 32C5 34 7 67 27 67C40 67 42 47 31 43" fill="none" stroke="#f7d140" stroke-width="4"/>'
      + '<path d="M18 60L32 39M31 60L18 39M20 55L15 48M24 50L18 43M27 45L23 38M28 55L35 48M24 49L31 42M21 44L27 37" fill="none" stroke="#f7d140" stroke-width="2"/>';
    case 'to': return rect(0, 0, 180, 100, '#c5162e') + rect(0, 0, 75, 50, '#fff') + rect(31, 8, 13, 34, '#c5162e') + rect(20, 19, 35, 12, '#c5162e');
    case 'ws': return rect(0, 0, 180, 100, '#c62136') + rect(0, 0, 90, 50, '#173e88')
      + [[45, 9, 6], [24, 25, 6], [66, 22, 6], [55, 32, 4], [45, 41, 7]].map(([x, y, r]) => star(x, y, r)).join('');
    case 'pw': return rect(0, 0, 180, 100, '#62bde0') + circle(77, 50, 30, '#ffdf43');
    case 'mh': {
      const rays = polygon(Array.from({ length: 48 }, (_, i) => {
        const a = (-90 + i * 7.5) * Math.PI / 180;
        const r = i % 2 ? 6 : i % 12 === 0 ? 26 : 14;
        return `${+(45 + Math.cos(a) * r).toFixed(2)},${+(30 + Math.sin(a) * r).toFixed(2)}`;
      }).join(' '), '#fff');
      return rect(0, 0, 180, 100, '#16458c') + polygon('0,100 180,0 180,24', '#eb7d30') + polygon('0,100 180,24 180,49', '#fff') + rays;
    }
    case 'fm': return rect(0, 0, 180, 100, '#78b8df')
      + [[90, 22, -90], [118, 50, 0], [90, 78, 90], [62, 50, 180]].map(([x, y, rot]) => star(x, y, 11, '#fff', 5, rot)).join('');
    case 'tl': return rect(0, 0, 180, 100, '#d42232') + polygon('0,0 90,50 0,100', '#f6cd36')
      + polygon('0,0 60,50 0,100', '#181818') + star(24, 50, 17, '#fff', 5, -145);
    default: throw new Error(`Unknown consolation flag: ${code}`);
  }
}

export function consolationCountryFlag(name, code) {
  const ink = '#4c445a', cream = '#f8edce';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="${esc(name)} bayrağı, piksel çizim" shape-rendering="crispEdges"><title>${esc(name)} — teselli kartı</title>`
    + rect(0, 0, 96, 96, cream) + rect(4, 4, 88, 88, ink) + rect(7, 7, 82, 82, '#8cacc6') + rect(11, 11, 74, 65, '#efe5cc')
    + rect(12, 25, 72, 42, ink)
    + `<svg x="14" y="27" width="68" height="38" viewBox="0 0 180 100">${flag(code)}</svg>`
    + rect(13, 78, 70, 8, cream)
    + `<text x="48" y="85" font-family="monospace" font-size="7" font-weight="bold" text-anchor="middle" fill="${ink}">TESELLI</text></svg>\n`;
}
