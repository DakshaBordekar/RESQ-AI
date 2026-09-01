const pptxgen = require('pptxgenjs');

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
    white: 'FFFFFF',
    navy: '0D1F3C',
    blue: '1A3A6B',
    red: 'C0392B',
    orange: 'E25822',
    amber: 'F39C12',
    green: '27AE60',
    lgray: 'D5D8DC',
    mgray: '7F8C8D',
    bgray: 'F2F3F4',
    dgray: '34495E',
};

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9'; // 10" × 5.625"

// ── Helper: slide title bar ──────────────────────────────────────────────────
function addTitle(slide, text, opts = {}) {
    slide.addText(text, {
        x: 0.4, y: 0.08, w: 9.2, h: 0.58,
        fontSize: 26, bold: true, color: C.navy,
        fontFace: 'Arial',
        isTextBox: true,
        margin: 0,
        ...opts,
    });
}

// ── Helper: add small label ──────────────────────────────────────────────────
function lbl(slide, txt, x, y, w, h, opts = {}) {
    slide.addText(txt, {
        x, y, w, h,
        fontFace: 'Arial', fontSize: 9, color: C.mgray,
        isTextBox: true, margin: 0,
        ...opts,
    });
}

// ── Helper: box ──────────────────────────────────────────────────────────────
function box(slide, x, y, w, h, fill, line, opts = {}) {
    slide.addShape(pres.ShapeType.rect, {
        x, y, w, h,
        fill: { color: fill },
        line: { color: line, width: 1 },
        ...opts,
    });
}

// ── Helper: arrow right ─────────────────────────────────────────────────────
function arrowR(slide, x, y, len) {
    slide.addShape(pres.ShapeType.line, {
        x, y, w: len, h: 0,
        line: { color: C.navy, width: 1.5, endArrowType: 'arrow' },
    });
}

// ── Helper: arrow down ──────────────────────────────────────────────────────
function arrowD(slide, x, y, len) {
    slide.addShape(pres.ShapeType.line, {
        x, y, w: 0, h: len,
        line: { color: C.navy, width: 1.5, endArrowType: 'arrow' },
    });
}

