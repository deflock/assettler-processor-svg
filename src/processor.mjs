import nodepath from 'path';
import GenericProcessor from '@assettler/core/lib/generic-processor';
import SVGO from 'svgo';
import xml2js from 'xml2js';

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
            convertToSymbol: false,
            convertToSymbolCallback: null,
        }, options));

        this.destDir = destDir;

        this.map = {};

        this.svgOptimizer = new SVGO({
            plugins: [{
                cleanupAttrs: true,
            }, {
                removeDoctype: true,
            }, {
                removeXMLProcInst: true,
            }, {
                removeComments: true,
            }, {
                removeMetadata: true,
            }, {
                removeTitle: true,
            }, {
                removeDesc: true,
            }, {
                removeUselessDefs: true,
            }, {
                removeEditorsNSData: true,
            }, {
                removeEmptyAttrs: true,
            }, {
                removeHiddenElems: true,
            }, {
                removeEmptyText: true,
            }, {
                removeEmptyContainers: true,
            }, {
                removeViewBox: false,
            }, {
                cleanupEnableBackground: true,
            }, {
                convertStyleToAttrs: true,
            }, {
                convertColors: true,
            }, {
                convertPathData: true,
            }, {
                convertTransform: true,
            }, {
                removeUnknownsAndDefaults: true,
            }, {
                removeNonInheritableGroupAttrs: true,
            }, {
                removeUselessStrokeAndFill: true,
            }, {
                removeUnusedNS: true,
            }, {
                cleanupIDs: true,
            }, {
                cleanupNumericValues: true,
            }, {
                moveElemsAttrsToGroup: true,
            }, {
                moveGroupAttrsToElems: true,
            }, {
                collapseGroups: true,
            }, {
                removeRasterImages: false,
            }, {
                mergePaths: true,
            }, {
                convertShapeToPath: true,
            }, {
                sortAttrs: true,
            }, {
                removeDimensions: true,
            }, {
                removeAttrs: {attrs: '(stroke|fill)'},
            }],
        });
    }

    /**
     * @param {Object|Array} files
     * @param {Object} params
     * @returns {Promise<any[]>}
     */
    async process(files, params) {
        return super.process(files, params)
            .then(() => {
                return Promise.all([
                    this.writeAsJson(this.getOption('mapPaths.resourcesToAssetsJson'), this.map),
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

        if (this.getOption('convertToSymbol')) {
            const svgObj = await this.parseSvg(content);

            const symbolObj = {
                symbol: {
                    ...svgObj['svg'],
                },
            };

            const cb = this.getOption('convertToSymbolCallback');
            if (typeof cb === 'function') {
                cb(symbolObj, srcPath);
            }

            const builder = new xml2js.Builder({
                headless: true,
                renderOpts: {
                    pretty: false,
                },
            });

            content = builder.buildObject(symbolObj);
        }

        const destFilename = await this.interpolateFilename(this.getOption('filenamePattern'), {
            content,
            srcFile: srcPath,
        });
        const destPath = nodepath.resolve(this.destDir, destFilename);

        await this.writeFile(destPath, content);

        this.map[relativePath] = nodepath.relative(this.destDir, destPath);
    }

    /**
     * @param {string} content
     * @returns {Promise<*>}
     */
    async parseSvg(content) {
        const parser = new xml2js.Parser();

        return new Promise((resolve, reject) => {
            parser.parseString(content, (err, result) => {
                if (err) {
                    reject(err);
                }
                resolve(result);
            });
        });
    }
}
