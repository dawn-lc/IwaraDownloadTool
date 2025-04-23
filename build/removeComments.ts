import { type PluginBuild } from 'esbuild';
import { transformAsync } from '@babel/core';
import { promises as fs } from 'fs';
function getLoader(filePath: string) {
    if (filePath.endsWith('.ts')) return 'ts';
    if (filePath.endsWith('.tsx')) return 'tsx';
    if (filePath.endsWith('.jsx')) return 'jsx';
    return 'js';
}
const removeComments = {
    name: 'removeComments',
    setup(build: PluginBuild) {
        build.onLoad({ filter: /\.[jt]s$/ }, async (args) => {
            try {
                const source = await fs.readFile(args.path, 'utf-8');
                const result = await transformAsync(source, {
                    filename: args.path,
                    comments: false,
                    compact: false,
                    babelrc: false,
                    configFile: false,
                    presets: [
                        ['@babel/preset-typescript', { allExtensions: true }]
                    ],
                    plugins: [],
                });
                return {
                    contents: result.code,
                    loader: getLoader(args.path),
                };
            } catch (error) {
                return {
                    errors: [{
                        text: `Failed to remove comments: ${error.message}`,
                        detail: error
                    }]
                };
            }
        });
    },
};
export default removeComments;
