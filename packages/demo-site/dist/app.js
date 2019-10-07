(function () {
'use strict';

/** Virtual DOM Node */
function VNode(nodeName, attributes, children) {
	/** @type {string|function} */
	this.nodeName = nodeName;

	/** @type {object<string>|undefined} */
	this.attributes = attributes;

	/** @type {array<VNode>|undefined} */
	this.children = children;

	/** Reference to the given key. */
	this.key = attributes && attributes.key;
}

/** Global options
 *	@public
 *	@namespace options {Object}
 */
var options = {

	/** If `true`, `prop` changes trigger synchronous component updates.
	 *	@name syncComponentUpdates
	 *	@type Boolean
	 *	@default true
	 */
	//syncComponentUpdates: true,

	/** Processes all created VNodes.
	 *	@param {VNode} vnode	A newly-created VNode to normalize/process
	 */
	//vnode(vnode) { }

	/** Hook invoked after a component is mounted. */
	// afterMount(component) { }

	/** Hook invoked after the DOM is updated with a component's latest render. */
	// afterUpdate(component) { }

	/** Hook invoked immediately before a component is unmounted. */
	// beforeUnmount(component) { }
};

var stack = [];


/** JSX/hyperscript reviver
*	Benchmarks: https://esbench.com/bench/57ee8f8e330ab09900a1a1a0
 *	@see http://jasonformat.com/wtf-is-jsx
 *	@public
 *  @example
 *  /** @jsx h *\/
 *  import { render, h } from 'preact';
 *  render(<span>foo</span>, document.body);
 */
function h$1(nodeName, attributes) {
	var arguments$1 = arguments;

	var children = [],
		lastSimple, child, simple, i;
	for (i=arguments.length; i-- > 2; ) {
		stack.push(arguments$1[i]);
	}
	if (attributes && attributes.children) {
		if (!stack.length) { stack.push(attributes.children); }
		delete attributes.children;
	}
	while (stack.length) {
		if ((child = stack.pop()) instanceof Array) {
			for (i=child.length; i--; ) { stack.push(child[i]); }
		}
		else if (child!=null && child!==false) {
			if (typeof child=='number' || child===true) { child = String(child); }
			simple = typeof child=='string';
			if (simple && lastSimple) {
				children[children.length-1] += child;
			}
			else {
				children.push(child);
				lastSimple = simple;
			}
		}
	}

	var p = new VNode(nodeName, attributes || undefined, children);

	// if a "vnode hook" is defined, pass every created VNode to it
	if (options.vnode) { options.vnode(p); }

	return p;
}

/** Copy own-properties from `props` onto `obj`.
 *	@returns obj
 *	@private
 */
function extend(obj, props) {
	if (props) {
		for (var i in props) { obj[i] = props[i]; }
	}
	return obj;
}


/** Fast clone. Note: does not filter out non-own properties.
 *	@see https://esbench.com/bench/56baa34f45df6895002e03b6
 */
function clone(obj) {
	return extend({}, obj);
}


/** Get a deep property value from the given object, expressed in dot-notation.
 *	@private
 */
function delve(obj, key) {
	for (var p=key.split('.'), i=0; i<p.length && obj; i++) {
		obj = obj[p[i]];
	}
	return obj;
}


/** @private is the given object a Function? */
function isFunction(obj) {
	return 'function'===typeof obj;
}


/** @private is the given object a String? */
function isString(obj) {
	return 'string'===typeof obj;
}


/** Convert a hashmap of CSS classes to a space-delimited className string
 *	@private
 */
function hashToClassName(c) {
	var str = '';
	for (var prop in c) {
		if (c[prop]) {
			if (str) { str += ' '; }
			str += prop;
		}
	}
	return str;
}


/** Just a memoized String#toLowerCase */
var lcCache = {};
var toLowerCase = function (s) { return lcCache[s] || (lcCache[s] = s.toLowerCase()); };


/** Call a function asynchronously, as soon as possible.
 *	@param {Function} callback
 */
var resolved = typeof Promise!=='undefined' && Promise.resolve();
var defer = resolved ? (function (f) { resolved.then(f); }) : setTimeout;

function cloneElement(vnode, props) {
	return h$1(
		vnode.nodeName,
		extend(clone(vnode.attributes), props),
		arguments.length>2 ? [].slice.call(arguments, 2) : vnode.children
	);
}

// render modes

var NO_RENDER = 0;
var SYNC_RENDER = 1;
var FORCE_RENDER = 2;
var ASYNC_RENDER = 3;

var EMPTY = {};

var ATTR_KEY = typeof Symbol!=='undefined' ? Symbol.for('preactattr') : '__preactattr_';

// DOM properties that should NOT have "px" added when numeric
var NON_DIMENSION_PROPS = {
	boxFlex:1, boxFlexGroup:1, columnCount:1, fillOpacity:1, flex:1, flexGrow:1,
	flexPositive:1, flexShrink:1, flexNegative:1, fontWeight:1, lineClamp:1, lineHeight:1,
	opacity:1, order:1, orphans:1, strokeOpacity:1, widows:1, zIndex:1, zoom:1
};

// DOM event types that do not bubble and should be attached via useCapture
var NON_BUBBLING_EVENTS = { blur:1, error:1, focus:1, load:1, resize:1, scroll:1 };

/** Create an Event handler function that sets a given state property.
 *	@param {Component} component	The component whose state should be updated
 *	@param {string} key				A dot-notated key path to update in the component's state
 *	@param {string} eventPath		A dot-notated key path to the value that should be retrieved from the Event or component
 *	@returns {function} linkedStateHandler
 *	@private
 */
function createLinkedState(component, key, eventPath) {
	var path = key.split('.');
	return function(e) {
		var t = e && e.target || this,
			state = {},
			obj = state,
			v = isString(eventPath) ? delve(e, eventPath) : t.nodeName ? (t.type.match(/^che|rad/) ? t.checked : t.value) : e,
			i = 0;
		for ( ; i<path.length-1; i++) {
			obj = obj[path[i]] || (obj[path[i]] = !i && component.state[path[i]] || {});
		}
		obj[path[i]] = v;
		component.setState(state);
	};
}

/** Managed queue of dirty components to be re-rendered */

// items/itemsOffline swap on each rerender() call (just a simple pool technique)
var items = [];

function enqueueRender(component) {
	if (!component._dirty && (component._dirty = true) && items.push(component)==1) {
		(options.debounceRendering || defer)(rerender);
	}
}


function rerender() {
	var p, list = items;
	items = [];
	while ( (p = list.pop()) ) {
		if (p._dirty) { renderComponent(p); }
	}
}

/** Check if a VNode is a reference to a stateless functional component.
 *	A function component is represented as a VNode whose `nodeName` property is a reference to a function.
 *	If that function is not a Component (ie, has no `.render()` method on a prototype), it is considered a stateless functional component.
 *	@param {VNode} vnode	A VNode
 *	@private
 */
function isFunctionalComponent(vnode) {
	var nodeName = vnode && vnode.nodeName;
	return nodeName && isFunction(nodeName) && !(nodeName.prototype && nodeName.prototype.render);
}



/** Construct a resultant VNode from a VNode referencing a stateless functional component.
 *	@param {VNode} vnode	A VNode with a `nodeName` property that is a reference to a function.
 *	@private
 */
function buildFunctionalComponent(vnode, context) {
	return vnode.nodeName(getNodeProps(vnode), context || EMPTY);
}

/** Check if two nodes are equivalent.
 *	@param {Element} node
 *	@param {VNode} vnode
 *	@private
 */
function isSameNodeType(node, vnode) {
	if (isString(vnode)) {
		return node instanceof Text;
	}
	if (isString(vnode.nodeName)) {
		return isNamedNode(node, vnode.nodeName);
	}
	if (isFunction(vnode.nodeName)) {
		return node._componentConstructor===vnode.nodeName || isFunctionalComponent(vnode);
	}
}


function isNamedNode(node, nodeName) {
	return node.normalizedNodeName===nodeName || toLowerCase(node.nodeName)===toLowerCase(nodeName);
}


/**
 * Reconstruct Component-style `props` from a VNode.
 * Ensures default/fallback values from `defaultProps`:
 * Own-properties of `defaultProps` not present in `vnode.attributes` are added.
 * @param {VNode} vnode
 * @returns {Object} props
 */
function getNodeProps(vnode) {
	var props = clone(vnode.attributes);
	props.children = vnode.children;

	var defaultProps = vnode.nodeName.defaultProps;
	if (defaultProps) {
		for (var i in defaultProps) {
			if (props[i]===undefined) {
				props[i] = defaultProps[i];
			}
		}
	}

	return props;
}

/** Removes a given DOM Node from its parent. */
function removeNode(node) {
	var p = node.parentNode;
	if (p) { p.removeChild(node); }
}


/** Set a named attribute on the given Node, with special behavior for some names and event handlers.
 *	If `value` is `null`, the attribute/handler will be removed.
 *	@param {Element} node	An element to mutate
 *	@param {string} name	The name/key to set, such as an event or attribute name
 *	@param {any} value		An attribute value, such as a function to be used as an event handler
 *	@param {any} previousValue	The last value that was set for this name/node pair
 *	@private
 */
function setAccessor(node, name, old, value, isSvg) {

	if (name==='className') { name = 'class'; }

	if (name==='class' && value && typeof value==='object') {
		value = hashToClassName(value);
	}

	if (name==='key') {
		// ignore
	}
	else if (name==='class' && !isSvg) {
		node.className = value || '';
	}
	else if (name==='style') {
		if (!value || isString(value) || isString(old)) {
			node.style.cssText = value || '';
		}
		if (value && typeof value==='object') {
			if (!isString(old)) {
				for (var i in old) { if (!(i in value)) { node.style[i] = ''; } }
			}
			for (var i$1 in value) {
				node.style[i$1] = typeof value[i$1]==='number' && !NON_DIMENSION_PROPS[i$1] ? (value[i$1]+'px') : value[i$1];
			}
		}
	}
	else if (name==='dangerouslySetInnerHTML') {
		if (value) { node.innerHTML = value.__html; }
	}
	else if (name[0]=='o' && name[1]=='n') {
		var l = node._listeners || (node._listeners = {});
		name = toLowerCase(name.substring(2));
		// @TODO: this might be worth it later, un-breaks focus/blur bubbling in IE9:
		// if (node.attachEvent) name = name=='focus'?'focusin':name=='blur'?'focusout':name;
		if (value) {
			if (!l[name]) { node.addEventListener(name, eventProxy, !!NON_BUBBLING_EVENTS[name]); }
		}
		else if (l[name]) {
			node.removeEventListener(name, eventProxy, !!NON_BUBBLING_EVENTS[name]);
		}
		l[name] = value;
	}
	else if (name!=='list' && name!=='type' && !isSvg && name in node) {
		setProperty(node, name, value==null ? '' : value);
		if (value==null || value===false) { node.removeAttribute(name); }
	}
	else {
		var ns = isSvg && name.match(/^xlink\:?(.+)/);
		if (value==null || value===false) {
			if (ns) { node.removeAttributeNS('http://www.w3.org/1999/xlink', toLowerCase(ns[1])); }
			else { node.removeAttribute(name); }
		}
		else if (typeof value!=='object' && !isFunction(value)) {
			if (ns) { node.setAttributeNS('http://www.w3.org/1999/xlink', toLowerCase(ns[1]), value); }
			else { node.setAttribute(name, value); }
		}
	}
}


/** Attempt to set a DOM property to the given value.
 *	IE & FF throw for certain property-value combinations.
 */
function setProperty(node, name, value) {
	try {
		node[name] = value;
	} catch (e) { }
}


/** Proxy an event to hooked event handlers
 *	@private
 */
function eventProxy(e) {
	return this._listeners[e.type](options.event && options.event(e) || e);
}

/** DOM node pool, keyed on nodeName. */

var nodes = {};

function collectNode(node) {
	removeNode(node);

	if (node instanceof Element) {
		node._component = node._componentConstructor = null;

		var name = node.normalizedNodeName || toLowerCase(node.nodeName);
		(nodes[name] || (nodes[name] = [])).push(node);
	}
}


function createNode(nodeName, isSvg) {
	var name = toLowerCase(nodeName),
		node = nodes[name] && nodes[name].pop() || (isSvg ? document.createElementNS('http://www.w3.org/2000/svg', nodeName) : document.createElement(nodeName));
	node.normalizedNodeName = name;
	return node;
}

/** Diff recursion count, used to track the end of the diff cycle. */
var mounts = [];

/** Diff recursion count, used to track the end of the diff cycle. */
var diffLevel = 0;

var isSvgMode = false;


function flushMounts() {
	var c;
	while ((c=mounts.pop())) {
		if (options.afterMount) { options.afterMount(c); }
		if (c.componentDidMount) { c.componentDidMount(); }
	}
}


/** Apply differences in a given vnode (and it's deep children) to a real DOM Node.
 *	@param {Element} [dom=null]		A DOM node to mutate into the shape of the `vnode`
 *	@param {VNode} vnode			A VNode (with descendants forming a tree) representing the desired DOM structure
 *	@returns {Element} dom			The created/mutated element
 *	@private
 */
function diff(dom, vnode, context, mountAll, parent, componentRoot) {
	if (!diffLevel++) { isSvgMode = parent instanceof SVGElement; }
	var ret = idiff(dom, vnode, context, mountAll);
	if (parent && ret.parentNode!==parent) { parent.appendChild(ret); }
	if (!--diffLevel && !componentRoot) { flushMounts(); }
	return ret;
}


function idiff(dom, vnode, context, mountAll) {
	var originalAttributes = vnode && vnode.attributes;

	while (isFunctionalComponent(vnode)) {
		vnode = buildFunctionalComponent(vnode, context);
	}

	if (vnode==null) { vnode = ''; }

	if (isString(vnode)) {
		if (dom) {
			if (dom instanceof Text && dom.parentNode) {
				if (dom.nodeValue!=vnode) {
					dom.nodeValue = vnode;
				}
				return dom;
			}
			recollectNodeTree(dom);
		}
		return document.createTextNode(vnode);
	}

	if (isFunction(vnode.nodeName)) {
		return buildComponentFromVNode(dom, vnode, context, mountAll);
	}

	var out = dom,
		nodeName = vnode.nodeName,
		prevSvgMode = isSvgMode,
		vchildren = vnode.children;

	if (!isString(nodeName)) {
		nodeName = String(nodeName);
	}

	isSvgMode = nodeName==='svg' ? true : nodeName==='foreignObject' ? false : isSvgMode;

	if (!dom) {
		out = createNode(nodeName, isSvgMode);
	}
	else if (!isNamedNode(dom, nodeName)) {
		out = createNode(nodeName, isSvgMode);
		// move children into the replacement node
		while (dom.firstChild) { out.appendChild(dom.firstChild); }
		// reclaim element nodes
		recollectNodeTree(dom);
	}

	// fast-path for elements containing a single TextNode:
	if (vchildren && vchildren.length===1 && typeof vchildren[0]==='string' && out.childNodes.length===1 && out.firstChild instanceof Text) {
		if (out.firstChild.nodeValue!=vchildren[0]) {
			out.firstChild.nodeValue = vchildren[0];
		}
	}
	else if (vchildren && vchildren.length || out.firstChild) {
		innerDiffNode(out, vchildren, context, mountAll);
	}

	var props = out[ATTR_KEY];
	if (!props) {
		out[ATTR_KEY] = props = {};
		for (var a=out.attributes, i=a.length; i--; ) { props[a[i].name] = a[i].value; }
	}

	diffAttributes(out, vnode.attributes, props);

	if (originalAttributes && typeof originalAttributes.ref==='function') {
		(props.ref = originalAttributes.ref)(out);
	}

	isSvgMode = prevSvgMode;

	return out;
}


/** Apply child and attribute changes between a VNode and a DOM Node to the DOM. */
function innerDiffNode(dom, vchildren, context, mountAll) {
	var originalChildren = dom.childNodes,
		children = [],
		keyed = {},
		keyedLen = 0,
		min = 0,
		len = originalChildren.length,
		childrenLen = 0,
		vlen = vchildren && vchildren.length,
		j, c, vchild, child;

	if (len) {
		for (var i=0; i<len; i++) {
			var child$1 = originalChildren[i],
				key = vlen ? ((c = child$1._component) ? c.__key : (c = child$1[ATTR_KEY]) ? c.key : null) : null;
			if (key || key===0) {
				keyedLen++;
				keyed[key] = child$1;
			}
			else {
				children[childrenLen++] = child$1;
			}
		}
	}

	if (vlen) {
		for (var i$1=0; i$1<vlen; i$1++) {
			vchild = vchildren[i$1];
			child = null;

			// if (isFunctionalComponent(vchild)) {
			// 	vchild = buildFunctionalComponent(vchild);
			// }

			// attempt to find a node based on key matching
			var key$1 = vchild.key;
			if (key$1!=null) {
				if (keyedLen && key$1 in keyed) {
					child = keyed[key$1];
					keyed[key$1] = undefined;
					keyedLen--;
				}
			}
			// attempt to pluck a node of the same type from the existing children
			else if (!child && min<childrenLen) {
				for (j=min; j<childrenLen; j++) {
					c = children[j];
					if (c && isSameNodeType(c, vchild)) {
						child = c;
						children[j] = undefined;
						if (j===childrenLen-1) { childrenLen--; }
						if (j===min) { min++; }
						break;
					}
				}
				if (!child && min<childrenLen && isFunction(vchild.nodeName) && mountAll) {
					child = children[min];
					children[min++] = undefined;
				}
			}

			// morph the matched/found/created DOM child to match vchild (deep)
			child = idiff(child, vchild, context, mountAll);

			if (child && child!==dom && child!==originalChildren[i$1]) {
				dom.insertBefore(child, originalChildren[i$1] || null);
			}
		}
	}


	if (keyedLen) {
		for (var i$2 in keyed) { if (keyed[i$2]) { recollectNodeTree(keyed[i$2]); } }
	}

	// remove orphaned children
	if (min<childrenLen) {
		removeOrphanedChildren(children);
	}
}


/** Reclaim children that were unreferenced in the desired VTree */
function removeOrphanedChildren(children, unmountOnly) {
	for (var i=children.length; i--; ) {
		if (children[i]) {
			recollectNodeTree(children[i], unmountOnly);
		}
	}
}


/** Reclaim an entire tree of nodes, starting at the root. */
function recollectNodeTree(node, unmountOnly) {
	// @TODO: Need to make a call on whether Preact should remove nodes not created by itself.
	// Currently it *does* remove them. Discussion: https://github.com/developit/preact/issues/39
	//if (!node[ATTR_KEY]) return;

	var component = node._component;
	if (component) {
		unmountComponent(component, !unmountOnly);
	}
	else {
		if (node[ATTR_KEY] && node[ATTR_KEY].ref) { node[ATTR_KEY].ref(null); }

		if (!unmountOnly) {
			collectNode(node);
		}

		if (node.childNodes && node.childNodes.length) {
			removeOrphanedChildren(node.childNodes, unmountOnly);
		}
	}
}


/** Apply differences in attributes from a VNode to the given DOM Node. */
function diffAttributes(dom, attrs, old) {
	for (var name in old) {
		if (!(attrs && name in attrs) && old[name]!=null) {
			setAccessor(dom, name, old[name], old[name] = undefined, isSvgMode);
		}
	}

	// new & updated
	if (attrs) {
		for (var name$1 in attrs) {
			if (name$1!=='children' && name$1!=='innerHTML' && (!(name$1 in old) || attrs[name$1]!==(name$1==='value' || name$1==='checked' ? dom[name$1] : old[name$1]))) {
				setAccessor(dom, name$1, old[name$1], old[name$1] = attrs[name$1], isSvgMode);
			}
		}
	}
}

/** Retains a pool of Components for re-use, keyed on component name.
 *	Note: since component names are not unique or even necessarily available, these are primarily a form of sharding.
 *	@private
 */
var components = {};


function collectComponent(component) {
	var name = component.constructor.name,
		list = components[name];
	if (list) { list.push(component); }
	else { components[name] = [component]; }
}


function createComponent(Ctor, props, context) {
	var inst = new Ctor(props, context),
		list = components[Ctor.name];
	Component.call(inst, props, context);
	if (list) {
		for (var i=list.length; i--; ) {
			if (list[i].constructor===Ctor) {
				inst.nextBase = list[i].nextBase;
				list.splice(i, 1);
				break;
			}
		}
	}
	return inst;
}

/** Set a component's `props` (generally derived from JSX attributes).
 *	@param {Object} props
 *	@param {Object} [opts]
 *	@param {boolean} [opts.renderSync=false]	If `true` and {@link options.syncComponentUpdates} is `true`, triggers synchronous rendering.
 *	@param {boolean} [opts.render=true]			If `false`, no render will be triggered.
 */
function setComponentProps(component, props, opts, context, mountAll) {
	if (component._disable) { return; }
	component._disable = true;

	if ((component.__ref = props.ref)) { delete props.ref; }
	if ((component.__key = props.key)) { delete props.key; }

	if (!component.base || mountAll) {
		if (component.componentWillMount) { component.componentWillMount(); }
	}
	else if (component.componentWillReceiveProps) {
		component.componentWillReceiveProps(props, context);
	}

	if (context && context!==component.context) {
		if (!component.prevContext) { component.prevContext = component.context; }
		component.context = context;
	}

	if (!component.prevProps) { component.prevProps = component.props; }
	component.props = props;

	component._disable = false;

	if (opts!==NO_RENDER) {
		if (opts===SYNC_RENDER || options.syncComponentUpdates!==false || !component.base) {
			renderComponent(component, SYNC_RENDER, mountAll);
		}
		else {
			enqueueRender(component);
		}
	}

	if (component.__ref) { component.__ref(component); }
}



/** Render a Component, triggering necessary lifecycle events and taking High-Order Components into account.
 *	@param {Component} component
 *	@param {Object} [opts]
 *	@param {boolean} [opts.build=false]		If `true`, component will build and store a DOM node if not already associated with one.
 *	@private
 */
function renderComponent(component, opts, mountAll, isChild) {
	if (component._disable) { return; }

	var skip, rendered,
		props = component.props,
		state = component.state,
		context = component.context,
		previousProps = component.prevProps || props,
		previousState = component.prevState || state,
		previousContext = component.prevContext || context,
		isUpdate = component.base,
		nextBase = component.nextBase,
		initialBase = isUpdate || nextBase,
		initialChildComponent = component._component,
		inst, cbase;

	// if updating
	if (isUpdate) {
		component.props = previousProps;
		component.state = previousState;
		component.context = previousContext;
		if (opts!==FORCE_RENDER
			&& component.shouldComponentUpdate
			&& component.shouldComponentUpdate(props, state, context) === false) {
			skip = true;
		}
		else if (component.componentWillUpdate) {
			component.componentWillUpdate(props, state, context);
		}
		component.props = props;
		component.state = state;
		component.context = context;
	}

	component.prevProps = component.prevState = component.prevContext = component.nextBase = null;
	component._dirty = false;

	if (!skip) {
		if (component.render) { rendered = component.render(props, state, context); }

		// context to pass to the child, can be updated via (grand-)parent component
		if (component.getChildContext) {
			context = extend(clone(context), component.getChildContext());
		}

		while (isFunctionalComponent(rendered)) {
			rendered = buildFunctionalComponent(rendered, context);
		}

		var childComponent = rendered && rendered.nodeName,
			toUnmount, base;

		if (isFunction(childComponent)) {
			// set up high order component link


			inst = initialChildComponent;
			var childProps = getNodeProps(rendered);

			if (inst && inst.constructor===childComponent) {
				setComponentProps(inst, childProps, SYNC_RENDER, context);
			}
			else {
				toUnmount = inst;

				inst = createComponent(childComponent, childProps, context);
				inst.nextBase = inst.nextBase || nextBase;
				inst._parentComponent = component;
				component._component = inst;
				setComponentProps(inst, childProps, NO_RENDER, context);
				renderComponent(inst, SYNC_RENDER, mountAll, true);
			}

			base = inst.base;
		}
		else {
			cbase = initialBase;

			// destroy high order component link
			toUnmount = initialChildComponent;
			if (toUnmount) {
				cbase = component._component = null;
			}

			if (initialBase || opts===SYNC_RENDER) {
				if (cbase) { cbase._component = null; }
				base = diff(cbase, rendered, context, mountAll || !isUpdate, initialBase && initialBase.parentNode, true);
			}
		}

		if (initialBase && base!==initialBase && inst!==initialChildComponent) {
			var baseParent = initialBase.parentNode;
			if (baseParent && base!==baseParent) {
				baseParent.replaceChild(base, initialBase);

				if (!toUnmount) {
					initialBase._component = null;
					recollectNodeTree(initialBase);
				}
			}
		}

		if (toUnmount) {
			unmountComponent(toUnmount, base!==initialBase);
		}

		component.base = base;
		if (base && !isChild) {
			var componentRef = component,
				t = component;
			while ((t=t._parentComponent)) {
				(componentRef = t).base = base;
			}
			base._component = componentRef;
			base._componentConstructor = componentRef.constructor;
		}
	}

	if (!isUpdate || mountAll) {
		mounts.unshift(component);
	}
	else if (!skip) {
		if (component.componentDidUpdate) {
			component.componentDidUpdate(previousProps, previousState, previousContext);
		}
		if (options.afterUpdate) { options.afterUpdate(component); }
	}

	var cb = component._renderCallbacks, fn;
	if (cb) { while ( (fn = cb.pop()) ) { fn.call(component); } }

	if (!diffLevel && !isChild) { flushMounts(); }
}



/** Apply the Component referenced by a VNode to the DOM.
 *	@param {Element} dom	The DOM node to mutate
 *	@param {VNode} vnode	A Component-referencing VNode
 *	@returns {Element} dom	The created/mutated element
 *	@private
 */
function buildComponentFromVNode(dom, vnode, context, mountAll) {
	var c = dom && dom._component,
		oldDom = dom,
		isDirectOwner = c && dom._componentConstructor===vnode.nodeName,
		isOwner = isDirectOwner,
		props = getNodeProps(vnode);
	while (c && !isOwner && (c=c._parentComponent)) {
		isOwner = c.constructor===vnode.nodeName;
	}

	if (c && isOwner && (!mountAll || c._component)) {
		setComponentProps(c, props, ASYNC_RENDER, context, mountAll);
		dom = c.base;
	}
	else {
		if (c && !isDirectOwner) {
			unmountComponent(c, true);
			dom = oldDom = null;
		}

		c = createComponent(vnode.nodeName, props, context);
		if (dom && !c.nextBase) {
			c.nextBase = dom;
			// passing dom/oldDom as nextBase will recycle it if unused, so bypass recycling on L241:
			oldDom = null;
		}
		setComponentProps(c, props, SYNC_RENDER, context, mountAll);
		dom = c.base;

		if (oldDom && dom!==oldDom) {
			oldDom._component = null;
			recollectNodeTree(oldDom);
		}
	}

	return dom;
}



/** Remove a component from the DOM and recycle it.
 *	@param {Element} dom			A DOM node from which to unmount the given Component
 *	@param {Component} component	The Component instance to unmount
 *	@private
 */
function unmountComponent(component, remove) {
	if (options.beforeUnmount) { options.beforeUnmount(component); }

	// console.log(`${remove?'Removing':'Unmounting'} component: ${component.constructor.name}`);
	var base = component.base;

	component._disable = true;

	if (component.componentWillUnmount) { component.componentWillUnmount(); }

	component.base = null;

	// recursively tear down & recollect high-order component children:
	var inner = component._component;
	if (inner) {
		unmountComponent(inner, remove);
	}
	else if (base) {
		if (base[ATTR_KEY] && base[ATTR_KEY].ref) { base[ATTR_KEY].ref(null); }

		component.nextBase = base;

		if (remove) {
			removeNode(base);
			collectComponent(component);
		}
		removeOrphanedChildren(base.childNodes, !remove);
	}

	if (component.__ref) { component.__ref(null); }
	if (component.componentDidUnmount) { component.componentDidUnmount(); }
}

/** Base Component class, for he ES6 Class method of creating Components
 *	@public
 *
 *	@example
 *	class MyFoo extends Component {
 *		render(props, state) {
 *			return <div />;
 *		}
 *	}
 */
function Component(props, context) {
	/** @private */
	this._dirty = true;
	// /** @public */
	// this._disableRendering = false;
	// /** @public */
	// this.prevState = this.prevProps = this.prevContext = this.base = this.nextBase = this._parentComponent = this._component = this.__ref = this.__key = this._linkedStates = this._renderCallbacks = null;
	/** @public */
	this.context = context;
	/** @type {object} */
	this.props = props;
	/** @type {object} */
	if (!this.state) { this.state = {}; }
}


extend(Component.prototype, {

	/** Returns a `boolean` value indicating if the component should re-render when receiving the given `props` and `state`.
	 *	@param {object} nextProps
	 *	@param {object} nextState
	 *	@param {object} nextContext
	 *	@returns {Boolean} should the component re-render
	 *	@name shouldComponentUpdate
	 *	@function
	 */
	// shouldComponentUpdate() {
	// 	return true;
	// },


	/** Returns a function that sets a state property when called.
	 *	Calling linkState() repeatedly with the same arguments returns a cached link function.
	 *
	 *	Provides some built-in special cases:
	 *		- Checkboxes and radio buttons link their boolean `checked` value
	 *		- Inputs automatically link their `value` property
	 *		- Event paths fall back to any associated Component if not found on an element
	 *		- If linked value is a function, will invoke it and use the result
	 *
	 *	@param {string} key				The path to set - can be a dot-notated deep key
	 *	@param {string} [eventPath]		If set, attempts to find the new state value at a given dot-notated path within the object passed to the linkedState setter.
	 *	@returns {function} linkStateSetter(e)
	 *
	 *	@example Update a "text" state value when an input changes:
	 *		<input onChange={ this.linkState('text') } />
	 *
	 *	@example Set a deep state value on click
	 *		<button onClick={ this.linkState('touch.coords', 'touches.0') }>Tap</button
	 */
	linkState: function linkState(key, eventPath) {
		var c = this._linkedStates || (this._linkedStates = {});
		return c[key+eventPath] || (c[key+eventPath] = createLinkedState(this, key, eventPath));
	},


	/** Update component state by copying properties from `state` to `this.state`.
	 *	@param {object} state		A hash of state properties to update with new values
	 */
	setState: function setState(state, callback) {
		var s = this.state;
		if (!this.prevState) { this.prevState = clone(s); }
		extend(s, isFunction(state) ? state(s, this.props) : state);
		if (callback) { (this._renderCallbacks = (this._renderCallbacks || [])).push(callback); }
		enqueueRender(this);
	},


	/** Immediately perform a synchronous re-render of the component.
	 *	@private
	 */
	forceUpdate: function forceUpdate() {
		renderComponent(this, FORCE_RENDER);
	},


	/** Accepts `props` and `state`, and returns a new Virtual DOM tree to build.
	 *	Virtual DOM is generally constructed via [JSX](http://jasonformat.com/wtf-is-jsx).
	 *	@param {object} props		Props (eg: JSX attributes) received from parent element/component
	 *	@param {object} state		The component's current state
	 *	@param {object} context		Context object (if a parent component has provided context)
	 *	@returns VNode
	 */
	render: function render() {}

});

/** Render JSX into a `parent` Element.
 *	@param {VNode} vnode		A (JSX) VNode to render
 *	@param {Element} parent		DOM element to render into
 *	@param {Element} [merge]	Attempt to re-use an existing DOM tree rooted at `merge`
 *	@public
 *
 *	@example
 *	// render a div into <body>:
 *	render(<div id="hello">hello!</div>, document.body);
 *
 *	@example
 *	// render a "Thing" component into #foo:
 *	const Thing = ({ name }) => <span>{ name }</span>;
 *	render(<Thing name="one" />, document.querySelector('#foo'));
 */
function render$1(vnode, parent, merge) {
	return diff(merge, vnode, {}, false, parent);
}

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};





function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */

function makeEmptyFunction(arg) {
  return function () {
    return arg;
  };
}

/**
 * This function accepts and discards inputs; it has no side effects. This is
 * primarily useful idiomatically for overridable function endpoints which
 * always need to be callable, since JS lacks a null-call idiom ala Cocoa.
 */
var emptyFunction$1 = function emptyFunction$1() {};

emptyFunction$1.thatReturns = makeEmptyFunction;
emptyFunction$1.thatReturnsFalse = makeEmptyFunction(false);
emptyFunction$1.thatReturnsTrue = makeEmptyFunction(true);
emptyFunction$1.thatReturnsNull = makeEmptyFunction(null);
emptyFunction$1.thatReturnsThis = function () {
  return this;
};
emptyFunction$1.thatReturnsArgument = function (arg) {
  return arg;
};

var emptyFunction_1 = emptyFunction$1;

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var validateFormat = function validateFormat(format) {};

function invariant$1(condition, format, a, b, c, d, e, f) {
  validateFormat(format);

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error('Minified exception occurred; use the non-minified dev environment ' + 'for the full error message and additional helpful warnings.');
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error(format.replace(/%s/g, function () {
        return args[argIndex++];
      }));
      error.name = 'Invariant Violation';
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
}

var invariant_1 = invariant$1;

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var ReactPropTypesSecret$1 = 'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED';

var ReactPropTypesSecret_1 = ReactPropTypesSecret$1;

var emptyFunction = emptyFunction_1;
var invariant = invariant_1;
var ReactPropTypesSecret = ReactPropTypesSecret_1;

var factoryWithThrowingShims = function() {
  function shim(props, propName, componentName, location, propFullName, secret) {
    if (secret === ReactPropTypesSecret) {
      // It is still safe when called from React.
      return;
    }
    invariant(
      false,
      'Calling PropTypes validators directly is not supported by the `prop-types` package. ' +
      'Use PropTypes.checkPropTypes() to call them. ' +
      'Read more at http://fb.me/use-check-prop-types'
    );
  }
  shim.isRequired = shim;
  function getShim() {
    return shim;
  }
  // Important!
  // Keep this list in sync with production version in `./factoryWithTypeCheckers.js`.
  var ReactPropTypes = {
    array: shim,
    bool: shim,
    func: shim,
    number: shim,
    object: shim,
    string: shim,
    symbol: shim,

    any: shim,
    arrayOf: getShim,
    element: shim,
    instanceOf: getShim,
    node: shim,
    objectOf: getShim,
    oneOf: getShim,
    oneOfType: getShim,
    shape: getShim,
    exact: getShim
  };

  ReactPropTypes.checkPropTypes = emptyFunction;
  ReactPropTypes.PropTypes = ReactPropTypes;

  return ReactPropTypes;
};

var index$1 = createCommonjsModule(function (module) {
/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

{
  // By explicitly using `prop-types` you are opting into new production behavior.
  // http://fb.me/prop-types-in-prod
  module.exports = factoryWithThrowingShims();
}
});

var ELEMENTS = 'a abbr address area article aside audio b base bdi bdo big blockquote body br button canvas caption cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img input ins kbd keygen label legend li link main map mark menu menuitem meta meter nav noscript object ol optgroup option output p param picture pre progress q rp rt ruby s samp script section select small source span strong style sub summary sup table tbody td textarea tfoot th thead time title tr track u ul var video wbr circle clipPath defs ellipse g image line linearGradient mask path pattern polygon polyline radialGradient rect stop svg text tspan'.split(' ');

var REACT_ELEMENT_TYPE = (typeof Symbol!=='undefined' && Symbol.for && Symbol.for('react.element')) || 0xeac7;

var COMPONENT_WRAPPER_KEY = typeof Symbol!=='undefined' ? Symbol.for('__preactCompatWrapper') : '__preactCompatWrapper';

// don't autobind these methods since they already have guaranteed context.
var AUTOBIND_BLACKLIST = {
	constructor: 1,
	render: 1,
	shouldComponentUpdate: 1,
	componentWillReceiveProps: 1,
	componentWillUpdate: 1,
	componentDidUpdate: 1,
	componentWillMount: 1,
	componentDidMount: 1,
	componentWillUnmount: 1,
	componentDidUnmount: 1
};


var CAMEL_PROPS = /^(?:accent|alignment|arabic|baseline|cap|clip|color|fill|flood|font|glyph|horiz|marker|overline|paint|stop|strikethrough|stroke|text|underline|unicode|units|v|vector|vert|word|writing|x)[A-Z]/;


var BYPASS_HOOK = {};

/*global process*/
var DEV = typeof process==='undefined' || !process.env || 'production'!=='production';

// make react think we're react.
var VNode$1 = h$1('a', null).constructor;
VNode$1.prototype.$$typeof = REACT_ELEMENT_TYPE;
VNode$1.prototype.preactCompatUpgraded = false;
VNode$1.prototype.preactCompatNormalized = false;

Object.defineProperty(VNode$1.prototype, 'type', {
	get: function get() { return this.nodeName; },
	set: function set(v) { this.nodeName = v; },
	configurable:true
});

Object.defineProperty(VNode$1.prototype, 'props', {
	get: function get() { return this.attributes; },
	set: function set(v) { this.attributes = v; },
	configurable:true
});



var oldEventHook = options.event;
options.event = function (e) {
	if (oldEventHook) { e = oldEventHook(e); }
	e.persist = Object;
	e.nativeEvent = e;
	return e;
};


var oldVnodeHook = options.vnode;
options.vnode = function (vnode) {
	if (!vnode.preactCompatUpgraded) {
		vnode.preactCompatUpgraded = true;

		var tag = vnode.nodeName,
			attrs = vnode.attributes = extend$1({}, vnode.attributes);

		if (typeof tag==='function') {
			if (tag[COMPONENT_WRAPPER_KEY]===true || (tag.prototype && 'isReactComponent' in tag.prototype)) {
				if (vnode.children && String(vnode.children)==='') { vnode.children = undefined; }
				if (vnode.children) { attrs.children = vnode.children; }

				if (!vnode.preactCompatNormalized) {
					normalizeVNode(vnode);
				}
				handleComponentVNode(vnode);
			}
		}
		else {
			if (vnode.children && String(vnode.children)==='') { vnode.children = undefined; }
			if (vnode.children) { attrs.children = vnode.children; }

			if (attrs.defaultValue) {
				if (!attrs.value && attrs.value!==0) {
					attrs.value = attrs.defaultValue;
				}
				delete attrs.defaultValue;
			}

			handleElementVNode(vnode, attrs);
		}
	}

	if (oldVnodeHook) { oldVnodeHook(vnode); }
};

function handleComponentVNode(vnode) {
	var tag = vnode.nodeName,
		a = vnode.attributes;

	vnode.attributes = {};
	if (tag.defaultProps) { extend$1(vnode.attributes, tag.defaultProps); }
	if (a) { extend$1(vnode.attributes, a); }
}

function handleElementVNode(vnode, a) {
	var shouldSanitize, attrs, i;
	if (a) {
		for (i in a) { if ((shouldSanitize = CAMEL_PROPS.test(i))) { break; } }
		if (shouldSanitize) {
			attrs = vnode.attributes = {};
			for (i in a) {
				if (a.hasOwnProperty(i)) {
					attrs[ CAMEL_PROPS.test(i) ? i.replace(/([A-Z0-9])/, '-$1').toLowerCase() : i ] = a[i];
				}
			}
		}
	}
}



// proxy render() since React returns a Component reference.
function render$2(vnode, parent, callback) {
	var prev = parent && parent._preactCompatRendered && parent._preactCompatRendered.base;

	// ignore impossible previous renders
	if (prev && prev.parentNode!==parent) { prev = null; }

	// default to first Element child
	if (!prev && parent) { prev = parent.firstElementChild; }

	// remove unaffected siblings
	for (var i=parent.childNodes.length; i--; ) {
		if (parent.childNodes[i]!==prev) {
			parent.removeChild(parent.childNodes[i]);
		}
	}

	var out = render$1(vnode, parent, prev);
	if (parent) { parent._preactCompatRendered = out && (out._component || { base: out }); }
	if (typeof callback==='function') { callback(); }
	return out && out._component || out;
}


var ContextProvider = function ContextProvider () {};

ContextProvider.prototype.getChildContext = function getChildContext () {
	return this.props.context;
};
ContextProvider.prototype.render = function render$2 (props) {
	return props.children[0];
};

var ARR = [];

// This API is completely unnecessary for Preact, so it's basically passthrough.
var Children = {
	map: function map(children, fn, ctx) {
		if (children == null) { return null; }
		children = Children.toArray(children);
		if (ctx && ctx!==children) { fn = fn.bind(ctx); }
		return children.map(fn);
	},
	forEach: function forEach(children, fn, ctx) {
		if (children == null) { return null; }
		children = Children.toArray(children);
		if (ctx && ctx!==children) { fn = fn.bind(ctx); }
		children.forEach(fn);
	},
	count: function count(children) {
		return children && children.length || 0;
	},
	only: function only(children) {
		children = Children.toArray(children);
		if (children.length!==1) { throw new Error('Children.only() expects only one child.'); }
		return children[0];
	},
	toArray: function toArray(children) {
		if (children == null) { return []; }
		return ARR.concat(children);
	}
};


/** Track current render() component for ref assignment */
var currentComponent;


function createFactory(type) {
	return createElement.bind(null, type);
}


var DOM = {};
for (var i=ELEMENTS.length; i--; ) {
	DOM[ELEMENTS[i]] = createFactory(ELEMENTS[i]);
}

function upgradeToVNodes(arr, offset) {
	for (var i=offset || 0; i<arr.length; i++) {
		var obj = arr[i];
		if (Array.isArray(obj)) {
			upgradeToVNodes(obj);
		}
		else if (obj && typeof obj==='object' && !isValidElement(obj) && ((obj.props && obj.type) || (obj.attributes && obj.nodeName) || obj.children)) {
			arr[i] = createElement(obj.type || obj.nodeName, obj.props || obj.attributes, obj.children);
		}
	}
}

function isStatelessComponent(c) {
	return typeof c==='function' && !(c.prototype && c.prototype.render);
}


// wraps stateless functional components in a PropTypes validator
function wrapStatelessComponent(WrappedComponent) {
	return createClass({
		displayName: WrappedComponent.displayName || WrappedComponent.name,
		render: function render$2() {
			return WrappedComponent(this.props, this.context);
		}
	});
}


function statelessComponentHook(Ctor) {
	var Wrapped = Ctor[COMPONENT_WRAPPER_KEY];
	if (Wrapped) { return Wrapped===true ? Ctor : Wrapped; }

	Wrapped = wrapStatelessComponent(Ctor);

	Object.defineProperty(Wrapped, COMPONENT_WRAPPER_KEY, { configurable:true, value:true });
	Wrapped.displayName = Ctor.displayName;
	Wrapped.propTypes = Ctor.propTypes;
	Wrapped.defaultProps = Ctor.defaultProps;

	Object.defineProperty(Ctor, COMPONENT_WRAPPER_KEY, { configurable:true, value:Wrapped });

	return Wrapped;
}


function createElement() {
	var args = [], len = arguments.length;
	while ( len-- ) args[ len ] = arguments[ len ];

	upgradeToVNodes(args, 2);
	return normalizeVNode(h$1.apply(void 0, args));
}


function normalizeVNode(vnode) {
	vnode.preactCompatNormalized = true;

	applyClassName(vnode);

	if (isStatelessComponent(vnode.nodeName)) {
		vnode.nodeName = statelessComponentHook(vnode.nodeName);
	}

	var ref = vnode.attributes.ref,
		type = ref && typeof ref;
	if (currentComponent && (type==='string' || type==='number')) {
		vnode.attributes.ref = createStringRefProxy(ref, currentComponent);
	}

	applyEventNormalization(vnode);

	return vnode;
}


function isValidElement(element) {
	return element && ((element instanceof VNode$1) || element.$$typeof===REACT_ELEMENT_TYPE);
}


function createStringRefProxy(name, component) {
	return component._refProxies[name] || (component._refProxies[name] = function (resolved) {
		if (component && component.refs) {
			component.refs[name] = resolved;
			if (resolved===null) {
				delete component._refProxies[name];
				component = null;
			}
		}
	});
}


function applyEventNormalization(ref) {
	var nodeName = ref.nodeName;
	var attributes = ref.attributes;

	if (!attributes || typeof nodeName!=='string') { return; }
	var props = {};
	for (var i in attributes) {
		props[i.toLowerCase()] = i;
	}
	if (props.ondoubleclick) {
		attributes.ondblclick = attributes[props.ondoubleclick];
		delete attributes[props.ondoubleclick];
	}
	// for *textual inputs* (incl textarea), normalize `onChange` -> `onInput`:
	if (props.onchange && (nodeName==='textarea' || (nodeName.toLowerCase()==='input' && !/^fil|che|rad/i.test(attributes.type)))) {
		var normalized = props.oninput || 'oninput';
		if (!attributes[normalized]) {
			attributes[normalized] = multihook([attributes[normalized], attributes[props.onchange]]);
			delete attributes[props.onchange];
		}
	}
}


function applyClassName(vnode) {
	var a = vnode.attributes || (vnode.attributes = {});
	classNameDescriptor.enumerable = 'className' in a;
	if (a.className) { a.class = a.className; }
	Object.defineProperty(a, 'className', classNameDescriptor);
}


var classNameDescriptor = {
	configurable: true,
	get: function get() { return this.class; },
	set: function set(v) { this.class = v; }
};

function extend$1(base, props) {
	var arguments$1 = arguments;

	for (var i=1, obj = (void 0); i<arguments.length; i++) {
		if ((obj = arguments$1[i])) {
			for (var key in obj) {
				if (obj.hasOwnProperty(key)) {
					base[key] = obj[key];
				}
			}
		}
	}
	return base;
}


function F(){}

function createClass(obj) {
	function cl(props, context) {
		bindAll(this);
		Component$1.call(this, props, context, BYPASS_HOOK);
		newComponentHook.call(this, props, context);
	}

	obj = extend$1({ constructor: cl }, obj);

	// We need to apply mixins here so that getDefaultProps is correctly mixed
	if (obj.mixins) {
		applyMixins(obj, collateMixins(obj.mixins));
	}
	if (obj.statics) {
		extend$1(cl, obj.statics);
	}
	if (obj.propTypes) {
		cl.propTypes = obj.propTypes;
	}
	if (obj.defaultProps) {
		cl.defaultProps = obj.defaultProps;
	}
	if (obj.getDefaultProps) {
		cl.defaultProps = obj.getDefaultProps();
	}

	F.prototype = Component$1.prototype;
	cl.prototype = extend$1(new F(), obj);

	cl.displayName = obj.displayName || 'Component';

	return cl;
}


// Flatten an Array of mixins to a map of method name to mixin implementations
function collateMixins(mixins) {
	var keyed = {};
	for (var i=0; i<mixins.length; i++) {
		var mixin = mixins[i];
		for (var key in mixin) {
			if (mixin.hasOwnProperty(key) && typeof mixin[key]==='function') {
				(keyed[key] || (keyed[key]=[])).push(mixin[key]);
			}
		}
	}
	return keyed;
}


// apply a mapping of Arrays of mixin methods to a component prototype
function applyMixins(proto, mixins) {
	for (var key in mixins) { if (mixins.hasOwnProperty(key)) {
		proto[key] = multihook(
			mixins[key].concat(proto[key] || ARR),
			key==='getDefaultProps' || key==='getInitialState' || key==='getChildContext'
		);
	} }
}


function bindAll(ctx) {
	for (var i in ctx) {
		var v = ctx[i];
		if (typeof v==='function' && !v.__bound && !AUTOBIND_BLACKLIST.hasOwnProperty(i)) {
			(ctx[i] = v.bind(ctx)).__bound = true;
		}
	}
}


function callMethod(ctx, m, args) {
	if (typeof m==='string') {
		m = ctx.constructor.prototype[m];
	}
	if (typeof m==='function') {
		return m.apply(ctx, args);
	}
}

function multihook(hooks, skipDuplicates) {
	return function() {
		var arguments$1 = arguments;
		var this$1 = this;

		var ret;
		for (var i=0; i<hooks.length; i++) {
			var r = callMethod(this$1, hooks[i], arguments$1);

			if (skipDuplicates && r!=null) {
				if (!ret) { ret = {}; }
				for (var key in r) { if (r.hasOwnProperty(key)) {
					ret[key] = r[key];
				} }
			}
			else if (typeof r!=='undefined') { ret = r; }
		}
		return ret;
	};
}


function newComponentHook(props, context) {
	propsHook.call(this, props, context);
	this.componentWillReceiveProps = multihook([propsHook, this.componentWillReceiveProps || 'componentWillReceiveProps']);
	this.render = multihook([propsHook, beforeRender, this.render || 'render', afterRender]);
}


function propsHook(props, context) {
	if (!props) { return; }

	// React annoyingly special-cases single children, and some react components are ridiculously strict about this.
	var c = props.children;
	if (c && Array.isArray(c) && c.length===1 && (typeof c[0]==='string' || typeof c[0]==='function' || c[0] instanceof VNode$1)) {
		props.children = c[0];

		// but its totally still going to be an Array.
		if (props.children && typeof props.children==='object') {
			props.children.length = 1;
			props.children[0] = props.children;
		}
	}

	// add proptype checking
	if (DEV) {
		var ctor = typeof this==='function' ? this : this.constructor,
			propTypes = this.propTypes || ctor.propTypes;
		var displayName = this.displayName || ctor.name;

		if (propTypes) {
			index$1.checkPropTypes(propTypes, props, 'prop', displayName);
		}
	}
}


function beforeRender(props) {
	currentComponent = this;
}

function afterRender() {
	if (currentComponent===this) {
		currentComponent = null;
	}
}



function Component$1(props, context, opts) {
	Component.call(this, props, context);
	this.state = this.getInitialState ? this.getInitialState() : {};
	this.refs = {};
	this._refProxies = {};
	if (opts!==BYPASS_HOOK) {
		newComponentHook.call(this, props, context);
	}
}
extend$1(Component$1.prototype = new Component(), {
	constructor: Component$1,

	isReactComponent: {},

	replaceState: function replaceState(state, callback) {
		var this$1 = this;

		this.setState(state, callback);
		for (var i in this$1.state) {
			if (!(i in state)) {
				delete this$1.state[i];
			}
		}
	},

	getDOMNode: function getDOMNode() {
		return this.base;
	},

	isMounted: function isMounted() {
		return !!this.base;
	}
});



F.prototype = Component$1.prototype;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Built-in value references. */
var Symbol$1 = root.Symbol;

/** Used for built-in method references. */
var objectProto$1 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$1 = objectProto$1.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto$1.toString;

/** Built-in value references. */
var symToStringTag$1 = Symbol$1 ? Symbol$1.toStringTag : undefined;

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty$1.call(value, symToStringTag$1),
      tag = value[symToStringTag$1];

  try {
    value[symToStringTag$1] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag$1] = tag;
    } else {
      delete value[symToStringTag$1];
    }
  }
  return result;
}

