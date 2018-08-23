'use strict';

const glob = require('glob');
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const bemNaming = require('@bem/sdk.naming.entity');
const {mainTemplate, switchPropTemplate, elemTemplate} = require('./templates');

/**
 * Преобразует имя блока к подходящему для Реакт-версии
 *
 * @param {String} name Имя блока в БЭМ-терминологии
 * @returns {String}
 */
const convertBlockName = (name) => _.upperFirst(_.camelCase(name));

/**
 * Проходит по css-файлам и собирает информацию, необходимую для дальнейшей генерации реакт-компонент
 *
 * @param {String} cssSourcePath Абсолютный путь до исходного css
 * @param {String} outputDirPath Абсолютный путь до папки с билдом
 *
 * @returns {Array<Object>}
 */
const getComponentsInfo = (cssSourcePath, outputDirPath) => {
	const blocks = fs.readdirSync(cssSourcePath);

	return blocks.reduce((infoArr, blockName) => {
		const blockDir = path.resolve(cssSourcePath, blockName);
		const preparedBlockName = convertBlockName(blockName);
		const componentPath = path.resolve(outputDirPath, preparedBlockName);
		const reactVerCssPath = path.resolve(componentPath, 'css');

		// Копируем стили в реакт-версию компонента (в /{outputDirPath}/{ReactComponentName}/css)
		fs.copySync(blockDir, reactVerCssPath);

		const componentInfo = {
			name: preparedBlockName,
			dir: componentPath
		};

		// Ищем все .post.css файлы для текущего блока
		const cssFilesPaths = glob.sync(`${componentPath}/**/*.post.css`);

		// Проходимся по файлам со стилями и вычисляем какие бывают модификаторы, элементы и тд
		cssFilesPaths.forEach((file) => {
			const fileBaseName = path.basename(file);
			const bemName = fileBaseName.replace(/\.post\.css$/, '');
			const parsedBemName = bemNaming.parse(bemName);

			if (!parsedBemName) {
				throw new Error(`File "${file}" has incorrect name: not in BEM methodology`);
			}

			const relativeCssPath = `./${path.relative(componentInfo.dir, file)}`;
			const componentCssInfo = {className: bemName, cssPath: relativeCssPath};
			const {block, elem, mod} = parsedBemName;

			if (!elem && !mod) { // Рассматривается файл самого блока, без модификаторов и прочего
				Object.assign(componentInfo, componentCssInfo);
			} else if (!elem) { // Рассматривается модификатор блока
				_.set(componentInfo, `props.${mod.name}.${mod.val}`, componentCssInfo);
			} else if (mod) { // Рассматривается элемент с модификатором
				_.set(componentInfo, `children.${elem}.props.${mod.name}.${mod.val}`, componentCssInfo);

				// Возможен случай, когда у элемента нет файла со стилями (только у модификаторов),
				// проставим на такой случай name и className
				if (!_.get(componentInfo, `children.${elem}.name`)) {
					_.set(componentInfo, `children.${elem}.name`, convertBlockName(elem));
				}
				if (!_.get(componentInfo, `children.${elem}.className`)) {
					_.set(componentInfo, `children.${elem}.className`, `${block}__${elem}`);
				}
			} else { // Рассматривается элемент без модификатора
				const existingObj = _.get(componentInfo, `children.${elem}`, {});
				_.set(componentInfo, `children.${elem}`, {
					...existingObj,
					...componentCssInfo,
					name: convertBlockName(elem)
				});
			}
		});

		// Возможна ситуация, когда для блока нет стилей, а есть например только для его элементов
		// В любом случае необходимо проставить ему className, вдруг на него будут ссылаться другие блоки в стилях
		if (!componentInfo.className) {
			componentInfo.className = blockName;
		}

		return [...infoArr, componentInfo];
	}, []);
};

/**
 * Производит генерацию React-компонента
 *
 * @param {Object} componentInfo Объект с данными о компоненте (какие есть модификаторы, где лежат стили и тд)
 */
const generateReactComponent = (componentInfo) => {
	const modsPart = generateModsPart(componentInfo.props);
	const elemPart = generateElemPart(componentInfo.children, componentInfo.name);
	const reactVersion = mainTemplate(
		componentInfo.name,
		componentInfo.className,
		componentInfo.cssPath,
		modsPart,
		elemPart
	);
	const indexJsPath = path.resolve(componentInfo.dir, 'index.js');
	fs.writeFileSync(indexJsPath, reactVersion);
};

/**
 * Производит генерацию части компонента, отвечающей за модификаторы
 *
 * @param {Object} propsInfo Объект с данными о свойствах
 *
 * @returns {String}
 */
const generateModsPart = (propsInfo) => {
	if (!propsInfo) {
		return '';
	}

	return Object.keys(propsInfo).reduce((generatedModsPart, propName) => {
		const propInfo = propsInfo[propName];
		return `${generatedModsPart}\n${switchPropTemplate(propInfo, propName)}`;
	}, '');
};

/**
 * Производит генерацию части компонента, отвечающей за элементы
 *
 * @param {Object} elemsInfo Объект с данными об элементах
 * @param {String} ownerName Название блока-хозяина элемента
 *
 * @return {string}
 */
const generateElemPart = (elemsInfo, ownerName) => {
	if (!elemsInfo) {
		return '';
	}

	return Object.keys(elemsInfo).reduce((generatedElemPart, elemName) => {
		const elemInfo = elemsInfo[elemName];
		const modsPart = generateModsPart(elemInfo.props);
		const {name, className, cssPath} = elemInfo;
		return `${generatedElemPart}\n${elemTemplate(ownerName, name, className, cssPath, modsPart)}\n`;
	}, '');
};

/**
 * Производит генерацию реакт-версий по заданным БЭМ-стилям
 *
 * @param {String} cssSourcePath Абсолютный путь до исходного css
 * @param {String} outputDirPath Абсолютный путь до папки с билдом
 */
const generateReactComponents = (cssSourcePath, outputDirPath) => {
	fs.removeSync(outputDirPath);
	fs.mkdirSync(outputDirPath);
	getComponentsInfo(cssSourcePath, outputDirPath).forEach(generateReactComponent);
};

module.exports = generateReactComponents;
