'use strict';

/* eslint-disable indent */
/* eslint-disable max-len */

/**
 * Основной шаблон компонента
 *
 * @param {String} componentName Имя компонента
 * @param {String} componentClassName Название класса, соответствующего компоненту
 * @param {String} [componentsCssPath] Относительный путь до стилей компонента
 * @param {String} [modsPart] Часть, относящаяся к модификаторам компонента
 * @param {String} [elemsPart] Часть, относящаяся к элементам компонента
 *
 * @returns {String}
 */
exports.mainTemplate = (componentName, componentClassName, componentsCssPath, modsPart = '', elemsPart = '') =>
`import React from 'react';
${componentsCssPath ? `import '${componentsCssPath}';\n` : ''}
/**
 * Компонент ${componentName}
 * @param {Object} props Свойства компонента
 * @returns {React.ComponentType<*>}
 */
const ${componentName} = (props) => {
	${modsPart ? 'let' : 'const'} className = props.className ? \`${componentClassName} \${props.className}\` : '${componentClassName}';
${modsPart}
	return (
		<div className={className}>
			{props.children}
		</div>
	);
};
${elemsPart}
export default ${componentName};
`;

/**
 * Шаблон switch по пропсу компонента, используется для генерации кода для модификаторов
 *
 * @param {Object} propInfo Объект с данными текущего пропса (какие значения у него бывают и какие стили подтянуть)
 * @param {String} propName Название свойства
 *
 * @returns {String}
 */
exports.switchPropTemplate = (propInfo, propName) =>
`	switch (props['${propName}']) {${
			Object.keys(propInfo).reduce((casePart, propVal) => {
				const propValInfo = propInfo[propVal];
				return `${casePart}\n\t\tcase '${propVal}': {\n\t\t\timport '${propValInfo.cssPath}';\n\t\t\tclassName += ' ${propValInfo.className}';\n\t\t\tbreak;\n\t\t}`;
			}, '')
		}
		default: break;
	}
`;

/**
 * Шаблон для элемента
 *
 * @param {String} ownerName Название блока-хозяина элемента
 * @param {String} elemName Имя элемента
 * @param {String} elemClassName Класс, соответствующий элементу
 * @param {String} elemCssPath Относительный путь до стилей элемента
 * @param {String} [modsPart] Часть, относящаяся к модификаторам элемента
 *
 * @return {String}
 */
exports.elemTemplate = (ownerName, elemName, elemClassName, elemCssPath, modsPart) =>
`${ownerName}.${elemName} = (props) => {${elemCssPath ? `\n\timport '${elemCssPath}';\n` : ''}
	${modsPart ? 'let' : 'const'} className = props.className ? \`${elemClassName} \${props.className}\` : '${elemClassName}';
${modsPart}
	return (
		<div className={className}>
			{props.children}
		</div>
	);
};`;