/** Used for built-in method references. */
var objectProto$2 = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString$1 = objectProto$2.toString;

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString$1.call(value);
}

/** `Object#toString` result references. */
var nullTag = '[object Null]';
var undefinedTag = '[object Undefined]';

/** Built-in value references. */
var symToStringTag = Symbol$1 ? Symbol$1.toStringTag : undefined;

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? getRawTag(value)
    : objectToString(value);
}

/**
 * Creates a unary function that invokes `func` with its argument transformed.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {Function} transform The argument transform.
 * @returns {Function} Returns the new function.
 */
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}

/** Built-in value references. */
var getPrototype = overArg(Object.getPrototypeOf, Object);

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}

/** `Object#toString` result references. */
var objectTag = '[object Object]';

/** Used for built-in method references. */
var funcProto = Function.prototype;
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Used to infer the `Object` constructor. */
var objectCtorString = funcToString.call(Object);

/**
 * Checks if `value` is a plain object, that is, an object created by the
 * `Object` constructor or one with a `[[Prototype]]` of `null`.
 *
 * @static
 * @memberOf _
 * @since 0.8.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 * }
 *
 * _.isPlainObject(new Foo);
 * // => false
 *
 * _.isPlainObject([1, 2, 3]);
 * // => false
 *
 * _.isPlainObject({ 'x': 0, 'y': 0 });
 * // => true
 *
 * _.isPlainObject(Object.create(null));
 * // => true
 */
