import path from 'path';
import fs from 'fs';
import fse from 'fs-extra';
import {
  rootDir,
  workspaceName,
  allWorkspaces,
  ignoreDev,
  ignoreYarnLock,
  defaultPackageJson,
  defaultWorkspacesFolder,
  copyOnlyFiles,
} from './params.js';

function getAllRelatedWorkspaces() {
  const workspacesToCopy = [];

  const collectedDependenciesToInstall = [];

  const recursive = name => {
    const {
      pkgJson: { dependencies = {}, devDependencies = {} },
    } = allWorkspaces[name];

    const forEachDep = ([name, version]) => {
      if (allWorkspaces[name] && !workspacesToCopy[name]) {
        workspacesToCopy.push(name);
        recursive(name);
      } else if (!allWorkspaces[name]) collectedDependenciesToInstall.push(`${name}@${version}`);
    };
    Object.entries(dependencies).forEach(forEachDep);
    if (!ignoreDev) Object.entries(devDependencies).forEach(forEachDep);
  };

  recursive(workspaceName);

  return { workspacesToCopy, collectedDependenciesToInstall };
}

function createFolderForRelatedWorkspaces(workspace) {
  const destWorkspacesDir = `${allWorkspaces[workspace].location}/${defaultWorkspacesFolder}`;

  fs.rmdirSync(destWorkspacesDir, { recursive: true });
  fs.mkdirSync(destWorkspacesDir, { recursive: true });

  return destWorkspacesDir;
}

function copyRelatedWorkspacesToDest(workspaces, destinationFolder) {
  workspaces
    .filter(name => name !== workspaceName)
    .forEach(name => {
      allWorkspaces[name].newLocation = path.join(destinationFolder, name);
      //TODO ignore pattern list right now ignore node_modules
      fse.copySync(allWorkspaces[name].location, allWorkspaces[name].newLocation, {
        filter: src => !src.includes('node_modules'),
      });
    });
}

const changeLocation = list => {
  return Object.entries(list).reduce((acc, [pkgName, version]) => {
    if (allWorkspaces[pkgName]) {
      acc[pkgName] = `file:${path.relative(allWorkspaces[workspaceName].location, allWorkspaces[pkgName].newLocation)}`;
    } else {
      acc[pkgName] = version;
    }

    return acc;
  }, {});
};

function resolvePackageJsonWithNewLocations(workspaces) {
  workspaces.forEach(name => {
    const { dependencies, devDependencies } = allWorkspaces[name].pkgJson;

    if (dependencies) allWorkspaces[name].pkgJson.dependencies = changeLocation(dependencies);

    if (!ignoreDev && devDependencies) allWorkspaces[name].pkgJson.devDependencies = changeLocation(devDependencies);

    fse.writeFileSync(allWorkspaces[name].pkgJsonLocation, JSON.stringify(allWorkspaces[name].pkgJson, null, 2));
  });
}

function createYarnLock(packages) {}

async function init() {
  const { workspacesToCopy, collectedDependenciesToInstall } = getAllRelatedWorkspaces();

  const destWorkspacesDir = createFolderForRelatedWorkspaces(workspaceName, defaultWorkspacesFolder);

  copyRelatedWorkspacesToDest(workspacesToCopy, destWorkspacesDir);

  resolvePackageJsonWithNewLocations(workspacesToCopy);

  // if (!ignoreYarnLock) createYarnLock(collectedDependenciesToInstall);
}

init();
