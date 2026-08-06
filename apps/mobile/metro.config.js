const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo (npm workspaces): o Metro precisa observar a raiz do workspace
// pra enxergar pacotes irmãos (ex: @cacambaflow/types) e considerar o
// node_modules da raiz na resolução. Estende os defaults do Expo em vez
// de substituí-los — sobrescrever "watchFolders"/"nodeModulesPaths" com
// uma lista fechada já quebrou um build (expo-status-bar deixou de
// resolver, expo-doctor reclama que faltam entradas dos defaults).
config.watchFolders = Array.from(new Set([...(config.watchFolders || []), workspaceRoot]));
config.resolver.nodeModulesPaths = Array.from(
  new Set([
    ...(config.resolver.nodeModulesPaths || []),
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ])
);

module.exports = config;