function isPlainObject(value) {
  if (!isObjectLike(value) || baseGetTag(value) != objectTag) {
    return false;
  }
  var proto = getPrototype(value);
  if (proto === null) {
    return true;
  }
  var Ctor = hasOwnProperty.call(proto, 'constructor') && proto.constructor;
  return typeof Ctor == 'function' && Ctor instanceof Ctor &&
    funcToString.call(Ctor) == objectCtorString;
}

function symbolObservablePonyfill(root) {
	var result;
	var Symbol = root.Symbol;

	if (typeof Symbol === 'function') {
		if (Symbol.observable) {
			result = Symbol.observable;
		} else {
			result = Symbol('observable');
			Symbol.observable = result;
		}
	} else {
		result = '@@observable';
	}

	return result;
}

/* global window */
var root$2;

if (typeof self !== 'undefined') {
  root$2 = self;
} else if (typeof window !== 'undefined') {
  root$2 = window;
} else if (typeof global !== 'undefined') {
  root$2 = global;
} else if (typeof module !== 'undefined') {
  root$2 = module;
} else {
  root$2 = Function('return this')();
}

var result = symbolObservablePonyfill(root$2);

/**
 * These are private action types reserved by Redux.
 * For any unknown actions, you must return the current state.
 * If the current state is undefined, you must return the initial state.
 * Do not reference these action types directly in your code.
 */