// ── Helper: flow box ─────────────────────────────────────────────────────────
function flowBox(slide, txt, sub, x, y, w, h, fill, txtColor, subColor) {
    box(slide, x, y, w, h, fill, C.navy);
    if (txt) slide.addText(txt, {
        x, y, w, h: h * (sub ? 0.6 : 1),
        fontFace: 'Arial', fontSize: 9, bold: true, color: txtColor || C.white,
        align: 'center', valign: sub ? 'bottom' : 'middle',
        isTextBox: true, margin: 2,
    });
    if (sub) slide.addText(sub, {
        x, y: y + h * 0.56, w, h: h * 0.44,
        fontFace: 'Arial', fontSize: 7.5, color: subColor || C.lgray,
        align: 'center', valign: 'top',
        isTextBox: true, margin: 2,
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1 — TITLE
// ─────────────────────────────────────────────────────────────────────────────
{
    const s = pres.addSlide();
    s.background = { color: C.white };

    // Top event label
    s.addText('HACKTRONICS 2ND EDITION', {
        x: 0, y: 0.18, w: 10, h: 0.32,
        fontFace: 'Arial', fontSize: 11, bold: true, color: C.mgray,
        align: 'center', isTextBox: true, margin: 0, charSpacing: 3,
    });

    // Decorative tank schematic (left side) — simplified SVG-like shapes
    // outer tank body
    box(s, 0.5, 1.2, 1.4, 2.2, 'D5E8F7', '1A3A6B', { rectRadius: 0.05 });
    // tank roof (trapezoid approximated with rect)
    box(s, 0.58, 0.95, 1.24, 0.3, '1A3A6B', '1A3A6B');
    // tank legs
    slide_tankLegs(s, 0.72, 3.42);

    function slide_tankLegs(sl, startX, y) {
        for (let i = 0; i < 3; i++) {
            sl.addShape(pres.ShapeType.line, {
                x: startX + i * 0.3, y, w: 0, h: 0.2,
                line: { color: C.navy, width: 1.5 },
            });
        }
    }

    // gradient hazard rings (concentric rect approximation)
    const rings = [
        { x: 0.08, y: 0.55, w: 2.24, h: 4.56, color: 'FADBD8', opacity: 60 },
        { x: 0.28, y: 0.82, w: 1.84, h: 4.02, color: 'FAD7A0', opacity: 60 },
        { x: 0.46, y: 1.06, w: 1.48, h: 3.54, color: 'A9DFBF', opacity: 60 },
    ];
    rings.forEach(r => {
        s.addShape(pres.ShapeType.ellipse, {
            x: r.x, y: r.y, w: r.w, h: r.h,
            fill: { color: r.color, transparency: r.opacity },
            line: { color: r.color, width: 0 },
        });
    });

    // Main title FIREGUARD
    s.addText('FIREGUARD', {
        x: 2.1, y: 0.85, w: 7.5, h: 1.5,
        fontFace: 'Arial', fontSize: 72, bold: true, color: C.navy,
        align: 'left', isTextBox: true, margin: 0,
    });

    // Subtitle
    s.addText('Computational Threat-Zone Estimation\nfor Industrial Fire & Explosion Response', {
        x: 2.1, y: 2.32, w: 7.5, h: 0.85,
        fontFace: 'Arial', fontSize: 14, color: C.dgray,
        align: 'left', isTextBox: true, margin: 0,
    });

    // Divider line
    s.addShape(pres.ShapeType.line, {
        x: 2.1, y: 3.26, w: 7.5, h: 0,
        line: { color: C.lgray, width: 1 },
    });

    // Team info
    s.addText('TEAM ATOM  ·  TEAM NO. 38', {
        x: 2.1, y: 3.38, w: 7.5, h: 0.34,
        fontFace: 'Arial', fontSize: 12, bold: true, color: C.blue,
        align: 'left', isTextBox: true, margin: 0,
    });

    const members = [
        'SANTHOSH V — 24BPS1112',
        'DAKSHA BORDEKAR — 24BRS1296',
        'PRANAV SHINDE — 24BAI1590',
    ];
    members.forEach((m, i) => {
        s.addText(m, {
            x: 2.1, y: 3.82 + i * 0.26, w: 7.5, h: 0.26,
            fontFace: 'Arial', fontSize: 10, color: C.mgray,
            align: 'left', isTextBox: true, margin: 0,
        });
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 2 — THE PROBLEM
// ─────────────────────────────────────────────────────────────────────────────
{
    const s = pres.addSlide();
    s.background = { color: C.white };

    addTitle(s, '"A Fire Is Not a Circle."');

    // Horizontal rule under title
    s.addShape(pres.ShapeType.line, {
        x: 0.4, y: 0.68, w: 9.2, h: 0,
        line: { color: C.lgray, width: 0.75 },
    });

    // LEFT: CONVENTIONAL
    const lx = 0.35;
    // Label
    s.addText('CONVENTIONAL APPROACH', {
        x: lx, y: 0.75, w: 4.2, h: 0.3,
        fontFace: 'Arial', fontSize: 10, bold: true, color: C.mgray,
        align: 'center', isTextBox: true, margin: 0, charSpacing: 1,
    });

    // Tank icon
    box(s, 1.6, 1.18, 0.9, 1.1, 'D5E8F7', C.navy, { rectRadius: 0.04 });
    box(s, 1.66, 1.0, 0.78, 0.22, C.navy, C.navy);
    s.addText('TANK', {
        x: 1.6, y: 1.22, w: 0.9, h: 0.4,
        fontFace: 'Arial', fontSize: 7, bold: true, color: C.navy,
        align: 'center', isTextBox: true, margin: 0,
    });

    // Circle hazard zone
    s.addShape(pres.ShapeType.ellipse, {
        x: 0.5, y: 0.92, w: 3.1, h: 2.6,
        fill: { color: 'FADBD8', transparency: 55 },
        line: { color: C.red, width: 1.5, dashType: 'dash' },
    });

    // "Fixed Radius" label
    s.addText('⭕  Fixed Radius Circle', {
        x: lx, y: 3.55, w: 4.2, h: 0.28,
        fontFace: 'Arial', fontSize: 9, color: C.red,
        align: 'center', isTextBox: true, margin: 0,
    });

    // Ignored factors list
    const ignored = [
        '✗  Source characteristics',
        '✗  Tank geometry & volume',
        '✗  Thermal radiation physics',
        '✗  Blast overpressure model',
        '✗  Wind conditions',
        '✗  Spatial variation',
    ];
    ignored.forEach((t, i) => {
        s.addText(t, {
            x: 0.5, y: 3.9 + i * 0.21, w: 3.8, h: 0.2,
            fontFace: 'Arial', fontSize: 8, color: C.red,
            isTextBox: true, margin: 0,
        });
    });

    // Vertical divider
    s.addShape(pres.ShapeType.line, {
        x: 4.9, y: 0.75, w: 0, h: 4.5,
        line: { color: C.lgray, width: 1 },
    });

    // RIGHT: FIREGUARD
    const rx = 5.05;
    s.addText('FIREGUARD APPROACH', {
        x: rx, y: 0.75, w: 4.6, h: 0.3,
        fontFace: 'Arial', fontSize: 10, bold: true, color: C.blue,
        align: 'center', isTextBox: true, margin: 0, charSpacing: 1,
    });

    // Tank icon right
    box(s, 7.0, 1.32, 0.9, 1.05, 'D5E8F7', C.navy, { rectRadius: 0.04 });
    box(s, 7.06, 1.14, 0.78, 0.22, C.navy, C.navy);

    // Asymmetric hazard field (ellipses + wind vector)
    const bands = [
        { x: 5.2, y: 0.88, w: 4.4, h: 2.8, color: 'FADBD8', t: 45 },
        { x: 5.55, y: 1.12, w: 3.7, h: 2.3, color: 'FAD7A0', t: 45 },
        { x: 5.85, y: 1.35, w: 3.1, h: 1.85, color: 'A9DFBF', t: 45 },
    ];
    bands.forEach(b => {
        s.addShape(pres.ShapeType.ellipse, {
            x: b.x, y: b.y, w: b.w, h: b.h,
            fill: { color: b.color, transparency: b.t },
            line: { color: b.color.substring(0, 6), width: 0.5 },
            flipH: false,
        });
    });

    // Wind arrow
    s.addShape(pres.ShapeType.line, {
        x: 5.1, y: 2.3, w: 0.8, h: 0,
        line: { color: C.blue, width: 1.5, endArrowType: 'arrow' },
    });
    s.addText('WIND', {
        x: 5.0, y: 2.38, w: 0.6, h: 0.18,
        fontFace: 'Arial', fontSize: 7, color: C.blue,
        isTextBox: true, margin: 0,
    });

    // Legend
    const legend = [
        { color: 'C0392B', label: 'EXTREME' },
        { color: 'E25822', label: 'HIGH' },
        { color: 'F39C12', label: 'MODERATE' },
    ];
    legend.forEach((l, i) => {
        box(s, rx, 3.58 + i * 0.22, 0.18, 0.16, l.color, l.color);
        s.addText(l.label, {
            x: rx + 0.24, y: 3.56 + i * 0.22, w: 1.5, h: 0.18,
            fontFace: 'Arial', fontSize: 8, color: C.dgray,
            isTextBox: true, margin: 0,
        });
    });

    s.addText('🌐  Physics-derived spatial hazard field', {
        x: rx, y: 4.23, w: 4.6, h: 0.28,
        fontFace: 'Arial', fontSize: 9, bold: true, color: C.blue,
        align: 'center', isTextBox: true, margin: 0,
    });

    // Bottom quote
    box(s, 0.35, 4.58, 9.3, 0.72, 'EBF5FB', 'AED6F1');
    s.addText('"The challenge is not drawing a boundary. The challenge is computing where the consequence becomes dangerous."', {
        x: 0.45, y: 4.62, w: 9.1, h: 0.62,
        fontFace: 'Arial', fontSize: 10, bold: true, color: C.navy,
        align: 'center', isTextBox: true, margin: 0,
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 — CORE IDEA / COMPUTATIONAL FLOW
// ─────────────────────────────────────────────────────────────────────────────
{
    const s = pres.addSlide();
    s.background = { color: C.white };

    addTitle(s, '"From Incident Parameters to a Spatial Consequence Field"', { fontSize: 20 });
    s.addShape(pres.ShapeType.line, {
        x: 0.4, y: 0.68, w: 9.2, h: 0,
        line: { color: C.lgray, width: 0.75 },
    });

    // Central pipeline — vertical flow, center column
    const cx = 3.75, bw = 2.5, bh = 0.3, gap = 0.07;

    const topItems = [
        { label: 'FACILITY', sub: 'Location · Tank Geometry · Volume', fill: C.navy },
        { label: 'MATERIAL', sub: 'Physical Properties', fill: C.blue },
        { label: 'SCENARIO', sub: 'Fire / Explosion Conditions', fill: C.dgray },
        { label: 'ENVIRONMENT', sub: 'Wind Speed · Wind Direction', fill: '2980B9' },
        { label: 'SOURCE CHARACTERIZATION', sub: 'Energy Release · Geometry', fill: '1A5276' },
    ];

    let curY = 0.80;
    topItems.forEach((item, i) => {
        flowBox(s, item.label, item.sub, cx, curY, bw, bh, item.fill, C.white, 'BFC9CA');
        if (i < topItems.length - 1) {
            arrowD(s, cx + bw / 2 - 0.01, curY + bh, gap);
        }
        curY += bh + gap;
    });

    // Fork arrow — two branches
    const forkY = curY;
    const forkLineH = 0.16;
    s.addShape(pres.ShapeType.line, {
        x: cx + bw / 2, y: forkY, w: 0, h: forkLineH,
        line: { color: C.navy, width: 1.5 },
    });
    s.addShape(pres.ShapeType.line, {
        x: 1.0, y: forkY + forkLineH, w: cx + bw / 2 - 1.0, h: 0,
        line: { color: C.navy, width: 1.5 },
    });
    s.addShape(pres.ShapeType.line, {
        x: cx + bw / 2, y: forkY + forkLineH, w: 7.65 - cx - bw / 2, h: 0,
        line: { color: C.navy, width: 1.5 },
    });
    s.addShape(pres.ShapeType.line, {
        x: 1.0, y: forkY + forkLineH, w: 0, h: 0.14,
        line: { color: C.navy, width: 1.5, endArrowType: 'arrow' },
    });
    s.addShape(pres.ShapeType.line, {
        x: 7.65, y: forkY + forkLineH, w: 0, h: 0.14,
        line: { color: C.navy, width: 1.5, endArrowType: 'arrow' },
    });

    const branchY = forkY + forkLineH + 0.14;
    const branchH = 0.38;
    const branchW = 2.1;

    // Left branch box — Thermal
    flowBox(s, '  THERMAL RADIATION', 'Point source · View factor\nRadiative flux · Attenuation', 0.38, branchY, branchW, branchH, 'C0392B', C.white, 'F5B7B1');
    // Right branch box — Blast
    flowBox(s, '  BLAST OVERPRESSURE', 'TNT-equiv. · Scaled distance\nPeak overpressure · Impulse', 7.52, branchY, branchW, branchH, '884EA0', C.white, 'D2B4DE');

    // Merge arrows
    const mergeY = branchY + branchH;
    const lbCX = 0.38 + branchW / 2;
    const rbCX = 7.52 + branchW / 2;
    const midCX = cx + bw / 2;
    s.addShape(pres.ShapeType.line, { x: lbCX, y: mergeY, w: 0, h: 0.13, line: { color: C.navy, width: 1.5 } });
    s.addShape(pres.ShapeType.line, { x: rbCX, y: mergeY, w: 0, h: 0.13, line: { color: C.navy, width: 1.5 } });
    s.addShape(pres.ShapeType.line, { x: lbCX, y: mergeY + 0.13, w: midCX - lbCX, h: 0, line: { color: C.navy, width: 1.5 } });
    s.addShape(pres.ShapeType.line, { x: midCX, y: mergeY + 0.13, w: rbCX - midCX, h: 0, line: { color: C.navy, width: 1.5 } });
    arrowD(s, midCX - 0.01, mergeY + 0.13, 0.1);

    const bottomItems = [
        { label: 'POINT CONSEQUENCE EVALUATION', sub: 'Max(thermal, blast) per grid point', fill: '1E8449' },
        { label: 'SPATIAL GRID', sub: 'Structured evaluation over surrounding area', fill: '196F3D' },
        { label: 'HAZARD FIELD', sub: 'Consequence intensity at every location', fill: C.amber },
        { label: 'SEVERITY CLASSIFICATION', sub: 'EXTREME / HIGH / MODERATE bands', fill: C.orange },
        { label: 'APPROACH DIRECTION ANALYSIS', sub: 'Sector exposure ranking', fill: C.red },
        { label: 'RESPONDER DECISION SUPPORT', sub: 'Lower-exposure approach intelligence', fill: C.navy },
    ];

    let cy2 = mergeY + 0.23;
    bottomItems.forEach((item, i) => {
        flowBox(s, item.label, item.sub, cx, cy2, bw, bh, item.fill, C.white, 'BFC9CA');
        if (i < bottomItems.length - 1) {
            arrowD(s, cx + bw / 2 - 0.01, cy2 + bh, 0.07);
        }
        cy2 += bh + 0.07;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4 — PHYSICS ENGINE
// ─────────────────────────────────────────────────────────────────────────────
{
    const s = pres.addSlide();
    s.background = { color: C.white };

    addTitle(s, '"The Physics Behind the Map"');
    s.addShape(pres.ShapeType.line, {
        x: 0.4, y: 0.68, w: 9.2, h: 0,
        line: { color: C.lgray, width: 0.75 },
    });

    // Vertical divider
    s.addShape(pres.ShapeType.line, {
        x: 5.0, y: 0.72, w: 0, h: 4.5,
        line: { color: C.lgray, width: 1 },
    });

    // ── LEFT: THERMAL ─────────────────────────────────────────────
    s.addText('  THERMAL RADIATION MODEL', {
        x: 0.35, y: 0.76, w: 4.5, h: 0.3,
        fontFace: 'Arial', fontSize: 11, bold: true, color: C.red,
        isTextBox: true, margin: 0,
    });

    const thermalSteps = [
        { label: 'Fire Source', sub: 'Tank fire scenario' },
        { label: 'Flame Characterization', sub: 'Flame geometry · effective emissive power (EEP)' },
        { label: 'Geometric View Factor (F)', sub: 'Solid angle subtended at receiver' },
        { label: 'Radiative Transfer', sub: 'Atmospheric transmissivity (τ)' },
        { label: 'Receiver Point', sub: 'Distance r from source' },
    ];

    let ty = 1.14;
    thermalSteps.forEach((st, i) => {
        box(s, 0.38, ty, 4.3, 0.36, i === 0 ? C.red : i === 4 ? '1A5276' : 'EBF5FB', i === 0 ? C.red : C.blue);
        s.addText(st.label, {
            x: 0.42, y: ty + 0.01, w: 4.22, h: 0.2,
            fontFace: 'Arial', fontSize: 9, bold: true,
            color: (i === 0 || i === 4) ? C.white : C.navy,
            isTextBox: true, margin: 2,
        });
        s.addText(st.sub, {
            x: 0.42, y: ty + 0.19, w: 4.22, h: 0.16,
            fontFace: 'Arial', fontSize: 7.5,
            color: (i === 0 || i === 4) ? 'BFC9CA' : C.mgray,
            isTextBox: true, margin: 2,
        });
        if (i < thermalSteps.length - 1) {
            arrowD(s, 2.5, ty + 0.36, 0.1);
        }
        ty += 0.46;
    });

    // Result box thermal
    box(s, 0.38, ty + 0.12, 4.3, 0.44, C.red, C.red);
    s.addText('THERMAL FLUX  q″  [kW/m²]', {
        x: 0.42, y: ty + 0.14, w: 4.22, h: 0.22,
        fontFace: 'Arial', fontSize: 10, bold: true, color: C.white,
        align: 'center', isTextBox: true, margin: 0,
    });
    s.addText("q″ = EEP × F × τ", {
        x: 0.42, y: ty + 0.32, w: 4.22, h: 0.22,
        fontFace: 'Arial', fontSize: 9, color: 'F5B7B1',
        align: 'center', isTextBox: true, margin: 0,
    });

    // Thermal thresholds
    const tThresh = [
        { v: '> 37.5', label: 'EXTREME — Fatal exposure', color: C.red },
        { v: '> 12.5', label: 'HIGH — Significant injury', color: C.orange },
        { v: '> 4.7', label: 'MODERATE — Pain threshold', color: C.amber },
        { v: '≤ 4.7', label: 'LOW — Acceptable for egress', color: C.green },
    ];
    ty += 0.62;
    s.addText('Severity thresholds (kW/m²):', {
        x: 0.38, y: ty, w: 4.3, h: 0.22,
        fontFace: 'Arial', fontSize: 8, bold: true, color: C.dgray,
        isTextBox: true, margin: 0,
    });
    tThresh.forEach((th, i) => {
        box(s, 0.38, ty + 0.22 + i * 0.2, 0.5, 0.18, th.color, th.color);
        s.addText(`${th.v}  ${th.label}`, {
            x: 0.94, y: ty + 0.22 + i * 0.2, w: 3.7, h: 0.18,
            fontFace: 'Arial', fontSize: 8, color: C.dgray,
            isTextBox: true, margin: 0,
        });
    });

    // ── RIGHT: BLAST ───────────────────────────────────────────────
    s.addText('  BLAST OVERPRESSURE MODEL', {
        x: 5.15, y: 0.76, w: 4.5, h: 0.3,
        fontFace: 'Arial', fontSize: 11, bold: true, color: '7D3C98',
        isTextBox: true, margin: 0,
    });

    const blastSteps = [
        { label: 'Explosion Source', sub: 'Tank explosion scenario' },
        { label: 'Energy Characterization', sub: 'TNT-equivalent mass (W_TNT) from heat of combustion' },
        { label: 'Scaled Distance (Z)', sub: 'Z = R / W_TNT^(1/3)  — Hopkinson-Cranz scaling' },
        { label: 'Baker-Strehlow Model', sub: 'Empirical overpressure vs. scaled distance' },
        { label: 'Receiver Point', sub: 'Distance R from explosion centre' },
    ];

    let by = 1.14;
    blastSteps.forEach((st, i) => {
        box(s, 5.18, by, 4.3, 0.36, i === 0 ? '7D3C98' : i === 4 ? '1A5276' : 'F4ECF7', i === 0 ? '7D3C98' : '884EA0');
        s.addText(st.label, {
            x: 5.22, y: by + 0.01, w: 4.22, h: 0.2,
            fontFace: 'Arial', fontSize: 9, bold: true,
            color: (i === 0 || i === 4) ? C.white : '4A235A',
            isTextBox: true, margin: 2,
        });
        s.addText(st.sub, {
            x: 5.22, y: by + 0.19, w: 4.22, h: 0.16,
            fontFace: 'Arial', fontSize: 7.5,
            color: (i === 0 || i === 4) ? 'D2B4DE' : C.mgray,
            isTextBox: true, margin: 2,
        });
        if (i < blastSteps.length - 1) {
            arrowD(s, 7.33, by + 0.36, 0.1);
        }
        by += 0.46;
    });

    // Result box blast
    box(s, 5.18, by + 0.12, 4.3, 0.44, '7D3C98', '7D3C98');
    s.addText('PEAK OVERPRESSURE  ΔP  [kPa]', {
        x: 5.22, y: by + 0.14, w: 4.22, h: 0.22,
        fontFace: 'Arial', fontSize: 10, bold: true, color: C.white,
        align: 'center', isTextBox: true, margin: 0,
    });
    s.addText('Z = R / W^(1/3)  →  ΔP = f(Z)', {
        x: 5.22, y: by + 0.32, w: 4.22, h: 0.22,
        fontFace: 'Arial', fontSize: 9, color: 'D2B4DE',
        align: 'center', isTextBox: true, margin: 0,
    });

    // Blast thresholds
    const bThresh = [
        { v: '> 83', label: 'EXTREME — Severe structural damage', color: C.red },
        { v: '> 21', label: 'HIGH — Serious injury', color: C.orange },
        { v: '> 6.9', label: 'MODERATE — Threshold injury', color: C.amber },
        { v: '≤ 6.9', label: 'LOW — Minor effects', color: C.green },
    ];
    by += 0.62;
    s.addText('Severity thresholds (kPa):', {
        x: 5.18, y: by, w: 4.3, h: 0.22,
        fontFace: 'Arial', fontSize: 8, bold: true, color: C.dgray,
        isTextBox: true, margin: 0,
    });
    bThresh.forEach((th, i) => {
        box(s, 5.18, by + 0.22 + i * 0.2, 0.5, 0.18, th.color, th.color);
        s.addText(`${th.v}  ${th.label}`, {
            x: 5.74, y: by + 0.22 + i * 0.2, w: 3.7, h: 0.18,
            fontFace: 'Arial', fontSize: 8, color: C.dgray,
            isTextBox: true, margin: 0,
        });
    });

    // Bottom statement
    box(s, 0.35, 5.22, 9.3, 0.3, 'EBF5FB', 'AED6F1');
    s.addText('Two different physical quantities.  Two independent consequence models.  One spatial decision layer.', {
        x: 0.45, y: 5.24, w: 9.1, h: 0.26,
        fontFace: 'Arial', fontSize: 9.5, bold: true, color: C.navy,
        align: 'center', isTextBox: true, margin: 0,
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5 — SPATIAL COMPUTATION
// ─────────────────────────────────────────────────────────────────────────────
{
    const s = pres.addSlide();
    s.background = { color: C.white };

    addTitle(s, '"Every Point Becomes a Consequence"');
    s.addShape(pres.ShapeType.line, {
        x: 0.4, y: 0.68, w: 9.2, h: 0,
        line: { color: C.lgray, width: 0.75 },
    });

    // Subtitle
    s.addText('Thousands of spatial evaluations → continuous hazard field', {
        x: 0.4, y: 0.74, w: 9.2, h: 0.26,
        fontFace: 'Arial', fontSize: 10, color: C.mgray, italic: true,
        isTextBox: true, margin: 0,
    });

    // Grid visualization (left half)
    const gridX = 0.35, gridY = 1.05, gridW = 4.5, gridH = 3.6;
    box(s, gridX, gridY, gridW, gridH, 'F2F3F4', C.lgray);

    // Draw grid of receiver points 7x6
    const gCols = 9, gRows = 7;
    const cellW = gridW / gCols, cellH = gridH / gRows;
    // center of facility in grid
    const fcX = gridX + gridW / 2, fcY = gridY + gridH / 2;

    for (let r = 0; r < gRows; r++) {
        for (let c = 0; c < gCols; c++) {
            const px = gridX + (c + 0.5) * cellW;
            const py = gridY + (r + 0.5) * cellH;
            const dx = px - fcX, dy = py - fcY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            let color;
            if (dist < 0.5) color = C.red;
            else if (dist < 1.0) color = C.orange;
            else if (dist < 1.7) color = C.amber;
            else if (dist < 2.3) color = C.green;
            else color = C.lgray;

            // Skip center facility cell
            if (Math.abs(dx) < cellW * 0.8 && Math.abs(dy) < cellH * 0.8) continue;

            s.addShape(pres.ShapeType.ellipse, {
                x: px - 0.06, y: py - 0.06, w: 0.12, h: 0.12,
                fill: { color },
                line: { color, width: 0 },
            });
        }
    }

    // Facility box in center
    box(s, fcX - 0.28, fcY - 0.22, 0.56, 0.44, C.navy, C.navy, { rectRadius: 0.03 });
    s.addText('TANK', {
        x: fcX - 0.28, y: fcY - 0.22, w: 0.56, h: 0.44,
        fontFace: 'Arial', fontSize: 7, bold: true, color: C.white,
        align: 'center', valign: 'middle', isTextBox: true, margin: 0,
    });

    // Grid label
    s.addText('STRUCTURED SPATIAL GRID  —  Each node = one consequence evaluation', {
        x: gridX, y: gridY + gridH + 0.06, w: gridW, h: 0.22,
        fontFace: 'Arial', fontSize: 7.5, color: C.mgray,
        align: 'center', isTextBox: true, margin: 0,
    });

    // Arrow right to hazard field
    arrowR(s, gridX + gridW + 0.1, gridY + gridH / 2, 0.55);

    // Hazard field (right half)
    const hx = 5.2, hy = 1.05, hw = 4.45, hh = 3.6;
    box(s, hx, hy, hw, hh, 'F8F9FA', C.lgray);

    // Concentric hazard bands
    const hazBands = [
        { rx: 0.55, ry: 0.42, color: 'FADBD8', border: C.red },
        { rx: 1.05, ry: 0.82, color: 'FAD7A0', border: C.orange },
        { rx: 1.65, ry: 1.28, color: 'FCF3CF', border: C.amber },
        { rx: 2.05, ry: 1.62, color: 'D5F5E3', border: C.green },
    ];
    const hcx = hx + hw / 2 - 0.15, hcy = hy + hh / 2;
    hazBands.slice().reverse().forEach(b => {
        s.addShape(pres.ShapeType.ellipse, {
            x: hcx - b.rx, y: hcy - b.ry, w: b.rx * 2, h: b.ry * 2,
            fill: { color: b.color, transparency: 25 },
            line: { color: b.border, width: 1 },
        });
    });

    // Wind vector on hazard map
    s.addShape(pres.ShapeType.line, {
        x: hx + 0.2, y: hy + 0.3, w: 0.9, h: 0,
        line: { color: C.blue, width: 2, endArrowType: 'arrow' },
    });
    s.addText('WIND →', {
        x: hx + 0.15, y: hy + 0.36, w: 1.0, h: 0.2,
        fontFace: 'Arial', fontSize: 7, bold: true, color: C.blue,
        isTextBox: true, margin: 0,
    });

    // Facility on hazard map
    box(s, hcx - 0.28, hcy - 0.22, 0.56, 0.44, C.navy, C.navy, { rectRadius: 0.03 });
    s.addText('TANK', {
        x: hcx - 0.28, y: hcy - 0.22, w: 0.56, h: 0.44,
        fontFace: 'Arial', fontSize: 7, bold: true, color: C.white,
        align: 'center', valign: 'middle', isTextBox: true, margin: 0,
    });

    // Legend on hazard map
    const hlegend = [
        { color: C.red, label: 'EXTREME' },
        { color: C.orange, label: 'HIGH' },
        { color: C.amber, label: 'MODERATE' },
        { color: C.green, label: 'LOW' },
    ];
    hlegend.forEach((l, i) => {
        box(s, hx + 0.12, hy + hh - 0.95 + i * 0.22, 0.18, 0.16, l.color, l.color);
        s.addText(l.label, {
            x: hx + 0.36, y: hy + hh - 0.97 + i * 0.22, w: 1.2, h: 0.18,
            fontFace: 'Arial', fontSize: 8, color: C.dgray,
            isTextBox: true, margin: 0,
        });
    });

    s.addText('COMPUTED HAZARD FIELD  —  Physics-derived contours', {
        x: hx, y: hy + hh + 0.06, w: hw, h: 0.22,
        fontFace: 'Arial', fontSize: 7.5, color: C.mgray,
        align: 'center', isTextBox: true, margin: 0,
    });

    // Evaluation pipeline callout
    const evalY = 4.92;
    const evalSteps = ['Distance', 'Thermal q″', 'Blast ΔP', 'Severity'];
    const evalW = 1.9, evalX = 0.35;
    evalSteps.forEach((st, i) => {
        box(s, evalX + i * (evalW + 0.12), evalY, evalW, 0.38,
            i === 3 ? C.navy : 'EBF5FB',
            i === 3 ? C.navy : C.blue);
        s.addText(st, {
            x: evalX + i * (evalW + 0.12), y: evalY, w: evalW, h: 0.38,
            fontFace: 'Arial', fontSize: 9, bold: true,
            color: i === 3 ? C.white : C.navy,
            align: 'center', valign: 'middle', isTextBox: true, margin: 0,
        });
        if (i < evalSteps.length - 1) {
            arrowR(s, evalX + i * (evalW + 0.12) + evalW, evalY + 0.19, 0.12);
        }
    });

    // Key callout quote
    box(s, 0.35, 5.34, 9.3, 0.24, 'EBF5FB', 'AED6F1');
    s.addText('"We do not draw a predefined circle. The geometry emerges from spatial consequence calculations."', {
        x: 0.45, y: 5.34, w: 9.1, h: 0.24,
        fontFace: 'Arial', fontSize: 8.5, bold: true, color: C.navy,
        align: 'center', valign: 'middle', isTextBox: true, margin: 0,
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 6 — WIND + SEVERITY + SCENARIO COMPARISON
// ─────────────────────────────────────────────────────────────────────────────
{
    const s = pres.addSlide();
    s.background = { color: C.white };

    addTitle(s, '"The Hazard Changes When the Scenario Changes"');
    s.addShape(pres.ShapeType.line, {
        x: 0.4, y: 0.68, w: 9.2, h: 0,
        line: { color: C.lgray, width: 0.75 },
    });

    // ── TOP LEFT: WIND ─────────────────────────────────────────────
    box(s, 0.35, 0.78, 4.5, 2.1, 'F2F3F4', C.lgray);
    s.addText('WIND-DEPENDENT SPATIAL BEHAVIOR', {
        x: 0.45, y: 0.84, w: 4.3, h: 0.26,
        fontFace: 'Arial', fontSize: 9, bold: true, color: C.blue,
        isTextBox: true, margin: 0,
    });

    // Wind arrows
    const windY = 1.22;
    for (let i = 0; i < 4; i++) {
        s.addShape(pres.ShapeType.line, {
            x: 0.5 + i * 0.25, y: windY + i * 0.03, w: 1.2 - i * 0.1, h: 0,
            line: { color: C.blue, width: 1.5 + i * 0.3, endArrowType: i === 3 ? 'arrow' : 'none' },
        });
    }
    s.addText('WIND →', {
        x: 0.5, y: windY + 0.2, w: 1.5, h: 0.22,
        fontFace: 'Arial', fontSize: 9, bold: true, color: C.blue,
        isTextBox: true, margin: 0,
    });

    // Source
    box(s, 2.0, 1.12, 0.55, 0.44, C.navy, C.navy, { rectRadius: 0.03 });
    s.addText('TANK', {
        x: 2.0, y: 1.12, w: 0.55, h: 0.44,
        fontFace: 'Arial', fontSize: 7, bold: true, color: C.white,
        align: 'center', valign: 'middle', isTextBox: true, margin: 0,
    });

    // Asymmetric hazard field
    const wBands = [
        { rx: 1.7, ry: 0.55, color: 'FADBD8', border: C.red },
        { rx: 1.2, ry: 0.42, color: 'FAD7A0', border: C.orange },
        { rx: 0.7, ry: 0.3, color: 'D5F5E3', border: C.green },
    ];
    const wcx = 2.28, wcy = 1.34;
    wBands.slice().reverse().forEach(b => {
        s.addShape(pres.ShapeType.ellipse, {
            x: wcx - 0.35, y: wcy - b.ry, w: b.rx + 0.35, h: b.ry * 2,
            fill: { color: b.color, transparency: 35 },
            line: { color: b.border, width: 0.75 },
        });
    });

    s.addText('Upwind: reduced extent\nDownwind: extended plume', {
        x: 0.45, y: 2.46, w: 4.3, h: 0.34,
        fontFace: 'Arial', fontSize: 8, color: C.mgray,
        isTextBox: true, margin: 2,
    });

    // ── TOP RIGHT: SEVERITY ────────────────────────────────────────
    box(s, 5.15, 0.78, 4.5, 2.1, 'F2F3F4', C.lgray);
    s.addText('MULTI-HAZARD SEVERITY BANDS', {
        x: 5.25, y: 0.84, w: 4.3, h: 0.26,
        fontFace: 'Arial', fontSize: 9, bold: true, color: C.navy,
        isTextBox: true, margin: 0,
    });

    const sevBands = [
        { label: 'EXTREME', th: 'Thermal > 37.5 kW/m²  ·  Blast > 83 kPa', color: C.red },
        { label: 'HIGH', th: 'Thermal > 12.5 kW/m²  ·  Blast > 21 kPa', color: C.orange },
        { label: 'MODERATE', th: 'Thermal > 4.7 kW/m²  ·  Blast > 6.9 kPa', color: C.amber },
        { label: 'LOW', th: 'Thermal ≤ 4.7 kW/m²  ·  Blast ≤ 6.9 kPa', color: C.green },
    ];
    sevBands.forEach((b, i) => {
        box(s, 5.2, 1.16 + i * 0.38, 4.3, 0.34, b.color, b.color);
        s.addText(b.label, {
            x: 5.24, y: 1.17 + i * 0.38, w: 1.1, h: 0.32,
            fontFace: 'Arial', fontSize: 9, bold: true, color: C.white,
            align: 'center', valign: 'middle', isTextBox: true, margin: 0,
        });
        s.addText(b.th, {
            x: 6.38, y: 1.19 + i * 0.38, w: 3.1, h: 0.28,
            fontFace: 'Arial', fontSize: 7.5, color: C.white,
            valign: 'middle', isTextBox: true, margin: 2,
        });
    });

    // ── BOTTOM: SCENARIO COMPARISON ────────────────────────────────
    s.addShape(pres.ShapeType.line, {
        x: 0.35, y: 2.96, w: 9.3, h: 0,
        line: { color: C.lgray, width: 1 },
    });
    s.addText('SCENARIO COMPARISON', {
        x: 0.35, y: 3.02, w: 9.3, h: 0.28,
        fontFace: 'Arial', fontSize: 10, bold: true, color: C.navy,
        align: 'center', isTextBox: true, margin: 0,
    });

    // Scenario A
    box(s, 0.35, 3.36, 4.35, 1.88, 'F2F3F4', C.lgray);
    s.addText('SCENARIO A', {
        x: 0.45, y: 3.42, w: 4.15, h: 0.26,
        fontFace: 'Arial', fontSize: 9, bold: true, color: C.navy,
        isTextBox: true, margin: 0,
    });
    s.addText('Small tank · Low wind · Pool fire', {
        x: 0.45, y: 3.66, w: 4.15, h: 0.2,
        fontFace: 'Arial', fontSize: 8, color: C.mgray,
        isTextBox: true, margin: 0,
    });

    // Small concentric rings for A
    const aCX = 2.45, aCY = 4.5;
    [
        { r: 0.32, color: 'FADBD8' },
        { r: 0.55, color: 'FAD7A0' },
        { r: 0.78, color: 'D5F5E3' },
    ].reverse().forEach(b => {
        s.addShape(pres.ShapeType.ellipse, {
            x: aCX - b.r, y: aCY - b.r * 0.7, w: b.r * 2, h: b.r * 1.4,
            fill: { color: b.color, transparency: 30 },
            line: { color: b.color, width: 0.5 },
        });
    });
    box(s, aCX - 0.17, aCY - 0.14, 0.34, 0.28, C.navy, C.navy);

    // Scenario B
    box(s, 5.3, 3.36, 4.35, 1.88, 'F2F3F4', C.lgray);
    s.addText('SCENARIO B', {
        x: 5.4, y: 3.42, w: 4.15, h: 0.26,
        fontFace: 'Arial', fontSize: 9, bold: true, color: C.navy,
        isTextBox: true, margin: 0,
    });
    s.addText('Large tank · High wind · BLEVE explosion', {
        x: 5.4, y: 3.66, w: 4.15, h: 0.2,
        fontFace: 'Arial', fontSize: 8, color: C.mgray,
        isTextBox: true, margin: 0,
    });

    // Large asymmetric rings for B
    const bCX = 7.35, bCY = 4.42;
    [
        { rx: 1.5, ry: 0.72, color: 'FADBD8' },
        { rx: 1.05, ry: 0.55, color: 'FAD7A0' },
        { rx: 0.6, ry: 0.32, color: 'D5F5E3' },
    ].reverse().forEach(b => {
        s.addShape(pres.ShapeType.ellipse, {
            x: bCX - 0.35, y: bCY - b.ry, w: b.rx + 0.35, h: b.ry * 2,
            fill: { color: b.color, transparency: 30 },
            line: { color: b.color, width: 0.5 },
        });
    });
    box(s, bCX - 0.17, bCY - 0.14, 0.34, 0.28, C.navy, C.navy);
    // Wind arrow on B
    s.addShape(pres.ShapeType.line, {
        x: 5.45, y: bCY, w: 0.7, h: 0,
        line: { color: C.blue, width: 1.5, endArrowType: 'arrow' },
    });

    // VS divider
    s.addShape(pres.ShapeType.ellipse, {
        x: 4.72, y: 4.08, w: 0.56, h: 0.56,
        fill: { color: C.navy },
        line: { color: C.navy, width: 0 },
    });
    s.addText('VS', {
        x: 4.72, y: 4.08, w: 0.56, h: 0.56,
        fontFace: 'Arial', fontSize: 10, bold: true, color: C.white,
        align: 'center', valign: 'middle', isTextBox: true, margin: 0,
    });

    // Bottom label
    s.addText('Different physical inputs  →  Different computed consequences  →  Different hazard geometry', {
        x: 0.35, y: 5.28, w: 9.3, h: 0.26,
        fontFace: 'Arial', fontSize: 9, bold: true, color: C.navy,
        align: 'center', isTextBox: true, margin: 0,
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 7 — RESPONDER DECISION
// ─────────────────────────────────────────────────────────────────────────────
{
    const s = pres.addSlide();
    s.background = { color: C.white };

    addTitle(s, '"From Hazard Map to Approach Intelligence"');
    s.addShape(pres.ShapeType.line, {
        x: 0.4, y: 0.68, w: 9.2, h: 0,
        line: { color: C.lgray, width: 0.75 },
    });

    // Central hazard map
    const mapCX = 5.0, mapCY = 2.9, mapR = 1.8;

    // Hazard bands
    const hbands = [
        { rx: 1.8, ry: 1.35, color: 'FADBD8', border: C.red },
        { rx: 1.35, ry: 1.0, color: 'FAD7A0', border: C.orange },
        { rx: 0.85, ry: 0.64, color: 'D5F5E3', border: C.green },
    ];
    hbands.slice().reverse().forEach(b => {
        s.addShape(pres.ShapeType.ellipse, {
            x: mapCX - b.rx, y: mapCY - b.ry, w: b.rx * 2, h: b.ry * 2,
            fill: { color: b.color, transparency: 30 },
            line: { color: b.border, width: 1 },
        });
    });

    // Facility at center
    box(s, mapCX - 0.28, mapCY - 0.22, 0.56, 0.44, C.navy, C.navy, { rectRadius: 0.03 });
    s.addText('TANK', {
        x: mapCX - 0.28, y: mapCY - 0.22, w: 0.56, h: 0.44,
        fontFace: 'Arial', fontSize: 7, bold: true, color: C.white,
        align: 'center', valign: 'middle', isTextBox: true, margin: 0,
    });

    // 8 compass directions with exposure labels
    const sectors = [
        { dir: 'N', angle: -90, dx: 0, dy: -1, exposure: 'HIGH', color: C.orange },
        { dir: 'NE', angle: -45, dx: 0.707, dy: -0.707, exposure: 'HIGH', color: C.orange },
        { dir: 'E', angle: 0, dx: 1, dy: 0, exposure: 'EXTREME', color: C.red },
        { dir: 'SE', angle: 45, dx: 0.707, dy: 0.707, exposure: 'HIGH', color: C.orange },
        { dir: 'S', angle: 90, dx: 0, dy: 1, exposure: 'MODERATE', color: C.amber },
        { dir: 'SW', angle: 135, dx: -0.707, dy: 0.707, exposure: 'LOW ★', color: C.green },
        { dir: 'W', angle: 180, dx: -1, dy: 0, exposure: 'LOW', color: C.green },
        { dir: 'NW', angle: -135, dx: -0.707, dy: -0.707, exposure: 'MODERATE', color: C.amber },
    ];

    const radius = 2.05;
    sectors.forEach(sec => {
        const ex = mapCX + sec.dx * radius;
        const ey = mapCY + sec.dy * radius;

        // Direction line
        s.addShape(pres.ShapeType.line, {
            x: mapCX + sec.dx * 0.32, y: mapCY + sec.dy * 0.25,
            w: sec.dx * (radius - 0.38), h: sec.dy * (radius - 0.38),
            line: { color: sec.color === C.green ? C.green : sec.color, width: sec.exposure.includes('★') ? 2.5 : 1, dashType: 'dash' },
        });

        // Exposure badge
        const badgeW = 1.08, badgeH = 0.3;
        box(s, ex - badgeW / 2, ey - badgeH / 2, badgeW, badgeH, sec.color, sec.color);
        s.addText(sec.dir + '  ' + sec.exposure, {
            x: ex - badgeW / 2, y: ey - badgeH / 2, w: badgeW, h: badgeH,
            fontFace: 'Arial', fontSize: 7.5, bold: true, color: C.white,
            align: 'center', valign: 'middle', isTextBox: true, margin: 0,
        });
    });

    // Wind vector
    s.addShape(pres.ShapeType.line, {
        x: 3.0, y: 1.0, w: 0.8, h: 0,
        line: { color: C.blue, width: 2, endArrowType: 'arrow' },
    });
    s.addText('WIND →', {
        x: 2.85, y: 0.82, w: 1.1, h: 0.2,
        fontFace: 'Arial', fontSize: 7.5, bold: true, color: C.blue,
        isTextBox: true, margin: 0,
    });

    // Decision flow — right side
    const dfX = 8.3;
    const dfSteps = [
        { label: 'HAZARD\nFIELD', color: C.blue },
        { label: 'DIRECTIONAL\nANALYSIS', color: C.dgray },
        { label: 'RANK\nSECTORS', color: C.orange },
        { label: 'LOWER-EXPOSURE\nAPPROACH', color: C.green },
    ];
    dfSteps.forEach((st, i) => {
        flowBox(s, st.label, null, dfX - 0.01, 0.82 + i * 0.95, 1.55, 0.76, st.color, C.white);
        if (i < dfSteps.length - 1) {
            arrowD(s, dfX + 1.55 / 2 - 0.01, 0.82 + i * 0.95 + 0.76, 0.19);
        }
    });

    // Highlight recommended
    s.addShape(pres.ShapeType.rect, {
        x: dfX - 0.08, y: 0.82 + 3 * 0.95 - 0.04, w: 1.7, h: 0.84,
        fill: { color: C.green, transparency: 85 },
        line: { color: C.green, width: 2 },
    });

    // ★ "Lowest modeled" annotation
    s.addText('★  LOWER MODELED\nEXPOSURE  (SW)', {
        x: 2.5, y: 4.78, w: 2.5, h: 0.38,
        fontFace: 'Arial', fontSize: 9, bold: true, color: C.green,
        isTextBox: true, margin: 0,
    });

    // No safe approach note
    box(s, 0.35, 5.2, 5.0, 0.32, 'FDFEFE', C.orange);
    s.addText('⚠  If all directions exceed defined criteria → NO SAFE APPROACH IDENTIFIED', {
        x: 0.45, y: 5.22, w: 4.8, h: 0.28,
        fontFace: 'Arial', fontSize: 8, color: C.orange,
        isTextBox: true, margin: 0,
    });

    // Disclaimer
    s.addText('Screening-level decision support — not a certified safety boundary.', {
        x: 5.5, y: 5.28, w: 4.2, h: 0.22,
        fontFace: 'Arial', fontSize: 7.5, color: C.mgray, italic: true,
        isTextBox: true, margin: 0,
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 8 — WHY FIREGUARD / FINAL IMPACT
// ─────────────────────────────────────────────────────────────────────────────
{
    const s = pres.addSlide();
    s.background = { color: C.white };

    addTitle(s, '"Why FIREGUARD?"');
    s.addShape(pres.ShapeType.line, {
        x: 0.4, y: 0.68, w: 9.2, h: 0,
        line: { color: C.lgray, width: 0.75 },
    });

    // 6 pillars — 2 rows × 3 columns
    const pillars = [
        { num: '01', title: 'PHYSICS-BASED', body: 'Deterministic consequence models rather than arbitrary fixed circles.', color: C.navy },
        { num: '02', title: 'SPATIALLY EXPLICIT', body: 'Evaluates consequences across the full surrounding area.', color: C.blue },
        { num: '03', title: 'WIND-AWARE', body: 'Represents wind influence on hazard geometry.', color: '2980B9' },
        { num: '04', title: 'MULTI-HAZARD', body: 'Thermal radiation + blast overpressure — two independent models.', color: C.red },
        { num: '05', title: 'DECISION-ORIENTED', body: 'Transforms hazard calculations into approach-direction intelligence.', color: C.orange },
        { num: '06', title: 'EXPLAINABLE', body: 'Inputs → Models → Spatial field → Severity → Decision.', color: C.green },
    ];

    const pW = 2.92, pH = 1.5, pGap = 0.12;
    pillars.forEach((p, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const px = 0.35 + col * (pW + pGap);
        const py = 0.84 + row * (pH + pGap);

        box(s, px, py, pW, pH, 'F8F9FA', C.lgray);

        // Color accent top
        box(s, px, py, pW, 0.1, p.color, p.color);

        // Number
        s.addText(p.num, {
            x: px + 0.12, y: py + 0.16, w: 0.6, h: 0.42,
            fontFace: 'Arial', fontSize: 26, bold: true, color: p.color,
            isTextBox: true, margin: 0,
        });

        // Title
        s.addText(p.title, {
            x: px + 0.74, y: py + 0.16, w: pW - 0.86, h: 0.42,
            fontFace: 'Arial', fontSize: 10, bold: true, color: C.navy,
            valign: 'middle', isTextBox: true, margin: 0,
        });

        // Body
        s.addText(p.body, {
            x: px + 0.12, y: py + 0.64, w: pW - 0.24, h: 0.78,
            fontFace: 'Arial', fontSize: 8.5, color: C.dgray,
            isTextBox: true, margin: 0,
        });
    });

    // Pipeline visual
    const pipeY = 4.08;
    const pipeSteps = ['INCIDENT', 'PHYSICS', 'HAZARD FIELD', 'APPROACH INTELLIGENCE'];
    const pipeW = 2.1;
    pipeSteps.forEach((st, i) => {
        const fill = i === 3 ? C.navy : i === 2 ? C.red : i === 1 ? C.blue : C.dgray;
        box(s, 0.35 + i * (pipeW + 0.08), pipeY, pipeW, 0.42, fill, fill);
        s.addText(st, {
            x: 0.35 + i * (pipeW + 0.08), y: pipeY, w: pipeW, h: 0.42,
            fontFace: 'Arial', fontSize: 9, bold: true, color: C.white,
            align: 'center', valign: 'middle', isTextBox: true, margin: 0,
        });
        if (i < pipeSteps.length - 1) {
            arrowR(s, 0.35 + i * (pipeW + 0.08) + pipeW, pipeY + 0.21, 0.08);
        }
    });

    // Final tagline
    s.addText('"DON\'T DRAW THE DANGER.', {
        x: 0.35, y: 4.68, w: 9.3, h: 0.45,
        fontFace: 'Arial', fontSize: 28, bold: true, color: C.navy,
        align: 'center', isTextBox: true, margin: 0,
    });
    s.addText('COMPUTE IT."', {
        x: 0.35, y: 5.1, w: 9.3, h: 0.35,
        fontFace: 'Arial', fontSize: 22, bold: true, color: C.red,
        align: 'center', isTextBox: true, margin: 0,
    });

    // Team footer
    s.addText('FIREGUARD  ·  TEAM ATOM  ·  HACKTRONICS 2ND EDITION', {
        x: 0.35, y: 5.44, w: 9.3, h: 0.18,
        fontFace: 'Arial', fontSize: 8, color: C.mgray, charSpacing: 1.5,
        align: 'center', isTextBox: true, margin: 0,
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT
// ─────────────────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: './FIREGUARD_ATOM38.pptx' })
    .then(() => console.log('Done'))
    .catch(e => { console.error(e); process.exit(1); });