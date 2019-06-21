// @ts-check

import { readdirSync } from 'fs';

import { terser } from 'rollup-plugin-terser';
import filesize from 'rollup-plugin-filesize';
import typescript from 'rollup-plugin-typescript2';

// if (!('toPascalCase' in String.prototype)) {
//   Object.defineProperty(String.prototype, 'toPascalCase', {
//     value: function toPascalCase() {
//       return !this.length ?
//         '' :
//         this.split(/[^0-9a-z]/gi).map(n => `${n[0].toUpperCase()}${n.slice(1)}`).join('');
//     },
//   });
// }

const allModules = readdirSync('./src').filter((n) => {
  const notFile = !/\.(js|ts)x?$/i.test(n);
  const notCustomTypings = 'custom_typings' !== n;
  const notLib = 'lib' !== n;

  return notFile && notCustomTypings && notLib;
});

function pluginFn(format, minify) {
  return [
    typescript({
      tsconfig: './tsconfig.prod.json',
      useTsconfigDeclarationDir: true,
    }),
    minify && terser({
      compress: true,
      mangle: {
        module: 'esm' === format,
        properties: { regex: /^_/ },
        reserved: ['SignaturError'],
        safari10: true,
        toplevel: true,
      },
      output: { safari10: true },
      safari10: true,
      toplevel: true,
    }),
    filesize({ showBrotliSize: true }),
  ];
};

const multiBuild = allModules.reduce((p, n) => {
  const src = `src/${n}`;
  const dest = `dist/${n}`;
  const tmpl = [
    {
      file: `${dest}/index.mjs`,
      format: 'esm',
      exports: 'named',
    },
    {
      file: `${dest}/index.js`,
      format: 'cjs',
      exports: 'named',
    },
  ];

  for (const o of tmpl) {
    const { file, format } = o;

    const raw = {
      input: `${src}/index.ts`,
      output: {
        ...o,
        sourcemap: true,
        sourcemapExcludeSources: true,
      },
      plugins: pluginFn(format),
      experimentalOptimizeChunks: true,
      treeshake: { moduleSifeEffects: false },
      external: [
        '../lib/clone-deep.js',
        '../lib/parse5.js',
      ],
    };
    const minified = {
      ...raw,
      output: { ...raw.output, file: file.replace(/(.+)(\.m?js)$/, '$1.min$2') },
      plugins: pluginFn(format, true),
    };

    p.push(raw, minified);
  }

  return p;
}, []);

export default multiBuild;