var ActionTypes = {
  INIT: '@@redux/INIT'

  /**
   * Creates a Redux store that holds the state tree.
   * The only way to change the data in the store is to call `dispatch()` on it.
   *
   * There should only be a single store in your app. To specify how different
   * parts of the state tree respond to actions, you may combine several reducers
   * into a single reducer function by using `combineReducers`.
   *
   * @param {Function} reducer A function that returns the next state tree, given
   * the current state tree and the action to handle.
   *
   * @param {any} [preloadedState] The initial state. You may optionally specify it
   * to hydrate the state from the server in universal apps, or to restore a
   * previously serialized user session.
   * If you use `combineReducers` to produce the root reducer function, this must be
   * an object with the same shape as `combineReducers` keys.
   *
   * @param {Function} [enhancer] The store enhancer. You may optionally specify it
   * to enhance the store with third-party capabilities such as middleware,
   * time travel, persistence, etc. The only store enhancer that ships with Redux
   * is `applyMiddleware()`.
   *
   * @returns {Store} A Redux store that lets you read the state, dispatch actions
   * and subscribe to changes.
   */
};function createStore(reducer, preloadedState, enhancer) {
  var _ref2;

  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState;
    preloadedState = undefined;
  }

  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.');
    }

    return enhancer(createStore)(reducer, preloadedState);
  }

  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.');
  }

  var currentReducer = reducer;
  var currentState = preloadedState;
  var currentListeners = [];
  var nextListeners = currentListeners;
  var isDispatching = false;

  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice();
    }
  }

  /**
   * Reads the state tree managed by the store.
   *
   * @returns {any} The current state tree of your application.
   */
  function getState() {
    return currentState;
  }

  /**
   * Adds a change listener. It will be called any time an action is dispatched,
   * and some part of the state tree may potentially have changed. You may then
   * call `getState()` to read the current state tree inside the callback.
   *
   * You may call `dispatch()` from a change listener, with the following
   * caveats:
   *
   * 1. The subscriptions are snapshotted just before every `dispatch()` call.
   * If you subscribe or unsubscribe while the listeners are being invoked, this
   * will not have any effect on the `dispatch()` that is currently in progress.
   * However, the next `dispatch()` call, whether nested or not, will use a more
   * recent snapshot of the subscription list.
   *
   * 2. The listener should not expect to see all state changes, as the state
   * might have been updated multiple times during a nested `dispatch()` before
   * the listener is called. It is, however, guaranteed that all subscribers
   * registered before the `dispatch()` started will be called with the latest
   * state by the time it exits.
   *
   * @param {Function} listener A callback to be invoked on every dispatch.
   * @returns {Function} A function to remove this change listener.
   */
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected listener to be a function.');
    }

    var isSubscribed = true;

    ensureCanMutateNextListeners();
    nextListeners.push(listener);

    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }

      isSubscribed = false;

      ensureCanMutateNextListeners();
      var index = nextListeners.indexOf(listener);
      nextListeners.splice(index, 1);
    };
  }

  /**
   * Dispatches an action. It is the only way to trigger a state change.
   *
   * The `reducer` function, used to create the store, will be called with the
   * current state tree and the given `action`. Its return value will
   * be considered the **next** state of the tree, and the change listeners
   * will be notified.
   *
   * The base implementation only supports plain object actions. If you want to
   * dispatch a Promise, an Observable, a thunk, or something else, you need to
   * wrap your store creating function into the corresponding middleware. For
   * example, see the documentation for the `redux-thunk` package. Even the
   * middleware will eventually dispatch plain object actions using this method.
   *
   * @param {Object} action A plain object representing “what changed”. It is
   * a good idea to keep actions serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An action must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for action types.
   *
   * @returns {Object} For convenience, the same action object you dispatched.
   *
   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
   * return something else (for example, a Promise you can await).
   */
  function dispatch(action) {
    if (!isPlainObject(action)) {
      throw new Error('Actions must be plain objects. ' + 'Use custom middleware for async actions.');
    }

    if (typeof action.type === 'undefined') {
      throw new Error('Actions may not have an undefined "type" property. ' + 'Have you misspelled a constant?');
    }

    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.');
    }

    try {
      isDispatching = true;
      currentState = currentReducer(currentState, action);
    } finally {
      isDispatching = false;
    }

    var listeners = currentListeners = nextListeners;
    for (var i = 0; i < listeners.length; i++) {
      var listener = listeners[i];
      listener();
    }

    return action;
  }

  /**
   * Replaces the reducer currently used by the store to calculate the state.
   *
   * You might need this if your app implements code splitting and you want to
   * load some of the reducers dynamically. You might also need this if you
   * implement a hot reloading mechanism for Redux.
   *
   * @param {Function} nextReducer The reducer for the store to use instead.
   * @returns {void}
   */
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.');
    }

    currentReducer = nextReducer;
    dispatch({ type: ActionTypes.INIT });
  }

  /**
   * Interoperability point for observable/reactive libraries.
   * @returns {observable} A minimal observable of state changes.
   * For more information, see the observable proposal:
   * https://github.com/tc39/proposal-observable
   */
  function observable() {
    var _ref;

    var outerSubscribe = subscribe;
    return _ref = {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe: function subscribe(observer) {
        if (typeof observer !== 'object') {
          throw new TypeError('Expected the observer to be an object.');
        }

        function observeState() {
          if (observer.next) {
            observer.next(getState());
          }
        }

        observeState();
        var unsubscribe = outerSubscribe(observeState);
        return { unsubscribe: unsubscribe };
      }
    }, _ref[result] = function () {
      return this;
    }, _ref;
  }

  // When a store is created, an "INIT" action is dispatched so that every
  // reducer returns their initial state. This effectively populates
  // the initial state tree.
  dispatch({ type: ActionTypes.INIT });

  return _ref2 = {
    dispatch: dispatch,
    subscribe: subscribe,
    getState: getState,
    replaceReducer: replaceReducer
  }, _ref2[result] = observable, _ref2;
}

