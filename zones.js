// Neris zone lookup - offline port of toolkit/zones/zones.py (rules as of 11/21/2026).
// District = ARGYLE inside the wall-map outline, OUT outside it (or in another department's Bryx box).
// In district: NORTH / EAST / SOUTH.  Out of district: Zone field = direction NORTH / EAST / SOUTH / WEST.
(function () {
  const G = window.NERIS_GEO;
  const R = G.roads;
  const EAST_START_LON = -86.0712, EDGE_TOL_KM = 0.12, SOUTH_LIMIT_LAT = 30.6155;

  function roadLatAt(road, lon) {
    for (const seg of R[road] || []) for (let i = 0; i + 1 < seg.length; i++) {
      const [a, b] = seg[i], [c, d] = seg[i + 1];
      if (Math.min(b, d) <= lon && lon <= Math.max(b, d) && b !== d) return a + (c - a) * (lon - b) / (d - b);
    }
    return null;
  }
  function roadLonAt(road, lat, segI) {
    const seg = (R[road] || [])[segI || 0] || [];
    for (let i = 0; i + 1 < seg.length; i++) {
      const [a, b] = seg[i], [c, d] = seg[i + 1];
      if (Math.min(a, c) <= lat && lat <= Math.max(a, c) && a !== c) return b + (d - b) * (lat - a) / (c - a);
    }
    return null;
  }
  function pip(lat, lon, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[0] > lat) !== (b[0] > lat) && lon < a[1] + (lat - a[0]) * (b[1] - a[1]) / (b[0] - a[0])) c = !c;
    }
    return c;
  }
  function distLineKm(lat, lon, line) {
    const kx = 95.7, ky = 110.6; let best = 1e9;
    for (let i = 0; i + 1 < line.length; i++) {
      const [a, b] = line[i], [c, d] = line[i + 1];
      const px = lon * kx, py = lat * ky, x1 = b * kx, y1 = a * ky, x2 = d * kx, y2 = c * ky, dx = x2 - x1, dy = y2 - y1;
      const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1)));
      best = Math.min(best, Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)));
    }
    return best;
  }
  const inNorth = (lat, lon) => pip(lat, lon, G.north || []);
  function nearNorthEdge(lat, lon) {
    const poly = G.north || []; const kx = 95.7, ky = 110.6;
    for (let i = 0; i + 1 < poly.length; i++) {
      const [a, b] = poly[i], [c, d] = poly[i + 1];
      if (a < 30.73 && c < 30.73) continue;
      if (b < -86.148 && d < -86.148 && a < 30.776 && c < 30.776) continue;
      if (distLineKm(lat, lon, [[a, b], [c, d]]) <= 0.25) return true;
    }
    return false;
  }
  const inDistrict = (lat, lon) => pip(lat, lon, G.district) || distLineKm(lat, lon, G.district.concat([G.district[0]])) <= EDGE_TOL_KM;
  const liberty = (lat, lon) => pip(lat, lon, G.lib_poly) && distLineKm(lat, lon, G.lib_line) > 0.08;

  function northBlock(lat, lon, tol = 0.0008) {
    const y90 = roadLatAt('US 90', lon); if (y90 == null || lat < y90 - tol) return false;
    const ys = roadLatAt('Sunrise Rd', lon); if (lat > (ys != null ? ys : 30.7904) + tol) return false;
    const x83 = roadLonAt('SR 83', lat, 0) || -86.115; if (lon > x83 + tol) return false;
    const x331 = lat >= 30.734 ? roadLonAt('US 331', lat, 1) : -86.149;
    return x331 != null && lon >= x331 - tol;
  }
  function westOf331n(lat, lon) {
    const y90 = roadLatAt('US 90', lon); if (y90 != null && lat < y90) return false;
    const x331 = lat >= 30.734 ? roadLonAt('US 331', lat, 1) : -86.149;
    return x331 != null && lon < x331;
  }
  function agency(lat, lon) {
    if (liberty(lat, lon)) return 'LVFD (Liberty)';
    const northEdge = lon < -86.12 ? 30.7904 : 30.80;
    if (lat > northEdge && lon > -86.16) return 'WCFR District 6';
    if (lon > -86.033 && lat > 30.728) return 'Holmes County';
    if (lon > -86.033 || (lat < 30.6531 && lon > -85.9925)) return 'WCFR District 8';
    if (lat < 30.6165 || (lat < 30.664 && lon > -86.104)) return lon > -86.0138 ? 'WCFR District 8' : 'WCFR District 2';
    if (lat < 30.691 && lon < -86.124) return 'WCFR District 2 / DFFD - check';
    if (lat > 30.664 && lon > -86.16) return 'DFFD (city)';
    return 'DFFD / WCFR District 2 / LVFD - check';
  }
  function ruleZone(lat, lon) {
    if (liberty(lat, lon) || !inDistrict(lat, lon)) return 'OUT';
    if (inNorth(lat, lon) || nearNorthEdge(lat, lon) || northBlock(lat, lon)) return 'NORTH';
    const y10 = roadLatAt('I 10', lon);
    if (y10 != null && lat < y10 + 0.002) return 'SOUTH';
    if (lon > EAST_START_LON) return 'EAST';
    const y90 = roadLatAt('US 90', lon);
    if (y90 != null && lat < y90) return 'SOUTH';
    return 'NORTH';
  }
  function lookup(lat, lon, addr) {
    const A = String(addr || '').toUpperCase();
    if (A.includes('SPRING LAKE')) return {zone: 'NORTH', district: 'ARGYLE', why: 'Spring Lake = NORTH (dept rule)'};
    if (A.includes('N NORWOOD') || A.includes('NORTH NORWOOD')) return {zone: 'NORTH', district: 'ARGYLE', why: 'N Norwood Rd = NORTH (dept rule)'};
    const z = ruleZone(lat, lon);
    if (z !== 'OUT') return {zone: z, district: 'ARGYLE', why: 'Inside the AVFD district', check: A.includes('LAIRD') ? 'On CJ Laird Rd - partly shared with WCFR District 8; ask' : ''};
    const ag = agency(lat, lon); const y10 = roadLatAt('I 10', lon); let f;
    if (northBlock(lat, lon)) f = 'NORTH';
    else if (westOf331n(lat, lon)) f = 'WEST';
    else if (ag.startsWith('DFFD (city)')) f = 'WEST';
    else if (lat > 30.80) f = 'NORTH';
    else if (lon < -86.12 || /^(LVFD|DFFD|WCFR District 2)/.test(ag)) f = 'WEST';
    else if (lon > -86.033 || (lat < 30.6531 && lon > -85.9925)) f = (y10 == null || lat >= y10 || lat > 30.6531) ? 'EAST' : 'SOUTH';
    else f = 'SOUTH';
    return {zone: f, district: 'OUT', agency: ag, why: 'Outside AVFD - District OUT, Aid Given; Zone = direction'};
  }
  window.NerisZones = {lookup, ruleZone, inDistrict, northBlock, westOf331n, agency};
})();
