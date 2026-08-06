const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo (npm workspaces): o Metro precisa observar a raiz do workspace
// e priorizar o node_modules do próprio app antes do da raiz, senão resolve
// pacotes hoisted na raiz que podem estar em versão diferente da esperada
// pelo Expo SDK deste app (ex: react-native-screens).
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