/**
 * Prints a warning in the console if it exists.
 *
 * @param {String} message The warning message.
 * @returns {void}
 */
function warning(message) {
  /* eslint-disable no-console */
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error(message);
  }
  /* eslint-enable no-console */
  try {
    // This error was thrown as a convenience so that if you enable
    // "break on all exceptions" in your console,
    // it would pause the execution at this line.
    throw new Error(message);
    /* eslint-disable no-empty */
  } catch (e) {}
  /* eslint-enable no-empty */
}

function getUndefinedStateErrorMessage(key, action) {
  var actionType = action && action.type;
  var actionName = actionType && '"' + actionType.toString() + '"' || 'an action';

  return 'Given action ' + actionName + ', reducer "' + key + '" returned undefined. ' + 'To ignore an action, you must explicitly return the previous state. ' + 'If you want this reducer to hold no value, you can return null instead of undefined.';
}

function assertReducerShape(reducers) {
  Object.keys(reducers).forEach(function (key) {
    var reducer = reducers[key];
    var initialState = reducer(undefined, { type: ActionTypes.INIT });

    if (typeof initialState === 'undefined') {
      throw new Error('Reducer "' + key + '" returned undefined during initialization. ' + 'If the state passed to the reducer is undefined, you must ' + 'explicitly return the initial state. The initial state may ' + 'not be undefined. If you don\'t want to set a value for this reducer, ' + 'you can use null instead of undefined.');
    }

    var type = '@@redux/PROBE_UNKNOWN_ACTION_' + Math.random().toString(36).substring(7).split('').join('.');
    if (typeof reducer(undefined, { type: type }) === 'undefined') {
      throw new Error('Reducer "' + key + '" returned undefined when probed with a random type. ' + ('Don\'t try to handle ' + ActionTypes.INIT + ' or other actions in "redux/*" ') + 'namespace. They are considered private. Instead, you must return the ' + 'current state for any unknown actions, unless it is undefined, ' + 'in which case you must return the initial state, regardless of the ' + 'action type. The initial state may not be undefined, but can be null.');
    }
  });
}

