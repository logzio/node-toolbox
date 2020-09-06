import path from 'path';
import minimist from 'minimist';
import { getPackages } from '@lerna/project';
import filterPackages from '@lerna/filter-packages';
import batchPackages from '@lerna/batch-packages';
import copy from 'rollup-plugin-copy';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';

async function getSortedPackages(scope, ignore) {
  const packages = await getPackages(__dirname);
  const filtered = filterPackages(packages, scope, ignore, false);

  return batchPackages(filtered).reduce((arr, batch) => arr.concat(batch), []);
}

async function main() {
  const config = [];
  // Support --scope and --ignore globs if passed in via commandline
  const { scope, ignore } = minimist(process.argv.slice(2));
  const packages = await getSortedPackages(scope, ignore);
  packages.forEach(pkg => {
    /* Absolute path to package directory */
    const basePath = path.relative(__dirname, pkg.location);
    /* Absolute path to input file */
    const input = path.join(basePath, 'src/index.js');
    /* "main" field from package.json file. */
    const {
      exports: { import: esPath, require: cjsPath },
    } = pkg.toJSON();
    /* Push build config for this package. */
    config.push({
      input,
      output: [
        {
          file: path.join(basePath, cjsPath),
          format: 'cjs',
        },
        {
          file: path.join(basePath, esPath),
          format: 'es',
        },
      ],
      // all dependencies should be listed as external
      external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})],
      // copy the ts declaration file into the dist folder
      plugins: [
        babel({ babelHelpers: 'bundled' }),
        nodeResolve(),
        commonjs(),
        copy({ targets: [{ src: path.join(basePath, 'src/index.d.ts'), dest: path.join(basePath, 'dist') }] }),
      ],
    });
  });

  return config;
}

export default main();
