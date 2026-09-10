// 공용 레이더 차트 렌더러 — 임의 SVG 요소에 오각형 Big Five 레이더를 그린다.
// 결과 화면(app.js)·공유 뷰(share.js)·대시보드(dashboard.js)가 공유한다.
// FACTORS(data/questions.js) 전역에 의존하므로 questions.js 뒤에 로드한다.
const RADAR_ORDER = ["O", "C", "E", "A", "N"]; // 위에서 시계방향
const LEVEL_EN = { H: "HIGH", M: "MEDIUM", L: "LOW" };

function radarPoint(cx, cy, radius, i, frac) {
  const angle = (-90 + i * 72) * (Math.PI / 180);
  return [cx + radius * frac * Math.cos(angle), cy + radius * frac * Math.sin(angle)];
}

// svgEl: viewBox "0 0 460 420" 기준의 <svg>. opts로 중심/반지름 override 가능(기본값은 결과 화면과 동일).
function renderRadar(svgEl, pct, levels, opts = {}) {
  if (!svgEl) return;
  const cx = opts.cx ?? 230;
  const cy = opts.cy ?? 200;
  const R = opts.R ?? 118;
  const grid = [0.25, 0.5, 0.75, 1];
  let out = "";

  // 배경 격자 오각형
  grid.forEach((g) => {
    const pts = RADAR_ORDER.map((_, i) => radarPoint(cx, cy, R, i, g).map((n) => n.toFixed(1)).join(",")).join(" ");
    out += `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
  });
  // 축선
  RADAR_ORDER.forEach((_, i) => {
    const [x, y] = radarPoint(cx, cy, R, i, 1);
    out += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
  });
  // 데이터 폴리곤
  const dataPts = RADAR_ORDER.map((k, i) => radarPoint(cx, cy, R, i, Math.max(pct[k], 4) / 100).map((n) => n.toFixed(1)).join(",")).join(" ");
  out += `<polygon points="${dataPts}" fill="rgba(49,130,246,0.30)" stroke="#3182f6" stroke-width="2.5" stroke-linejoin="round"/>`;
  // 정점 점 + 라벨
  RADAR_ORDER.forEach((k, i) => {
    const f = FACTORS[k];
    const [dx, dy] = radarPoint(cx, cy, R, i, Math.max(pct[k], 4) / 100);
    out += `<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="5" fill="${f.color}" stroke="#0f1b34" stroke-width="2"/>`;

    const [lx, ly] = radarPoint(cx, cy, R + 30, i, 1);
    const anchor = i === 0 ? "middle" : lx > cx + 4 ? "start" : lx < cx - 4 ? "end" : "middle";
    out += `<text x="${lx.toFixed(1)}" y="${(ly - 2).toFixed(1)}" text-anchor="${anchor}" class="radar-axis-label" fill="${f.color}">${f.english}</text>`;
    out += `<text x="${lx.toFixed(1)}" y="${(ly + 13).toFixed(1)}" text-anchor="${anchor}" class="radar-axis-level">${LEVEL_EN[levels[k]]}</text>`;
  });

  svgEl.innerHTML = out;
}

// 여러 결과를 한 레이더에 겹쳐 그린다(비교용). datasets: [{ pct, color, label }, …].
// 격자·축선·축 라벨(영문)은 1회, 각 dataset은 자기 color로 반투명 폴리곤+스트로크+정점.
function renderCompareRadar(svgEl, datasets, opts = {}) {
  if (!svgEl || !datasets || !datasets.length) return;
  const cx = opts.cx ?? 230, cy = opts.cy ?? 200, R = opts.R ?? 118;
  const grid = [0.25, 0.5, 0.75, 1];
  let out = "";
  grid.forEach((g) => {
    const pts = RADAR_ORDER.map((_, i) => radarPoint(cx, cy, R, i, g).map((n) => n.toFixed(1)).join(",")).join(" ");
    out += `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
  });
  RADAR_ORDER.forEach((_, i) => {
    const [x, y] = radarPoint(cx, cy, R, i, 1);
    out += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
  });
  datasets.forEach((ds) => {
    const color = ds.color || "#4b8ffc";
    const pts = RADAR_ORDER.map((k, i) => radarPoint(cx, cy, R, i, Math.max(ds.pct[k], 4) / 100).map((n) => n.toFixed(1)).join(",")).join(" ");
    out += `<polygon points="${pts}" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>`;
    RADAR_ORDER.forEach((k, i) => {
      const [dx, dy] = radarPoint(cx, cy, R, i, Math.max(ds.pct[k], 4) / 100);
      out += `<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="4" fill="${color}" stroke="#0f1b34" stroke-width="1.5"/>`;
    });
  });
  RADAR_ORDER.forEach((k, i) => {
    const f = FACTORS[k];
    const [lx, ly] = radarPoint(cx, cy, R + 26, i, 1);
    const anchor = i === 0 ? "middle" : lx > cx + 4 ? "start" : lx < cx - 4 ? "end" : "middle";
    out += `<text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="${anchor}" class="radar-axis-label" fill="#9fb2ce">${f.english}</text>`;
  });
  svgEl.innerHTML = out;
}