/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */

function compose() {
  var arguments$1 = arguments;

  for (var _len = arguments.length, funcs = Array(_len), _key = 0; _key < _len; _key++) {
    funcs[_key] = arguments$1[_key];
  }

  if (funcs.length === 0) {
    return function (arg) {
      return arg;
    };
  }

  if (funcs.length === 1) {
    return funcs[0];
  }

  return funcs.reduce(function (a, b) {
    return function () {
      return a(b.apply(undefined, arguments));
    };
  });
}

var _extends = Object.assign || function (target) {
var arguments$1 = arguments;
 for (var i = 1; i < arguments.length; i++) { var source = arguments$1[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

/*
* This is a dummy function to check if the function name has been altered by minification.
* If the function has been minified and NODE_ENV !== 'production', warn the user.
*/
function isCrushed() {}

if ('production' !== 'production' && typeof isCrushed.name === 'string' && isCrushed.name !== 'isCrushed') {
  warning('You are currently using minified code outside of NODE_ENV === \'production\'. ' + 'This means that you are running a slower development build of Redux. ' + 'You can use loose-envify (https://github.com/zertosh/loose-envify) for browserify ' + 'or DefinePlugin for webpack (http://stackoverflow.com/questions/30030031) ' + 'to ensure you have the correct code for your production build.');
}

var initialState = {
  peers: [],
  me: {
    name: "unknown",
    stream: null,
  },
};

var peers = function (state, action) {
  if ( state === void 0 ) state = initialState;

  switch(action.type) {
    case 'PEER_CONNECTED': return peerConnected(state, action.peerConfig)
		case 'PEER_DISCONNECTED': return peerDisconnected(state, action.peerConfig)
		case 'ME_MEDIA': return meStream(state, action.media)
    default: return state
  }
};

var peerConnected = function (state, peerConfig) {
  return state;
};

var peerDisconnected = function (state, peerConfig) {
  return state;
};

var meStream = function (state, stream) {
  var me = {
    stream: stream,
    name: "connected",
  };
  return Object.assign({}, state, {
    peers: [me],
		me: me,
	});
};

/**
 * Draws a Logo
 */
var Logo = function () { return (
  h( 'div', { style: "position:fixed; top: 10px; right: 10px; color: rgba(255, 255, 255, 50); font-size:40px; z-index:9000;" }, "Conf.ly")
); };

/**
 * Draws a video view
 */
var MediaStreamView = function (ref) {
  var stream = ref.stream;

  return (
  h( 'div', { style: "width:100%; height:100%; background-color:#FF0000;" },
    stream ? h( 'video', { src: URL.createObjectURL(stream), autoplay: true, style: "width:100%; height: 100%;" }) : h( 'div', null )
  )
);
};

/**
 * Draws a view representing a peer
 */
var MeStreamView = function (ref) {
	var me = ref.me;

	return (
  h( 'div', { style: "width:80%; height:100%;" },
		h( 'span', null, "Your name: ", me.name ),
		h( MediaStreamView, { stream: me ? me.stream : null })
	)
);
};

/**
 * Draws a view representing a peer
 */
var PeerStreamView = function (ref) {
	var peer = ref.peer;

	return (
  h( 'div', { style: "width:200px; height:200px; background-color: #FF00FF; z-index:1000; float:right;" },
		h( 'span', null, peer.name ),
		h( MediaStreamView, { stream: peer.stream })
	)
);
};

/**
 * SignalingHandler relays information to and from the master server. Signaling
 * is just an implementation detail in BobRTC, ours use WebSockets but it can be
 * replaced with your own SignalingHandler that use two monkeys, two tin cans
 * and a string between them.
 *
 * @param url The url where the master server can be reached.
 * @param onSignal Function that will be called whenever we get a signal back
 * from the server.
 * @param onError Function that will be called whenever we get an error that the
 * signal handler could not handle by itself.
 */
var SignalingHandler = function SignalingHandler(url, onSignal, onError) {
	var this$1 = this;

	this.url = url;
	this.socket = null;
	this.onSignal = onSignal;
	this.onError = onError;

	this.socket = new WebSocket('wss://' + window.location.hostname + ':8443');
	this.socket.onmessage = function (message) {
		this$1.onSignal ? this$1.onSignal(JSON.parse(message.data)) : undefined;
	};
	this.socket.onerror = function (error) {
		this$1.onError ? this$1.onError(error) : undefined;
	};
};

SignalingHandler.prototype.joinRoom = function joinRoom (roomId) {
	// this.socket = new WebSocket(url + '/' + roomId);
};

SignalingHandler.prototype.leaveRoom = function leaveRoom () {
	this.socket.close();
};

SignalingHandler.prototype.signal = function signal (method, params) {
	var messageObject = {
		method: method,
		params: params,
	};
	this.socket.send(JSON.stringify(messageObject));
};

var iceServers = [
  {'urls': ['stun:stun.services.mozilla.com']},
  {'urls': ['stun:stun.l.google.com:19302']} ];

/*
	Notes:
  * An RTCPeerConnection is an object used to send and receive streams between two clients.
  * An RTCPeerConnection when created tries to find ice candidates (a way for another client to connect us).
  * An external messaging channel is needed to relay ice information between clients.
	* When a client receives an external ice candidate it should be added to the corresponding RTCPeerConnection to allow the clients to connect.
	*
*/

var offerOptions = {
	// New spec states offerToReceiveAudio/Video are of type long (due to
	// having to tell how many "m" lines to generate).
	// http://w3c.github.io/webrtc-pc/#idl-def-RTCOfferAnswerOptions.
	offerToReceiveAudio: 1,
	offerToReceiveVideo: 1,
};


var BobPeerConnection = function BobPeerConnection(config, connectionOffer) {
	var this$1 = this;

	var rtcPeerConnectionConfig = {
		'iceServers': config && config.iceServers ? config.iceServers : iceServers,
	};
	this.config = config;
	this.isCaller = !connectionOffer;
	this.iceCandidates = [];
	this.streams = [];
	this.dataChannels = [];
	this.onicecandidate = config && config.onicecandidate ? config.onicecandidate : function () {};
	this.onoffer = config && config.onoffer ? config.onoffer : function () {};
	this.onanswer = config && config.onanswer ? config.onanswer : function () {};
	this.onaddstream = config && config.onaddstream ? config.onaddstream : function () {};
	this.ondatachannel = config && config.ondatachannel ? config.ondatachannel : function () {};


	var connection = { 'optional': [{'DtlsSrtpKeyAgreement': true}, {'RtpDataChannels': true }] };

	this.peerConnection = new RTCPeerConnection(rtcPeerConnectionConfig, connection);
	this.defaultDataChannel = this.peerConnection.createDataChannel('defaultChannel');
	this.peerConnection.onicecandidate = function (iceCandidate) {
		this$1.iceCandidates.push(iceCandidate);
		console.log('Got iceCandidate: ', iceCandidate);
		this$1.onicecandidate(iceCandidate);
	};

	this.peerConnection.onaddstream = function (event) {
		this$1.streams.push(event);
		console.log('Got stream:', event);
		this$1.onaddstream(event);
	};

	this.peerConnection.oniceconnectionstatechange = function (event) {
		console.log('oniceconnectionstatechange:',this$1.peerConnection.iceConnectionState, event);
	};
	this.peerConnection.onicegatheringstatechange = function (event) {
		console.log('onicegatheringstatechange:', this$1.peerConnection.iceGatheringState, event);
	};
	this.peerConnection.onnegotiationneeded = function (event) {
		console.log('onnegotiationneeded:', event);

		if (this$1.isCaller) {
			this$1._localDescription = this$1.peerConnection.createOffer(offerOptions)
			.then(function (localDescription) {
				this$1.peerConnection.setLocalDescription(localDescription);
				console.log('local description:', localDescription);
				this$1.onoffer(localDescription);
			})
			.catch(function (err) {
				console.log('local description ERROR:', err);
			});
		}

	};
	this.peerConnection.onsignalingstatechange = function (event) {
		console.log('onsignalingstatechange:', this$1.peerConnection.signalingState, event);
	};
	this.peerConnection.onremovestream = function (event) {
		console.log('onremovestream:', event);
	};



	this.peerConnection.ondatachannel = function (event) {
		this$1.dataChannels.push(event);
		console.log('Got data channel:', event);

		var dataChannel = event.channel;
		dataChannel.onopen = function () {
			console.log('Data channel open!');
		};
		dataChannel.onclose = function () {
			console.log('Data channel closed!');
		};
		dataChannel.onmessge = function (message) {
			console.log('Data channel message!', message);
		};

		this$1.ondatachannel(event);
	};



	if (this.isCaller) {
		this._localDescription = this.peerConnection.createOffer(offerOptions)
		.then(function (localDescription) {
			this$1.peerConnection.setLocalDescription(localDescription);
			console.log('local description:', localDescription);
			this$1.onoffer(localDescription);
		})
		.catch(function (err) {
			console.log('local description ERROR:', err);
		});
	} else {
		this.setRemoteDescription(connectionOffer);
	}
};

// readonly
BobPeerConnection.prototype.getLocalDescription = function getLocalDescription () {
	return this._localDescription;
};

BobPeerConnection.prototype.getRemoteDescription = function getRemoteDescription () {
	return this._remoteDescription;
};

BobPeerConnection.prototype.setRemoteDescription = function setRemoteDescription (description) {
		var this$1 = this;

	this._remoteDescription = description;
	this.peerConnection.setRemoteDescription(description);

	if (!this.isCaller) {
		this._localDescription = this.peerConnection.createAnswer(offerOptions)
		.then(function (localDescription) {
			this$1.peerConnection.setLocalDescription(localDescription);
			console.log('local description:', localDescription);
			this$1.onanswer(localDescription);
		})
		.catch(function (err) {
			console.log('local description ERROR:', err);
		});
	}

	// this.dataChannel = this.peerConnection.createDataChannel('sampleChannel', null);
};

// enum PEER_EVENT {
// 	/*
// 	 * The peer is trying to send a media stream to you. The event will carry a
// 	 * Promise as its data for you to resolve or reject depending if you want to
// 	 * accept the media stream or not.
// 	 */
// 	RECEIVE_MEDIASTREAM: 'RECEIVE_MEDIASTREAM';
// 	/*
// 	 * The peer sends a notification consisting of an event name together with
// 	 * any type of data, be it a literal, array or object.
// 	 */
// 	RECEIVE_NOTIFICATION: 'RECEIVE_NOTIFICATION';
// }


/*
 * Represents a connected peer.
 * You may message the peer or send your streams to it.
 * The peer also emits events when it is trying to message you or sent it's
 * streams to you.
 *
 * The peer emits events when it wants to communicate with you. For event
 * descriptions @see PEER_EVENT.
 */
var Peer = function Peer(config, bobrtc, connectionOffer) {
	var this$1 = this;

	this.config = config;
	this.bobrtc = bobrtc; // Will be used to get the signaling handler
	this.id = config.id;
	this.name = null;
	this.availableStreams = config.streams; // Streams that the peer is capable of sending
	this.capabilities = {};

	var peerConnectionConfig = {
		onicecandidate: function (event) {
			console.log('Send ICE:', event);
			if (event.candidate) {
				this$1.notify('ice', [event.candidate]);
			}
		},
		onoffer: function (offer) {
			console.log('Send Offer:', offer);
			this$1.notify('offer', [offer]);
		},
		onanswer: function (answer) {
			console.log('Send Answer:', answer);
			this$1.notify('answer', [answer]);
		},
		ondatachannel: function (datachannel) {
			console.log('Got Data Channel:', datachannel);
		},
	};
	var peerConnection = new BobPeerConnection(peerConnectionConfig, connectionOffer);
	this.peerConnection = peerConnection;
};

/*
	 * Sends an event to the peer through the server.
	 * This should be used to send application specific actions.
	 * Should not be used to send chat messages!
	 * The peer will receive the event by adding an event listener to the Peer
	 * instance representing you.
	 *
	 * @param event The name of the event
	 * @param data Whatever payload you want to sent to the peer
	 */
Peer.prototype.notify = function notify (method, params) {
	// Sends a message to the peer but through the connection server, no sensitive information should be passed through this method.
	var messageParams = [
		this.id,
		JSON.stringify({
			method: ("peer:" + method),
			params: [this.bobrtc.me.id].concat(params),
		}) ];
	this.bobrtc.notify('message', messageParams);
 };
// request(method, params) {
// // Sends a message to the peer but through the connection server, no sensitive information should be passed through this method.
// const messageData = {
// 	peer: this.id,
// 	method,
// 	data,
// };
// return this.bobrtc.request(SERVER_METHODS.PEER_MESSAGE, messageData);
// }

Peer.prototype.sendTCPDataStream = function sendTCPDataStream (dataStream) {

};

Peer.prototype.sendUDPDataStream = function sendUDPDataStream (dataStream) {

};

  /*
	 * Starts streaming your media stream to the peer.
	 * @param mediaStream Any type of WebRTC media stream (Video, Audio,
	 * ScreenCapture, TabCapture)
   *
	 * The peer will receive an event giving them the possibility to accept the
	 * incoming stream. If they do accept the stream the returned promise will
	 * resolve. If they decline the stream the promise will be rejected.
	 */
Peer.prototype.sendMediaStream = function sendMediaStream (mediaStream) {
	// Create RTCPeerConnection
	var bobPeerOutConnection = new BobPeerOutConnection(mediaStream);
	bobPeerOutConnection.getLocalDescription().then(function (localDescription) {
		// Send offer to peer
		request('offer', JSON.stringify({ "sdp": desc })).then(function (remoteDescription) {
			bobPeerOutConnection.setRemoteDescription(remoteDescription);
		});
	});
	this._currentPeerConnections.push(bobPeerOutConnection);
	return Promise.resolve();
};

  /*
	 * Stops the transmission of the provided media stream to that specific peer.
	 * @param mediaStream The stream you want to stop.
	 */
Peer.prototype.stopSendingMediaStream = function stopSendingMediaStream (mediaStream) {
	return Promise.resolve();
};

// Unique ID creation requires a high quality random # generator.  In the
// browser this is a little complicated due to unknown quality of Math.random()
// and inconsistent support for the `crypto` API.  We do the best we can via
// feature-detection
var rng$1;

var crypto = commonjsGlobal.crypto || commonjsGlobal.msCrypto; // for IE 11
if (crypto && crypto.getRandomValues) {
  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
  var rnds8 = new Uint8Array(16); // eslint-disable-line no-undef
  rng$1 = function whatwgRNG() {
    crypto.getRandomValues(rnds8);
    return rnds8;
  };
}

if (!rng$1) {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var rnds = new Array(16);
  rng$1 = function() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) { r = Math.random() * 0x100000000; }
      rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return rnds;
  };
}

var rngBrowser = rng$1;

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i$1 = 0; i$1 < 256; ++i$1) {
  byteToHex[i$1] = (i$1 + 0x100).toString(16).substr(1);
}

