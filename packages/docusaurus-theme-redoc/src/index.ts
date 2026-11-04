import path from 'path';
import { createRequire } from 'module';
import type { LoadContext, Plugin } from '@docusaurus/types';
import type { ThemeOptions, GlobalData } from './types/options';
import { getGlobalData } from './redocData';

// eslint-disable-next-line import/no-extraneous-dependencies, import/order

export type { ThemeOptions, GlobalData };

/**
 * Where Redoc 3 is, and the `node_modules` folder that holds the `react-router`
 * it should use.
 *
 * Docusaurus's webpack config makes `@docusaurus/core`'s own `node_modules` win
 * for every import in the bundle, and core has its own `react-router` 5. Without
 * help, Redoc's `import 'react-router'` gets version 5 (no `BrowserRouter`,
 * `Link`, `useNavigate`...), whatever is installed next to Redoc. So resolve it
 * the way Node does from Redoc's own location, and use that for Redoc's files only.
 */
function findRedocRouter():
  | { redocDir: string; modulesDir: string }
  | undefined {
  try {
    const redocPackage = require.resolve('redoc/package.json');
    const routerPackage = createRequire(redocPackage).resolve(
      'react-router/package.json',
    );
    return {
      redocDir: path.dirname(redocPackage),
      modulesDir: path.dirname(path.dirname(routerPackage)),
    };
  } catch {
    return undefined;
  }
}

export default function redocTheme(
  context: LoadContext,
  options: ThemeOptions,
): Plugin<null> {
  return {
    name: 'docusaurus-theme-redoc',
    configureWebpack(_config, _isServer, { currentBundler }) {
      const bundler = currentBundler.instance ?? require('webpack');
      const redocRouter = findRedocRouter();
      return {
        module: {
          rules: redocRouter
            ? [
                {
                  // Only Redoc's own files: Docusaurus keeps its react-router 5
                  include: [redocRouter.redocDir],
                  resolve: {
                    modules: [redocRouter.modulesDir, 'node_modules'],
                  },
                },
              ]
            : [],
        },
        plugins: [
          new bundler.ProvidePlugin({
            Prism: ['prismjs'],
          }),
          new bundler.NormalModuleReplacementPlugin(
            /^tty$/,
            require.resolve('./tty'),
          ),
          new bundler.DefinePlugin({
            'process.versions.node': JSON.stringify(
              process.versions.node || '0.0.0',
            ),
            'process.platform': JSON.stringify(''),
            // IMPORTANT: To fix debug library‘s bug #236
            // {}.DEBUG = namespaces; // SyntaxError: Unexpected token '.'
            'process.env.DEBUG': JSON.stringify(process.env.DEBUG),
            'process.env': JSON.stringify({}),
          }),
        ],
      };
    },
    async contentLoaded({ actions }) {
      const { setGlobalData } = actions;
      const globalData = await getGlobalData(options);

      setGlobalData(globalData);
    },
    getThemePath() {
      return path.join(__dirname, '..', 'dist-jsx', 'theme');
    },
    getTypeScriptThemePath() {
      return path.join(__dirname, '..', 'src', 'theme');
    },
    getClientModules() {
      return [
        path.join(__dirname, 'custom.css'),
        path.join(__dirname, 'global.js'),
      ];
    },
  };
}

const getSwizzleComponentList = (): string[] => {
  return ['Redoc', 'ApiDoc'];
};

export { getSwizzleComponentList };
