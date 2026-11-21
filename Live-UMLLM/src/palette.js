// Dark-theme remap for PlantUML output. PlantUML generates with a light palette,
// so the generated source is rewritten before rendering, and the SVG's hardcoded
// defaults (which no skinparam reaches) are repainted after.
const DARK_PALETTE = {
    '#FEFEFE': '#1E1E1E',
    '#1A1A2E': '#E0E0E0',
    '#2C3E50': '#CFD8DC',
    '#555555': '#B0B0B0',
    '#EBF5FB': '#22303A',
    '#E8F4FD': '#22303A',
    '#F2F3F4': '#2D2D2D',
    '#FFF3CD': '#3A3320',
    '#E0F2FE': '#1E3A4F',
    '#0369A1': '#7CC4F0',
    '#0284C7': '#5FB2E0',
    '#F1F1F1': '#22303A'
};

// PlantUML defaults no generated skinparam covers.
const EXTRA_SKINPARAMS = [
    'skinparam ArrowColor #B0B0B0',
    'skinparam activityStartColor #E0E0E0',
    'skinparam classBackgroundColor #22303A',
    'skinparam classBorderColor #2980B9',
    'skinparam classFontColor #E0E0E0',
    'skinparam classAttributeFontColor #E0E0E0',
    'skinparam noteBackgroundColor #3A3320',
    'skinparam noteBorderColor #6B5E2E',
    'skinparam noteFontColor #E0E0E0'
].join('\n');

// Colours PlantUML bakes into the SVG itself (theme defaults, stop nodes).
const SVG_FIX = {
    '#222222': '#E0E0E0',
    '#ADD1B2': '#22303A',
    '#FEFECE': '#3A3320',
    '#F1F1F1': '#22303A',
    '#FFFFFF': '#E0E0E0',
    '#000000': '#E0E0E0'
};

function darkenPalette(code) {
    const out = code.replace(/#[0-9a-f]{6}/gi, m => DARK_PALETTE[m.toUpperCase()] || m);
    return out.replace('@startuml', '@startuml\n' + EXTRA_SKINPARAMS);
}

function fixDarkSvg(svg) {
    return svg.replace(/#[0-9A-Fa-f]{6}\b/g, m => SVG_FIX[m.toUpperCase()] || m);
}

module.exports = { DARK_PALETTE, SVG_FIX, darkenPalette, fixDarkSvg };