function bytesToUuid$1(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  return bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

var bytesToUuid_1 = bytesToUuid$1;

var rng = rngBrowser;
var bytesToUuid = bytesToUuid_1;

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

// random #'s we need to init node and clockseq
var _seedBytes = rng();

// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
var _nodeId = [
  _seedBytes[0] | 0x01,
  _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
];

// Per 4.2.2, randomize (14 bit) clockseq
var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

// Previous uuid creation time
var _lastMSecs = 0;
var _lastNSecs = 0;

var rng$2 = rngBrowser;
var bytesToUuid$2 = bytesToUuid_1;

// enum SERVER_METHODS {
// 	PEER_MESSAGE: 'peerMessage';
// }




/*
 * BobRTC makes it easy for you to build Web Real Time Communication applications.
 * Bob abstracts away all of the hard parts where you have to exchange
 * configuration parameters and use your own signaling server (you can specify
 * your own though).
 *
 * Bob connects you to a virtual room together with other peers which you can choose to
 * send your media streams or pure data streams to. All communication sent using
 * the Peer object is completely P2P and will never ever end up on our servers.
 * You and your activities are anonymous to us.



 Overview

 # Server
 Just handles simple connection info between clients.

 # Client/Peer
 Connects to the server to broadcast its presense and get info about other
 clients. All other information are sent directly peer to peer and will
 never end up on the server itself.

 * Peer to peer data connection
 The end goal for the communication with the server is to setup a peer to peer
 data connection between all peers in the joined room on the server. This
 channel is then used for creating and negotiating more WebRTC channels with
 media streams, file streams etc.

 * Peer to peer

 */
var BobRTC = function BobRTC(masterServerURL, signalingHandler) {
	var this$1 = this;

	this.masterServerURL = masterServerURL;
	this.peers = [];
	this.me = {
		id: null,
		name: null,
	};
	this.roomConfig = null;
	//this.messageQueue = new MessageQueue();
	this.signalingHandler = signalingHandler ? signalingHandler : new SignalingHandler(masterServerURL);

	this.signalingHandler.onSignal = function (data) {
		// Wisper message
		try {
			var method = data.method;
			var params = data.params;
			this$1._signalingMethods[method].apply(null, params);
		} catch (err) {
			console.log(err);
		}

		// Server says!
		//console.log('Server says: ' + JSON.stringify(data));
	};

	this._signalingMethods = {
		'me': function (info) {
			this$1.me.id = info.id;
			console.log('My server assigned id is: ', this$1.me.id);
		},
		// All peers connected to the server at the moment
		'peers': function (peers) {
			var filteredPeers = peers.filter(function (peer) { return (peer.id !== this$1.me.id); });

			for (var i = 0; i < filteredPeers.length; i++) {
				var peerInfo = filteredPeers[i];
				var config = {
					id: peerInfo.id,
				};
				var signalPeer = new Peer(config, this$1);
				this$1.peers.push(signalPeer);
			}
			console.log('Got list of peers: ', peers);
		},
		// Updated peer
		'peer:update': function (peerId, params) {

		},
		// // Disconnected peer
		// 'peer:~': (peerId) => {
      //
		// },
		// Peer Offer
		'peer:offer': function (peerId, offer) {
			console.log('Got offer:');
			var remoteDescription = new RTCSessionDescription(offer);
			var peer = this$1.peers.find(function (peer) { return (peer.id === peerId); });
			if (peer) {
				peer.peerConnection.setRemoteDescription(remoteDescription);
				return;
			}

			var config = {
				id: peerId,
			};
			var signalPeer = new Peer(config, this$1, remoteDescription);
			this$1.peers.push(signalPeer);
		},
		// Peer Answer
		'peer:answer': function (peerId, answer) {
			console.log('Got answer:');
			var peer = this$1.peers.find(function (peer) { return (peer.id === peerId); });
			if (peer) {
				peer.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
			}
		},
		// Peer ICE
		'peer:ice': function (peerId, ice) {
			console.log('Got ice:');
			var peer = this$1.peers.find(function (peer) { return (peer.id === peerId); });
			if (peer) {
				peer.peerConnection.peerConnection.addIceCandidate(new RTCIceCandidate(ice));
			}
		},
	};
};

/*
	 * Actions
	 */
BobRTC.prototype.connect = function connect () {
	// Connect to master server
	return Promise.resolve();
};

BobRTC.prototype.disconnect = function disconnect () {
	// Disconnect from master server
	return Promise.resolve();
};

BobRTC.prototype.joinRoom = function joinRoom (room) {
	// Joins a room
	return this.signalingHandler.joinRoom(room);
};

BobRTC.prototype.leaveRoom = function leaveRoom () {
	return this.signalingHandler.leaveRoom();
};

BobRTC.prototype.getPeers = function getPeers () {
	// Get all peers in this room
	return this.peers; // TODO deep copy the array?
};

BobRTC.prototype.getMe = function getMe () {
	// Get the peer representing you
	return Object.assign({}, this.me); // TODO Deep copy?
};

/*
	 * Sends an RPC message to the server.
	 * This should be used to send application specific actions.
	 * Should not be used to send chat messages!
	 *
	 * @param method The name of the RPC method
	 * @param data Whatever payload you want to sent to the peer
	 */
BobRTC.prototype.notify = function notify (method, data) {
	// Sends a message to the connection server, no sensitive information should be passed through this method.
	this.signalingHandler.signal(method, data);
};

/*
	 * Sends an RPC request to the server.
	 * This should be used to send application specific actions.
	 * Should not be used to send chat messages!
	 *
	 * @param method The name of the RPC method
	 * @param data Whatever payload you want to sent to the peer
	 */
BobRTC.prototype.request = function request (method, data) {
		var this$1 = this;

	// Sends a message to the connection server, no sensitive information should be passed through this method.
	return new Promise(function (resolve, reject) {
		this$1.signalingHandler.signal(method, data);
	});
};

// import Counter from './counter'
// import counter from '../reducers/counter'

var store = createStore(peers);

var bobrtc = new BobRTC('10.129.5.150');

window.bobrtc = bobrtc;

var App = (function (Component$$1) {
  function App() {
    var this$1 = this;

    store.subscribe(function () {
      this$1.setState({ peers: store.getState() });
    });
    // Get default state
    this.setState({ peers: store.getState() });

  }

  if ( Component$$1 ) App.__proto__ = Component$$1;
  App.prototype = Object.create( Component$$1 && Component$$1.prototype );
  App.prototype.constructor = App;

  App.prototype.render = function render () {

    return (
      h( 'div', null,
        h( 'div', { onClick: function (){
          navigator.getUserMedia({video:true}, function (media) {
            window.camerastream = media;
            store.dispatch({ type: 'ME_MEDIA', media: media });
          }, function (err) {
            console.log(err);
          });
        } }, " Start Camera "),
        h( Logo, null ), "// ", h( MeStreamView, { me: this.state.peers.me }),
        this.state.peers.peers.map(function (peer) { return (
          h( PeerStreamView, { peer: peer })
        ); })
      )
    )
  };

  return App;
}(Component$1));

window.h = h$1;

render$2(h$1( App, null ), document.querySelector('[data-js="main"]'));

}());
