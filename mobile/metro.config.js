const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch both the mobile project and workspace root
config.watchFolders = [workspaceRoot];

// Prioritize mobile's own node_modules over workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Prevent Metro from resolving ESM builds (which use import.meta) of packages
// like @supabase/supabase-js. Use the CommonJS fallback instead.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
