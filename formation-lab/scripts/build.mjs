// Build script for Formation Lab v23.4.3
import { build } from 'esbuild';
import { mkdirSync } from 'fs';

// Ensure dist directory exists
mkdirSync('dist/scripts', { recursive: true });

const entryPoints = [
  'scripts/main.js',
  'scripts/state.js',
  'scripts/geometry.js',
  'scripts/orientation.js',
  'scripts/drag.js',
  'scripts/pass.js',
  'scripts/render.js',
  'scripts/export.js',
  'scripts/ui.js',
  'scripts/keyboard.js',
  'scripts/presets.js',
  'scripts/audit.js',
  'scripts/version.js'
];

try {
  await build({
    entryPoints,
    outdir: 'dist/scripts',
    bundle: false,
    minify: true,
    sourcemap: true,
    target: ['es2020'],
    format: 'esm',
    keepNames: true, // Preserve function names for debugging
    legalComments: 'none' // Remove comments for smaller size
  });

  console.log('✅ esbuild completed successfully');
  console.log(`📦 Minified ${entryPoints.length} modules to dist/scripts/`);
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}