// Theme-aware remap for PlantUML output.
//
// PlantUML generates with its own light default palette. In dark mode we rewrite the
// generated source to the Tokyo Night palette before rendering and repaint baked-in
// SVG defaults after. In light mode we apply the Solarized-light palette so the diagram
// is warm and readable rather than plain white.

const TOKYO_NIGHT = {
    '#FEFEFE': '#1A1B26',   // default card bg  -> Tokyo Night bg
    '#F1F1F1': '#16161E',   // secondary bg     -> panel
    '#1A1A2E': '#C0CAF5',   // dark text        -> foreground
    '#2C3E50': '#C0CAF5',
    '#555555': '#A9B1D6',
    '#EBF5FB': '#24283B',
    '#E8F4FD': '#24283B',
    '#F2F3F4': '#24283B',
    '#FFF3CD': '#3B3A22',   // note/warning bg
    '#E0F2FE': '#1F2A44',
    '#0369A1': '#7DCFFF',   // cyan
    '#0284C7': '#5FA8D3',
    '#FEFECE': '#3B3A22'
};

const TOKYO_NIGHT_SKINPARAMS = [
    'skinparam ArrowColor #A9B1D6',
    'skinparam activityStartColor #C0CAF5',
    'skinparam activityEndColor #F7768E',
    'skinparam activityDiamondBackgroundColor #24283B',
    'skinparam activityDiamondBorderColor #BB9AF7',
    'skinparam activityFontColor #C0CAF5',
    'skinparam classBackgroundColor #24283B',
    'skinparam classBorderColor #7AA2F7',
    'skinparam classFontColor #C0CAF5',
    'skinparam classAttributeFontColor #A9B1D6',
    'skinparam noteBackgroundColor #3B3A22',
    'skinparam noteBorderColor #E0AF68',
    'skinparam noteFontColor #C0CAF5'
].join('\n');

// Solarized light — warm, low-contrast, VS Code Solarized Light feel.
const SOLARIZED_LIGHT = {
    '#FEFEFE': '#FDF6E3',   // base3
    '#F1F1F1': '#EEE8D5',   // base2
    '#1A1A2E': '#073642',   // base02 (dark text)
    '#2C3E50': '#073642',
    '#555555': '#586E75',   // base01
    '#EBF5FB': '#E8E2CF',
    '#E8F4FD': '#E8E2CF',
    '#F2F3F4': '#EEE8D5',
    '#FFF3CD': '#FDF6E3',
    '#E0F2FE': '#E8E2CF',
    '#0369A1': '#268BD2',   // solarized blue
    '#0284C7': '#268BD2',
    '#FEFECE': '#FDF6E3'
};

const SOLARIZED_SKINPARAMS = [
    'skinparam ArrowColor #586E75',
    'skinparam activityStartColor #073642',
    'skinparam activityEndColor #DC322F',
    'skinparam activityDiamondBackgroundColor #EEE8D5',
    'skinparam activityDiamondBorderColor #6C71C4',
    'skinparam activityFontColor #073642',
    'skinparam classBackgroundColor #EEE8D5',
    'skinparam classBorderColor #268BD2',
    'skinparam classFontColor #073642',
    'skinparam classAttributeFontColor #586E75',
    'skinparam noteBackgroundColor #FDF6E3',
    'skinparam noteBorderColor #B58900',
    'skinparam noteFontColor #073642'
].join('\n');

// Colours PlantUML bakes into the SVG itself (theme defaults, stop nodes).
const SVG_FIX_DARK = {
    '#222222': '#C0CAF5',
    '#ADD1B2': '#24283B',
    '#FEFECE': '#3B3A22',
    '#F1F1F1': '#16161E',
    '#FFFFFF': '#C0CAF5',
    '#000000': '#C0CAF5'
};

const SVG_FIX_LIGHT = {
    '#FFFFFF': '#073642',
    '#000000': '#073642',
    '#FEFECE': '#FDF6E3',
    '#ADD1B2': '#EEE8D5'
};

function remapPalette(code, palette) {
    const out = code.replace(/#[0-9a-f]{6}/gi, m => palette[m.toUpperCase()] || m);
    return out;
}

function darkenPalette(code) {
    const out = remapPalette(code, TOKYO_NIGHT);
    return out.replace('@startuml', '@startuml\n' + TOKYO_NIGHT_SKINPARAMS);
}

function lightenPalette(code) {
    const out = remapPalette(code, SOLARIZED_LIGHT);
    return out.replace('@startuml', '@startuml\n' + SOLARIZED_SKINPARAMS);
}

function fixDarkSvg(svg) {
    return svg.replace(/#[0-9A-Fa-f]{6}\b/g, m => SVG_FIX_DARK[m.toUpperCase()] || m);
}

function fixLightSvg(svg) {
    return svg.replace(/#[0-9A-Fa-f]{6}\b/g, m => SVG_FIX_LIGHT[m.toUpperCase()] || m);
}

// Apply the correct palette/skinparams for a diagram rendered at the given theme.
function themedPalette(code, theme) {
    return theme === 'light' ? lightenPalette(code) : darkenPalette(code);
}

function fixThemedSvg(svg, theme) {
    return theme === 'light' ? fixLightSvg(svg) : fixDarkSvg(svg);
}

module.exports = {
    TOKYO_NIGHT, SOLARIZED_LIGHT,
    darkenPalette, lightenPalette, fixDarkSvg, fixLightSvg, themedPalette, fixThemedSvg
};
