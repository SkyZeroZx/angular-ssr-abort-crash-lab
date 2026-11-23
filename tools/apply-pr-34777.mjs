// Applies angular/angular-cli#34777 to the installed @angular/ssr snapshot. Runs as postinstall.
//
// The PR adds a catch to asyncDestroyPlatform() in packages/angular/ssr/src/utils/ng.ts. Built with bazel
// from the PR's tree (835b6a4b2f), fesm2022/ssr.mjs differs from vendor/angular-ssr-builds-66fc4762e.tar.gz
// by exactly the two catch lines below and nothing else.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = fileURLToPath(new URL('../node_modules/@angular/ssr/fesm2022/ssr.mjs', import.meta.url));

const before = `      try {
        if (!platformRef.destroyed) {
          platformRef.destroy();
        }
      } finally {
        resolve();
      }`;

const after = `      try {
        if (!platformRef.destroyed) {
          platformRef.destroy();
        }
      } catch (error) {
        console.error('An error occurred while destroying the platform.', error);
      } finally {
        resolve();
      }`;

const source = readFileSync(file, 'utf8');

if (source.includes(after)) {
  console.log('angular/angular-cli#34777 is already applied to @angular/ssr');
} else if (source.split(before).length === 2) {
  writeFileSync(file, source.replace(before, after));
  console.log('applied angular/angular-cli#34777 to @angular/ssr (asyncDestroyPlatform)');
} else {
  throw new Error(`asyncDestroyPlatform() in ${file} is not the code #34777 was written against`);
}
