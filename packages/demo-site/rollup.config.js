import buble from 'rollup-plugin-buble';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import replace from 'rollup-plugin-replace';
import alias from 'rollup-plugin-alias';

export default {
	entry: 'src/main.js', // Start compiling from here
	dest: 'dist/app.js', // Output into one big optimized file
	format: 'iife', // Export as "iife" (instantly invoked function expression)
	plugins: [ // Ordered list of actions to perform while rolling up the code
    replace({ // Replace any checks for node environment with the string `"production"`
      'process.env.NODE_ENV': "'production'",
    }),
		alias({
			'react-redux': __dirname + '/node_modules/react-redux/es/index.js', // Map react-redux to itself so that the last react alias does not replace react-redux as well...
			'react-dom': __dirname + '/node_modules/preact-compat/src/index.js', // For `import { Component } from 'react'` do `import { Component } from 'preact-compat'`
			'react': __dirname + '/node_modules/preact-compat/src/index.js', // For `import React from 'react'` do `import React from 'preact-compat'`
		}),
		nodeResolve({ // Tell rollup to look in `node_modules` for named imports that does not begin "with a path".
			jsnext: true, // Try to import from the file specified in the modules package.json under `main:jsnext`.
      main: true, // Try to import from the file specified in the modules package.json under `main`.
			// some package.json files have a `browser` field which
      // specifies alternative files to load for people bundling
      // for the browser. If that's you, use this option, otherwise
      // pkg.browser will be ignored
      browser: true,  // Default: false
		}),
		commonjs({
			namedExports: {
        // left-hand side can be an absolute path, a path
        // relative to the current directory, or the name
        // of a module in node_modules
        'node_modules/immutable/dist/immutable.js': ['Iterable', 'Seq', 'Collection', 'Map', 'OrderedMap', 'List', 'Stack', 'Set', 'OrderedSet', 'Record', 'Range', 'Repeat', 'is', 'fromJS'], // CommonJS export fix for Immutable
      },
		}), // Let our project handle CommonJS modules ex. `module.exports =` and `require()`
    buble({ // Transpile ES6 to ES5
      jsx: 'h', // Transpile JSX with preact `h()` instead of `React.createElement()`
			objectAssign: 'Object.assign', // Allow Object.assign
    }),
	],
};
