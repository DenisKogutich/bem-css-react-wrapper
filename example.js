'use strict';

const path = require('path');
const generateReact = require('./lib/index');

const cssSourcePath = path.resolve(__dirname, 'common.blocks');
const outputDirPath = path.resolve(__dirname, 'react-dist');

generateReact(cssSourcePath, outputDirPath);
