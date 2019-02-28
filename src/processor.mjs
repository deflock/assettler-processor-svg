import nodepath from 'path';
import GenericProcessor from '@assettler/core/lib/generic-processor';
import SVGO from 'svgo';

/**
 *
 */
export default class Processor extends GenericProcessor {
    /**
     * @param {string} destDir
     * @param {Object} options
     */
    constructor(destDir, options = {}) {
        super(Object.assign({
            extensions: ['.svg'],
            filenamePattern: '[contentHash:12].[ext]',
            optimize: false,
            wrapInSymbol: false,
        }, options));

        this.destDir = destDir;

        this.map = {};

        this.svgOptimizer = new SVGO();
    }

    /**
     * @param {Object|Array} files
     * @param {Object} params
     * @returns {Promise<any[]>}
     */
    async process(files, params) {
        return super.process(files, params)
            .then(() => {
                const hashedMap = {};

                for (const asset of Object.keys(this.map)) {
                    hashedMap[this.map[asset]] = this.map[asset];
                }

                return Promise.all([
                    this.writeAsJson(this.getOption('mapPaths.resourcesToAssetsJson'), this.map),
                    this.writeAsJson(this.getOption('mapPaths.hashedAssetsJson'), hashedMap),
                ]);
            });
    }

    /**
     * @param {Object} file
     * @param {Object} params
     * @returns {Promise<void>}
     */
    async onInit(file, params) {
        return this.doTrack(file, params);
    }

    /**
     * @param {Object} file
     * @param {Object} params
     * @returns {Promise<void>}
     */
    async onAdd(file, params) {
        return this.doTrack(file, params);
    }

    /**
     * @param {Object} file
     * @param {Object} params
     * @returns {Promise<void>}
     */
    async onChange(file, params) {
        return this.doTrack(file, params);
    }

    /**
     * @param {Object} file
     * @param {Object} params
     * @returns {Promise<void>}
     */
    async doTrack(file, params) {
        const relativePath = file.path;
        const basedir = params.basedir || params.cwd;

        const srcPath = nodepath.resolve(basedir, relativePath);

        let content = await this.readFile(srcPath);

        if (this.getOption('optimize')) {
            const r = await this.svgOptimizer.optimize(content);
            content = r.data;
        }

        if (this.getOption('wrapInSymbol')) {
            content = `<symbol>${content}</symbol>`;
        }

        const destFilename = await this.interpolateFilename(this.getOption('filenamePattern'), {
            content,
            srcFile: srcPath,
        });
        const destPath = nodepath.resolve(this.destDir, destFilename);

        await this.writeFile(destPath, content);

        this.map[relativePath] = nodepath.relative(this.destDir, destPath);
    }
}
