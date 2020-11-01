import path from 'path';
import { execSync } from 'child_process';
import fs from 'fs';

const getWorkspacesRoot = dir => {
  const pkg = path.join(dir, 'package.json');
  let found = false;
  if (fs.existsSync(pkg)) {
    const { workspaces } = require(pkg);
    if (workspaces) found = true;
  }
  if (found) return dir;
  return getWorkspacesRoot(path.join(dir, '../'));
};

const rootDir = getWorkspacesRoot(__dirname);
console.log('rootDir: ', rootDir);

const allWorkspaces = JSON.parse(execSync('yarn workspaces --silent info', { cwd: rootDir }).toString());
for (let key in allWorkspaces) {
  allWorkspaces[key].location = path.join(rootDir, allWorkspaces[key].location);
  allWorkspaces[key].pkgJson = require(path.join(allWorkspaces[key].location, 'package.json'));
}

let [, , ...cliParams] = process.argv;

function getParam(param, value = false) {
  const p = cliParams.find(p => p.includes(param));

  cliParams = cliParams.filter(p => !p.includes(param));

  if (value) return p ? p.split('=')[1] : false;

  return Boolean(p);
}

const help = getParam('--help');

if (help) printHelp();

const ignoreDev = getParam('--ignore-dev');

const ignoreYarnLock = getParam('--ignore-yarn-lock');

const defaultPackageJson = getParam('--default-package-json', true);

const defaultWorkspacesFolder = getParam('--default-workspaces-folder', true) || 'node_modules';

const copyOnlyFiles = getParam('--copy-only-files');

const workspaceName = (function getWorkspaceName() {
  const [targetWorkspaceName] = cliParams;

  if (!targetWorkspaceName) {
    console.log('please provide workspace name of folder');
    process.exit(1);
  }

  if (allWorkspaces[targetWorkspaceName]) return targetWorkspaceName;

  let workspaceName = Object.keys(allWorkspaces).find(workspace => allWorkspaces[workspace].location === targetWorkspaceName);

  if (workspaceName) return workspaceName;

  console.log(`no such workspace of folder ${targetWorkspaceName}`);
  process.exit(1);
})();

function printHelp() {
  console.log(`
isolating workspace node_modules
  `);

  process.exit(0);
}

module.exports = {
  rootDir,
  workspaceName,
  ignoreDev,
  allWorkspaces,
  ignoreYarnLock,
  defaultPackageJson,
  defaultWorkspacesFolder,
  copyOnlyFiles,
  getWorkspaceName,
};
