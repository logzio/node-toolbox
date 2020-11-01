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
} from './params';

function getAllRelatedWorkspaces() {
  const workspacesToCopy = [];

  const collectedDependenciesToInstall = [];

  const recursive = name => {
    const {
      pkgJson: { dependencies, devDependencies },
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

function createFolderForRelatedWorkspaces(workspace, defaultDir) {
  const currentWorkspaceLocation = path.join(rootDir, allWorkspaces[workspace].location);
  const destWorkspacesDir = `${currentWorkspaceLocation}/${defaultDir}`;

  fs.rmdirSync(destWorkspacesDir, { recursive: true });
  fs.mkdirSync(destWorkspacesDir, { recursive: true });

  return destWorkspacesDir;
}

function copyRelatedWorkspacesToDest(workspaces, destinationFolder) {
  Object.entries(workspaces).forEach(([name, location]) => {
    workspaces[name] = path.join(destinationFolder, name);

    fse.copySync(location, workspaces[name], { filter: src => !src.includes('node_modules') });
  });
}

const changeLocation = (list, mainWorkspaceFolder, dependencyFolder, workspaces) => {
  if (list) {
    return Object.entries(list).reduce((acc, [pkgName, version]) => {
      if (workspaces[pkgName]) {
        acc[pkgName] = `file:${path.relative(mainWorkspaceFolder, path.join(dependencyFolder, pkgName))}`;
      } else {
        acc[pkgName] = version;
      }

      return acc;
    }, {});
  }

  return {};
};

function resolvePackageJsonWithNewLocations(workspaces, destinationFolder, ignoreDev) {
  Object.entries(workspaces).forEach(([, location]) => {
    const workspacesPackageJsonLocation = path.join(location, 'package.json');

    const workspaceJson = require(workspacesPackageJsonLocation);

    if (workspaceJson.dependencies)
      workspaceJson.dependencies = changeLocation(workspaceJson.dependencies, location, destinationFolder, workspaces);

    if (!ignoreDev && workspaceJson.devDependencies)
      workspaceJson.devDependencies = changeLocation(workspaceJson.devDependencies, location, destinationFolder, workspaces);

    fse.writeFileSync(workspacesPackageJsonLocation, JSON.stringify(workspaceJson, null, 2));
  });
}

async function init() {
  const relatedWorkspaces = getAllRelatedWorkspaces();

  const destWorkspacesDir = createFolderForRelatedWorkspaces(workspaceName, defaultWorkspacesFolder);

  copyRelatedWorkspacesToDest(relatedWorkspaces, destWorkspacesDir);
  relatedWorkspaces[workspaceName] = path.join(rootDir, allWorkspaces[workspaceName].location);

  resolvePackageJsonWithNewLocations(relatedWorkspaces, destWorkspacesDir);
}

export const validateWorkspace = {
  getAllRelatedWorkspaces,
};
