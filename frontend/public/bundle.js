
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = key && { [key]: value };
            const child_ctx = assign(assign({}, info.ctx), info.resolved);
            const block = type && (info.current = type)(child_ctx);
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                info.blocks[i] = null;
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                flush();
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = { [info.value]: promise };
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var page = createCommonjsModule(function (module, exports) {
    (function (global, factory) {
    	 module.exports = factory() ;
    }(commonjsGlobal, (function () {
    var isarray = Array.isArray || function (arr) {
      return Object.prototype.toString.call(arr) == '[object Array]';
    };

    /**
     * Expose `pathToRegexp`.
     */
    var pathToRegexp_1 = pathToRegexp;
    var parse_1 = parse;
    var compile_1 = compile;
    var tokensToFunction_1 = tokensToFunction;
    var tokensToRegExp_1 = tokensToRegExp;

    /**
     * The main path matching regexp utility.
     *
     * @type {RegExp}
     */
    var PATH_REGEXP = new RegExp([
      // Match escaped characters that would otherwise appear in future matches.
      // This allows the user to escape special characters that won't transform.
      '(\\\\.)',
      // Match Express-style parameters and un-named parameters with a prefix
      // and optional suffixes. Matches appear as:
      //
      // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?", undefined]
      // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined, undefined]
      // "/*"            => ["/", undefined, undefined, undefined, undefined, "*"]
      '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^()])+)\\))?|\\(((?:\\\\.|[^()])+)\\))([+*?])?|(\\*))'
    ].join('|'), 'g');

    /**
     * Parse a string for the raw tokens.
     *
     * @param  {String} str
     * @return {Array}
     */
    function parse (str) {
      var tokens = [];
      var key = 0;
      var index = 0;
      var path = '';
      var res;

      while ((res = PATH_REGEXP.exec(str)) != null) {
        var m = res[0];
        var escaped = res[1];
        var offset = res.index;
        path += str.slice(index, offset);
        index = offset + m.length;

        // Ignore already escaped sequences.
        if (escaped) {
          path += escaped[1];
          continue
        }

        // Push the current path onto the tokens.
        if (path) {
          tokens.push(path);
          path = '';
        }

        var prefix = res[2];
        var name = res[3];
        var capture = res[4];
        var group = res[5];
        var suffix = res[6];
        var asterisk = res[7];

        var repeat = suffix === '+' || suffix === '*';
        var optional = suffix === '?' || suffix === '*';
        var delimiter = prefix || '/';
        var pattern = capture || group || (asterisk ? '.*' : '[^' + delimiter + ']+?');

        tokens.push({
          name: name || key++,
          prefix: prefix || '',
          delimiter: delimiter,
          optional: optional,
          repeat: repeat,
          pattern: escapeGroup(pattern)
        });
      }

      // Match any characters still remaining.
      if (index < str.length) {
        path += str.substr(index);
      }

      // If the path exists, push it onto the end.
      if (path) {
        tokens.push(path);
      }

      return tokens
    }

    /**
     * Compile a string to a template function for the path.
     *
     * @param  {String}   str
     * @return {Function}
     */
    function compile (str) {
      return tokensToFunction(parse(str))
    }

    /**
     * Expose a method for transforming tokens into the path function.
     */
    function tokensToFunction (tokens) {
      // Compile all the tokens into regexps.
      var matches = new Array(tokens.length);

      // Compile all the patterns before compilation.
      for (var i = 0; i < tokens.length; i++) {
        if (typeof tokens[i] === 'object') {
          matches[i] = new RegExp('^' + tokens[i].pattern + '$');
        }
      }

      return function (obj) {
        var path = '';
        var data = obj || {};

        for (var i = 0; i < tokens.length; i++) {
          var token = tokens[i];

          if (typeof token === 'string') {
            path += token;

            continue
          }

          var value = data[token.name];
          var segment;

          if (value == null) {
            if (token.optional) {
              continue
            } else {
              throw new TypeError('Expected "' + token.name + '" to be defined')
            }
          }

          if (isarray(value)) {
            if (!token.repeat) {
              throw new TypeError('Expected "' + token.name + '" to not repeat, but received "' + value + '"')
            }

            if (value.length === 0) {
              if (token.optional) {
                continue
              } else {
                throw new TypeError('Expected "' + token.name + '" to not be empty')
              }
            }

            for (var j = 0; j < value.length; j++) {
              segment = encodeURIComponent(value[j]);

              if (!matches[i].test(segment)) {
                throw new TypeError('Expected all "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
              }

              path += (j === 0 ? token.prefix : token.delimiter) + segment;
            }

            continue
          }

          segment = encodeURIComponent(value);

          if (!matches[i].test(segment)) {
            throw new TypeError('Expected "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
          }

          path += token.prefix + segment;
        }

        return path
      }
    }

    /**
     * Escape a regular expression string.
     *
     * @param  {String} str
     * @return {String}
     */
    function escapeString (str) {
      return str.replace(/([.+*?=^!:${}()[\]|\/])/g, '\\$1')
    }

    /**
     * Escape the capturing group by escaping special characters and meaning.
     *
     * @param  {String} group
     * @return {String}
     */
    function escapeGroup (group) {
      return group.replace(/([=!:$\/()])/g, '\\$1')
    }

    /**
     * Attach the keys as a property of the regexp.
     *
     * @param  {RegExp} re
     * @param  {Array}  keys
     * @return {RegExp}
     */
    function attachKeys (re, keys) {
      re.keys = keys;
      return re
    }

    /**
     * Get the flags for a regexp from the options.
     *
     * @param  {Object} options
     * @return {String}
     */
    function flags (options) {
      return options.sensitive ? '' : 'i'
    }

    /**
     * Pull out keys from a regexp.
     *
     * @param  {RegExp} path
     * @param  {Array}  keys
     * @return {RegExp}
     */
    function regexpToRegexp (path, keys) {
      // Use a negative lookahead to match only capturing groups.
      var groups = path.source.match(/\((?!\?)/g);

      if (groups) {
        for (var i = 0; i < groups.length; i++) {
          keys.push({
            name: i,
            prefix: null,
            delimiter: null,
            optional: false,
            repeat: false,
            pattern: null
          });
        }
      }

      return attachKeys(path, keys)
    }

    /**
     * Transform an array into a regexp.
     *
     * @param  {Array}  path
     * @param  {Array}  keys
     * @param  {Object} options
     * @return {RegExp}
     */
    function arrayToRegexp (path, keys, options) {
      var parts = [];

      for (var i = 0; i < path.length; i++) {
        parts.push(pathToRegexp(path[i], keys, options).source);
      }

      var regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options));

      return attachKeys(regexp, keys)
    }

    /**
     * Create a path regexp from string input.
     *
     * @param  {String} path
     * @param  {Array}  keys
     * @param  {Object} options
     * @return {RegExp}
     */
    function stringToRegexp (path, keys, options) {
      var tokens = parse(path);
      var re = tokensToRegExp(tokens, options);

      // Attach keys back to the regexp.
      for (var i = 0; i < tokens.length; i++) {
        if (typeof tokens[i] !== 'string') {
          keys.push(tokens[i]);
        }
      }

      return attachKeys(re, keys)
    }

    /**
     * Expose a function for taking tokens and returning a RegExp.
     *
     * @param  {Array}  tokens
     * @param  {Array}  keys
     * @param  {Object} options
     * @return {RegExp}
     */
    function tokensToRegExp (tokens, options) {
      options = options || {};

      var strict = options.strict;
      var end = options.end !== false;
      var route = '';
      var lastToken = tokens[tokens.length - 1];
      var endsWithSlash = typeof lastToken === 'string' && /\/$/.test(lastToken);

      // Iterate over the tokens and create our regexp string.
      for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];

        if (typeof token === 'string') {
          route += escapeString(token);
        } else {
          var prefix = escapeString(token.prefix);
          var capture = token.pattern;

          if (token.repeat) {
            capture += '(?:' + prefix + capture + ')*';
          }

          if (token.optional) {
            if (prefix) {
              capture = '(?:' + prefix + '(' + capture + '))?';
            } else {
              capture = '(' + capture + ')?';
            }
          } else {
            capture = prefix + '(' + capture + ')';
          }

          route += capture;
        }
      }

      // In non-strict mode we allow a slash at the end of match. If the path to
      // match already ends with a slash, we remove it for consistency. The slash
      // is valid at the end of a path match, not in the middle. This is important
      // in non-ending mode, where "/test/" shouldn't match "/test//route".
      if (!strict) {
        route = (endsWithSlash ? route.slice(0, -2) : route) + '(?:\\/(?=$))?';
      }

      if (end) {
        route += '$';
      } else {
        // In non-ending mode, we need the capturing groups to match as much as
        // possible by using a positive lookahead to the end or next path segment.
        route += strict && endsWithSlash ? '' : '(?=\\/|$)';
      }

      return new RegExp('^' + route, flags(options))
    }

    /**
     * Normalize the given path string, returning a regular expression.
     *
     * An empty array can be passed in for the keys, which will hold the
     * placeholder key descriptions. For example, using `/user/:id`, `keys` will
     * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
     *
     * @param  {(String|RegExp|Array)} path
     * @param  {Array}                 [keys]
     * @param  {Object}                [options]
     * @return {RegExp}
     */
    function pathToRegexp (path, keys, options) {
      keys = keys || [];

      if (!isarray(keys)) {
        options = keys;
        keys = [];
      } else if (!options) {
        options = {};
      }

      if (path instanceof RegExp) {
        return regexpToRegexp(path, keys)
      }

      if (isarray(path)) {
        return arrayToRegexp(path, keys, options)
      }

      return stringToRegexp(path, keys, options)
    }

    pathToRegexp_1.parse = parse_1;
    pathToRegexp_1.compile = compile_1;
    pathToRegexp_1.tokensToFunction = tokensToFunction_1;
    pathToRegexp_1.tokensToRegExp = tokensToRegExp_1;

    /**
       * Module dependencies.
       */

      

      /**
       * Short-cuts for global-object checks
       */

      var hasDocument = ('undefined' !== typeof document);
      var hasWindow = ('undefined' !== typeof window);
      var hasHistory = ('undefined' !== typeof history);
      var hasProcess = typeof process !== 'undefined';

      /**
       * Detect click event
       */
      var clickEvent = hasDocument && document.ontouchstart ? 'touchstart' : 'click';

      /**
       * To work properly with the URL
       * history.location generated polyfill in https://github.com/devote/HTML5-History-API
       */

      var isLocation = hasWindow && !!(window.history.location || window.location);

      /**
       * The page instance
       * @api private
       */
      function Page() {
        // public things
        this.callbacks = [];
        this.exits = [];
        this.current = '';
        this.len = 0;

        // private things
        this._decodeURLComponents = true;
        this._base = '';
        this._strict = false;
        this._running = false;
        this._hashbang = false;

        // bound functions
        this.clickHandler = this.clickHandler.bind(this);
        this._onpopstate = this._onpopstate.bind(this);
      }

      /**
       * Configure the instance of page. This can be called multiple times.
       *
       * @param {Object} options
       * @api public
       */

      Page.prototype.configure = function(options) {
        var opts = options || {};

        this._window = opts.window || (hasWindow && window);
        this._decodeURLComponents = opts.decodeURLComponents !== false;
        this._popstate = opts.popstate !== false && hasWindow;
        this._click = opts.click !== false && hasDocument;
        this._hashbang = !!opts.hashbang;

        var _window = this._window;
        if(this._popstate) {
          _window.addEventListener('popstate', this._onpopstate, false);
        } else if(hasWindow) {
          _window.removeEventListener('popstate', this._onpopstate, false);
        }

        if (this._click) {
          _window.document.addEventListener(clickEvent, this.clickHandler, false);
        } else if(hasDocument) {
          _window.document.removeEventListener(clickEvent, this.clickHandler, false);
        }

        if(this._hashbang && hasWindow && !hasHistory) {
          _window.addEventListener('hashchange', this._onpopstate, false);
        } else if(hasWindow) {
          _window.removeEventListener('hashchange', this._onpopstate, false);
        }
      };

      /**
       * Get or set basepath to `path`.
       *
       * @param {string} path
       * @api public
       */

      Page.prototype.base = function(path) {
        if (0 === arguments.length) return this._base;
        this._base = path;
      };

      /**
       * Gets the `base`, which depends on whether we are using History or
       * hashbang routing.

       * @api private
       */
      Page.prototype._getBase = function() {
        var base = this._base;
        if(!!base) return base;
        var loc = hasWindow && this._window && this._window.location;

        if(hasWindow && this._hashbang && loc && loc.protocol === 'file:') {
          base = loc.pathname;
        }

        return base;
      };

      /**
       * Get or set strict path matching to `enable`
       *
       * @param {boolean} enable
       * @api public
       */

      Page.prototype.strict = function(enable) {
        if (0 === arguments.length) return this._strict;
        this._strict = enable;
      };


      /**
       * Bind with the given `options`.
       *
       * Options:
       *
       *    - `click` bind to click events [true]
       *    - `popstate` bind to popstate [true]
       *    - `dispatch` perform initial dispatch [true]
       *
       * @param {Object} options
       * @api public
       */

      Page.prototype.start = function(options) {
        var opts = options || {};
        this.configure(opts);

        if (false === opts.dispatch) return;
        this._running = true;

        var url;
        if(isLocation) {
          var window = this._window;
          var loc = window.location;

          if(this._hashbang && ~loc.hash.indexOf('#!')) {
            url = loc.hash.substr(2) + loc.search;
          } else if (this._hashbang) {
            url = loc.search + loc.hash;
          } else {
            url = loc.pathname + loc.search + loc.hash;
          }
        }

        this.replace(url, null, true, opts.dispatch);
      };

      /**
       * Unbind click and popstate event handlers.
       *
       * @api public
       */

      Page.prototype.stop = function() {
        if (!this._running) return;
        this.current = '';
        this.len = 0;
        this._running = false;

        var window = this._window;
        this._click && window.document.removeEventListener(clickEvent, this.clickHandler, false);
        hasWindow && window.removeEventListener('popstate', this._onpopstate, false);
        hasWindow && window.removeEventListener('hashchange', this._onpopstate, false);
      };

      /**
       * Show `path` with optional `state` object.
       *
       * @param {string} path
       * @param {Object=} state
       * @param {boolean=} dispatch
       * @param {boolean=} push
       * @return {!Context}
       * @api public
       */

      Page.prototype.show = function(path, state, dispatch, push) {
        var ctx = new Context(path, state, this),
          prev = this.prevContext;
        this.prevContext = ctx;
        this.current = ctx.path;
        if (false !== dispatch) this.dispatch(ctx, prev);
        if (false !== ctx.handled && false !== push) ctx.pushState();
        return ctx;
      };

      /**
       * Goes back in the history
       * Back should always let the current route push state and then go back.
       *
       * @param {string} path - fallback path to go back if no more history exists, if undefined defaults to page.base
       * @param {Object=} state
       * @api public
       */

      Page.prototype.back = function(path, state) {
        var page = this;
        if (this.len > 0) {
          var window = this._window;
          // this may need more testing to see if all browsers
          // wait for the next tick to go back in history
          hasHistory && window.history.back();
          this.len--;
        } else if (path) {
          setTimeout(function() {
            page.show(path, state);
          });
        } else {
          setTimeout(function() {
            page.show(page._getBase(), state);
          });
        }
      };

      /**
       * Register route to redirect from one path to other
       * or just redirect to another route
       *
       * @param {string} from - if param 'to' is undefined redirects to 'from'
       * @param {string=} to
       * @api public
       */
      Page.prototype.redirect = function(from, to) {
        var inst = this;

        // Define route from a path to another
        if ('string' === typeof from && 'string' === typeof to) {
          page.call(this, from, function(e) {
            setTimeout(function() {
              inst.replace(/** @type {!string} */ (to));
            }, 0);
          });
        }

        // Wait for the push state and replace it with another
        if ('string' === typeof from && 'undefined' === typeof to) {
          setTimeout(function() {
            inst.replace(from);
          }, 0);
        }
      };

      /**
       * Replace `path` with optional `state` object.
       *
       * @param {string} path
       * @param {Object=} state
       * @param {boolean=} init
       * @param {boolean=} dispatch
       * @return {!Context}
       * @api public
       */


      Page.prototype.replace = function(path, state, init, dispatch) {
        var ctx = new Context(path, state, this),
          prev = this.prevContext;
        this.prevContext = ctx;
        this.current = ctx.path;
        ctx.init = init;
        ctx.save(); // save before dispatching, which may redirect
        if (false !== dispatch) this.dispatch(ctx, prev);
        return ctx;
      };

      /**
       * Dispatch the given `ctx`.
       *
       * @param {Context} ctx
       * @api private
       */

      Page.prototype.dispatch = function(ctx, prev) {
        var i = 0, j = 0, page = this;

        function nextExit() {
          var fn = page.exits[j++];
          if (!fn) return nextEnter();
          fn(prev, nextExit);
        }

        function nextEnter() {
          var fn = page.callbacks[i++];

          if (ctx.path !== page.current) {
            ctx.handled = false;
            return;
          }
          if (!fn) return unhandled.call(page, ctx);
          fn(ctx, nextEnter);
        }

        if (prev) {
          nextExit();
        } else {
          nextEnter();
        }
      };

      /**
       * Register an exit route on `path` with
       * callback `fn()`, which will be called
       * on the previous context when a new
       * page is visited.
       */
      Page.prototype.exit = function(path, fn) {
        if (typeof path === 'function') {
          return this.exit('*', path);
        }

        var route = new Route(path, null, this);
        for (var i = 1; i < arguments.length; ++i) {
          this.exits.push(route.middleware(arguments[i]));
        }
      };

      /**
       * Handle "click" events.
       */

      /* jshint +W054 */
      Page.prototype.clickHandler = function(e) {
        if (1 !== this._which(e)) return;

        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        if (e.defaultPrevented) return;

        // ensure link
        // use shadow dom when available if not, fall back to composedPath()
        // for browsers that only have shady
        var el = e.target;
        var eventPath = e.path || (e.composedPath ? e.composedPath() : null);

        if(eventPath) {
          for (var i = 0; i < eventPath.length; i++) {
            if (!eventPath[i].nodeName) continue;
            if (eventPath[i].nodeName.toUpperCase() !== 'A') continue;
            if (!eventPath[i].href) continue;

            el = eventPath[i];
            break;
          }
        }

        // continue ensure link
        // el.nodeName for svg links are 'a' instead of 'A'
        while (el && 'A' !== el.nodeName.toUpperCase()) el = el.parentNode;
        if (!el || 'A' !== el.nodeName.toUpperCase()) return;

        // check if link is inside an svg
        // in this case, both href and target are always inside an object
        var svg = (typeof el.href === 'object') && el.href.constructor.name === 'SVGAnimatedString';

        // Ignore if tag has
        // 1. "download" attribute
        // 2. rel="external" attribute
        if (el.hasAttribute('download') || el.getAttribute('rel') === 'external') return;

        // ensure non-hash for the same path
        var link = el.getAttribute('href');
        if(!this._hashbang && this._samePath(el) && (el.hash || '#' === link)) return;

        // Check for mailto: in the href
        if (link && link.indexOf('mailto:') > -1) return;

        // check target
        // svg target is an object and its desired value is in .baseVal property
        if (svg ? el.target.baseVal : el.target) return;

        // x-origin
        // note: svg links that are not relative don't call click events (and skip page.js)
        // consequently, all svg links tested inside page.js are relative and in the same origin
        if (!svg && !this.sameOrigin(el.href)) return;

        // rebuild path
        // There aren't .pathname and .search properties in svg links, so we use href
        // Also, svg href is an object and its desired value is in .baseVal property
        var path = svg ? el.href.baseVal : (el.pathname + el.search + (el.hash || ''));

        path = path[0] !== '/' ? '/' + path : path;

        // strip leading "/[drive letter]:" on NW.js on Windows
        if (hasProcess && path.match(/^\/[a-zA-Z]:\//)) {
          path = path.replace(/^\/[a-zA-Z]:\//, '/');
        }

        // same page
        var orig = path;
        var pageBase = this._getBase();

        if (path.indexOf(pageBase) === 0) {
          path = path.substr(pageBase.length);
        }

        if (this._hashbang) path = path.replace('#!', '');

        if (pageBase && orig === path && (!isLocation || this._window.location.protocol !== 'file:')) {
          return;
        }

        e.preventDefault();
        this.show(orig);
      };

      /**
       * Handle "populate" events.
       * @api private
       */

      Page.prototype._onpopstate = (function () {
        var loaded = false;
        if ( ! hasWindow ) {
          return function () {};
        }
        if (hasDocument && document.readyState === 'complete') {
          loaded = true;
        } else {
          window.addEventListener('load', function() {
            setTimeout(function() {
              loaded = true;
            }, 0);
          });
        }
        return function onpopstate(e) {
          if (!loaded) return;
          var page = this;
          if (e.state) {
            var path = e.state.path;
            page.replace(path, e.state);
          } else if (isLocation) {
            var loc = page._window.location;
            page.show(loc.pathname + loc.search + loc.hash, undefined, undefined, false);
          }
        };
      })();

      /**
       * Event button.
       */
      Page.prototype._which = function(e) {
        e = e || (hasWindow && this._window.event);
        return null == e.which ? e.button : e.which;
      };

      /**
       * Convert to a URL object
       * @api private
       */
      Page.prototype._toURL = function(href) {
        var window = this._window;
        if(typeof URL === 'function' && isLocation) {
          return new URL(href, window.location.toString());
        } else if (hasDocument) {
          var anc = window.document.createElement('a');
          anc.href = href;
          return anc;
        }
      };

      /**
       * Check if `href` is the same origin.
       * @param {string} href
       * @api public
       */
      Page.prototype.sameOrigin = function(href) {
        if(!href || !isLocation) return false;

        var url = this._toURL(href);
        var window = this._window;

        var loc = window.location;

        /*
           When the port is the default http port 80 for http, or 443 for
           https, internet explorer 11 returns an empty string for loc.port,
           so we need to compare loc.port with an empty string if url.port
           is the default port 80 or 443.
           Also the comparition with `port` is changed from `===` to `==` because
           `port` can be a string sometimes. This only applies to ie11.
        */
        return loc.protocol === url.protocol &&
          loc.hostname === url.hostname &&
          (loc.port === url.port || loc.port === '' && (url.port == 80 || url.port == 443)); // jshint ignore:line
      };

      /**
       * @api private
       */
      Page.prototype._samePath = function(url) {
        if(!isLocation) return false;
        var window = this._window;
        var loc = window.location;
        return url.pathname === loc.pathname &&
          url.search === loc.search;
      };

      /**
       * Remove URL encoding from the given `str`.
       * Accommodates whitespace in both x-www-form-urlencoded
       * and regular percent-encoded form.
       *
       * @param {string} val - URL component to decode
       * @api private
       */
      Page.prototype._decodeURLEncodedURIComponent = function(val) {
        if (typeof val !== 'string') { return val; }
        return this._decodeURLComponents ? decodeURIComponent(val.replace(/\+/g, ' ')) : val;
      };

      /**
       * Create a new `page` instance and function
       */
      function createPage() {
        var pageInstance = new Page();

        function pageFn(/* args */) {
          return page.apply(pageInstance, arguments);
        }

        // Copy all of the things over. In 2.0 maybe we use setPrototypeOf
        pageFn.callbacks = pageInstance.callbacks;
        pageFn.exits = pageInstance.exits;
        pageFn.base = pageInstance.base.bind(pageInstance);
        pageFn.strict = pageInstance.strict.bind(pageInstance);
        pageFn.start = pageInstance.start.bind(pageInstance);
        pageFn.stop = pageInstance.stop.bind(pageInstance);
        pageFn.show = pageInstance.show.bind(pageInstance);
        pageFn.back = pageInstance.back.bind(pageInstance);
        pageFn.redirect = pageInstance.redirect.bind(pageInstance);
        pageFn.replace = pageInstance.replace.bind(pageInstance);
        pageFn.dispatch = pageInstance.dispatch.bind(pageInstance);
        pageFn.exit = pageInstance.exit.bind(pageInstance);
        pageFn.configure = pageInstance.configure.bind(pageInstance);
        pageFn.sameOrigin = pageInstance.sameOrigin.bind(pageInstance);
        pageFn.clickHandler = pageInstance.clickHandler.bind(pageInstance);

        pageFn.create = createPage;

        Object.defineProperty(pageFn, 'len', {
          get: function(){
            return pageInstance.len;
          },
          set: function(val) {
            pageInstance.len = val;
          }
        });

        Object.defineProperty(pageFn, 'current', {
          get: function(){
            return pageInstance.current;
          },
          set: function(val) {
            pageInstance.current = val;
          }
        });

        // In 2.0 these can be named exports
        pageFn.Context = Context;
        pageFn.Route = Route;

        return pageFn;
      }

      /**
       * Register `path` with callback `fn()`,
       * or route `path`, or redirection,
       * or `page.start()`.
       *
       *   page(fn);
       *   page('*', fn);
       *   page('/user/:id', load, user);
       *   page('/user/' + user.id, { some: 'thing' });
       *   page('/user/' + user.id);
       *   page('/from', '/to')
       *   page();
       *
       * @param {string|!Function|!Object} path
       * @param {Function=} fn
       * @api public
       */

      function page(path, fn) {
        // <callback>
        if ('function' === typeof path) {
          return page.call(this, '*', path);
        }

        // route <path> to <callback ...>
        if ('function' === typeof fn) {
          var route = new Route(/** @type {string} */ (path), null, this);
          for (var i = 1; i < arguments.length; ++i) {
            this.callbacks.push(route.middleware(arguments[i]));
          }
          // show <path> with [state]
        } else if ('string' === typeof path) {
          this['string' === typeof fn ? 'redirect' : 'show'](path, fn);
          // start [options]
        } else {
          this.start(path);
        }
      }

      /**
       * Unhandled `ctx`. When it's not the initial
       * popstate then redirect. If you wish to handle
       * 404s on your own use `page('*', callback)`.
       *
       * @param {Context} ctx
       * @api private
       */
      function unhandled(ctx) {
        if (ctx.handled) return;
        var current;
        var page = this;
        var window = page._window;

        if (page._hashbang) {
          current = isLocation && this._getBase() + window.location.hash.replace('#!', '');
        } else {
          current = isLocation && window.location.pathname + window.location.search;
        }

        if (current === ctx.canonicalPath) return;
        page.stop();
        ctx.handled = false;
        isLocation && (window.location.href = ctx.canonicalPath);
      }

      /**
       * Escapes RegExp characters in the given string.
       *
       * @param {string} s
       * @api private
       */
      function escapeRegExp(s) {
        return s.replace(/([.+*?=^!:${}()[\]|/\\])/g, '\\$1');
      }

      /**
       * Initialize a new "request" `Context`
       * with the given `path` and optional initial `state`.
       *
       * @constructor
       * @param {string} path
       * @param {Object=} state
       * @api public
       */

      function Context(path, state, pageInstance) {
        var _page = this.page = pageInstance || page;
        var window = _page._window;
        var hashbang = _page._hashbang;

        var pageBase = _page._getBase();
        if ('/' === path[0] && 0 !== path.indexOf(pageBase)) path = pageBase + (hashbang ? '#!' : '') + path;
        var i = path.indexOf('?');

        this.canonicalPath = path;
        var re = new RegExp('^' + escapeRegExp(pageBase));
        this.path = path.replace(re, '') || '/';
        if (hashbang) this.path = this.path.replace('#!', '') || '/';

        this.title = (hasDocument && window.document.title);
        this.state = state || {};
        this.state.path = path;
        this.querystring = ~i ? _page._decodeURLEncodedURIComponent(path.slice(i + 1)) : '';
        this.pathname = _page._decodeURLEncodedURIComponent(~i ? path.slice(0, i) : path);
        this.params = {};

        // fragment
        this.hash = '';
        if (!hashbang) {
          if (!~this.path.indexOf('#')) return;
          var parts = this.path.split('#');
          this.path = this.pathname = parts[0];
          this.hash = _page._decodeURLEncodedURIComponent(parts[1]) || '';
          this.querystring = this.querystring.split('#')[0];
        }
      }

      /**
       * Push state.
       *
       * @api private
       */

      Context.prototype.pushState = function() {
        var page = this.page;
        var window = page._window;
        var hashbang = page._hashbang;

        page.len++;
        if (hasHistory) {
            window.history.pushState(this.state, this.title,
              hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
        }
      };

      /**
       * Save the context state.
       *
       * @api public
       */

      Context.prototype.save = function() {
        var page = this.page;
        if (hasHistory) {
            page._window.history.replaceState(this.state, this.title,
              page._hashbang && this.path !== '/' ? '#!' + this.path : this.canonicalPath);
        }
      };

      /**
       * Initialize `Route` with the given HTTP `path`,
       * and an array of `callbacks` and `options`.
       *
       * Options:
       *
       *   - `sensitive`    enable case-sensitive routes
       *   - `strict`       enable strict matching for trailing slashes
       *
       * @constructor
       * @param {string} path
       * @param {Object=} options
       * @api private
       */

      function Route(path, options, page) {
        var _page = this.page = page || globalPage;
        var opts = options || {};
        opts.strict = opts.strict || _page._strict;
        this.path = (path === '*') ? '(.*)' : path;
        this.method = 'GET';
        this.regexp = pathToRegexp_1(this.path, this.keys = [], opts);
      }

      /**
       * Return route middleware with
       * the given callback `fn()`.
       *
       * @param {Function} fn
       * @return {Function}
       * @api public
       */

      Route.prototype.middleware = function(fn) {
        var self = this;
        return function(ctx, next) {
          if (self.match(ctx.path, ctx.params)) {
            ctx.routePath = self.path;
            return fn(ctx, next);
          }
          next();
        };
      };

      /**
       * Check if this route matches `path`, if so
       * populate `params`.
       *
       * @param {string} path
       * @param {Object} params
       * @return {boolean}
       * @api private
       */

      Route.prototype.match = function(path, params) {
        var keys = this.keys,
          qsIndex = path.indexOf('?'),
          pathname = ~qsIndex ? path.slice(0, qsIndex) : path,
          m = this.regexp.exec(decodeURIComponent(pathname));

        if (!m) return false;

        delete params[0];

        for (var i = 1, len = m.length; i < len; ++i) {
          var key = keys[i - 1];
          var val = this.page._decodeURLEncodedURIComponent(m[i]);
          if (val !== undefined || !(hasOwnProperty.call(params, key.name))) {
            params[key.name] = val;
          }
        }

        return true;
      };


      /**
       * Module exports.
       */

      var globalPage = createPage();
      var page_js = globalPage;
      var default_1 = globalPage;

    page_js.default = default_1;

    return page_js;

    })));
    });

    /* src/pages/components/Navbar.svelte generated by Svelte v3.12.1 */

    const file = "src/pages/components/Navbar.svelte";

    function create_fragment(ctx) {
    	var nav, a0, t_1, a1;

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			a0 = element("a");
    			a0.textContent = "Home";
    			t_1 = space();
    			a1 = element("a");
    			a1.textContent = "Seasons";
    			attr_dev(a0, "href", "/");
    			attr_dev(a0, "class", "svelte-om8dmp");
    			add_location(a0, file, 1, 2, 23);
    			attr_dev(a1, "href", "/seasons");
    			attr_dev(a1, "class", "svelte-om8dmp");
    			add_location(a1, file, 2, 2, 46);
    			attr_dev(nav, "class", "navbar svelte-om8dmp");
    			add_location(nav, file, 0, 0, 0);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, a0);
    			append_dev(nav, t_1);
    			append_dev(nav, a1);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(nav);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Navbar", options, id: create_fragment.name });
    	}
    }

    /* src/pages/family/Family.svelte generated by Svelte v3.12.1 */

    const file$1 = "src/pages/family/Family.svelte";

    function create_fragment$1(ctx) {
    	var div0, h30, t1, ul0, li0, a0, br0, t3, p0, t5, li1, a1, br1, t7, p1, t9, li2, a2, br2, t11, p2, t13, div1, h31, t15, ul1, li3, a3, br3, t17, p3, t19, li4, a4, br4, t21, p4, t23, li5, a5, br5, t25, p5, t27, div2, h32, t29, ul2, li6, a6, br6, t31, p6;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Sides";
    			t1 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "Sausage Balls (30 mins)";
    			br0 = element("br");
    			t3 = space();
    			p0 = element("p");
    			p0.textContent = "Savory sausage balls held together with bisquick and cheese";
    			t5 = space();
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "Biscuits (1 hour) ";
    			br1 = element("br");
    			t7 = space();
    			p1 = element("p");
    			p1.textContent = "Buttery biscuits make the perfect side to heavy Southern meals";
    			t9 = space();
    			li2 = element("li");
    			a2 = element("a");
    			a2.textContent = "Old Fashion Grits (1 hour) ";
    			br2 = element("br");
    			t11 = space();
    			p2 = element("p");
    			p2.textContent = "The secret recipe for cheesy old fashion grits";
    			t13 = space();
    			div1 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Mains";
    			t15 = space();
    			ul1 = element("ul");
    			li3 = element("li");
    			a3 = element("a");
    			a3.textContent = "Braised Beef with Sunday Gravy (4-5 hours)";
    			br3 = element("br");
    			t17 = space();
    			p3 = element("p");
    			p3.textContent = "Slow cooked beef served over mashed potatoes and topped with pickled\n        onions";
    			t19 = space();
    			li4 = element("li");
    			a4 = element("a");
    			a4.textContent = "Seared Chicken with White Wine Pan Sauce (45 minutes)";
    			br4 = element("br");
    			t21 = space();
    			p4 = element("p");
    			p4.textContent = "Seared pan chicken served with a buttery white wine pan sauce";
    			t23 = space();
    			li5 = element("li");
    			a5 = element("a");
    			a5.textContent = "Sweet Potato Soup (30 minutes)";
    			br5 = element("br");
    			t25 = space();
    			p5 = element("p");
    			p5.textContent = "A pureed sweet potato and carrot soup with warm curry powder notes.\n        Perfect for a cold winter day.";
    			t27 = space();
    			div2 = element("div");
    			h32 = element("h3");
    			h32.textContent = "Deserts";
    			t29 = space();
    			ul2 = element("ul");
    			li6 = element("li");
    			a6 = element("a");
    			a6.textContent = "Sweet Rolls";
    			br6 = element("br");
    			t31 = space();
    			p6 = element("p");
    			p6.textContent = "Classic cinnamon sweet rolls topped with gooey icing";
    			add_location(h30, file$1, 1, 2, 25);
    			attr_dev(a0, "href", "/sausage_balls");
    			add_location(a0, file$1, 4, 6, 62);
    			add_location(br0, file$1, 4, 58, 114);
    			add_location(p0, file$1, 5, 6, 127);
    			add_location(li0, file$1, 3, 4, 51);
    			attr_dev(a1, "href", "/biscuits");
    			add_location(a1, file$1, 8, 6, 219);
    			add_location(br1, file$1, 8, 48, 261);
    			add_location(p1, file$1, 9, 6, 274);
    			add_location(li1, file$1, 7, 4, 208);
    			attr_dev(a2, "href", "/grits");
    			add_location(a2, file$1, 12, 6, 369);
    			add_location(br2, file$1, 12, 54, 417);
    			add_location(p2, file$1, 13, 6, 430);
    			add_location(li2, file$1, 11, 4, 358);
    			add_location(ul0, file$1, 2, 2, 42);
    			attr_dev(div0, "class", "sections");
    			add_location(div0, file$1, 0, 0, 0);
    			add_location(h31, file$1, 18, 2, 534);
    			attr_dev(a3, "href", "/braised_beef");
    			add_location(a3, file$1, 21, 6, 571);
    			add_location(br3, file$1, 21, 76, 641);
    			add_location(p3, file$1, 23, 6, 660);
    			add_location(li3, file$1, 20, 4, 560);
    			attr_dev(a4, "href", "/chicken_pan");
    			add_location(a4, file$1, 29, 6, 792);
    			add_location(br4, file$1, 31, 7, 888);
    			add_location(p4, file$1, 32, 6, 901);
    			add_location(li4, file$1, 28, 4, 781);
    			attr_dev(a5, "href", "/sweet_potato_soup");
    			add_location(a5, file$1, 35, 6, 995);
    			add_location(br5, file$1, 35, 69, 1058);
    			add_location(p5, file$1, 36, 6, 1071);
    			add_location(li5, file$1, 34, 4, 984);
    			add_location(ul1, file$1, 19, 2, 551);
    			attr_dev(div1, "class", "sections");
    			add_location(div1, file$1, 17, 0, 509);
    			add_location(h32, file$1, 44, 2, 1251);
    			attr_dev(a6, "href", "/sweet_rolls");
    			add_location(a6, file$1, 47, 6, 1290);
    			add_location(br6, file$1, 47, 44, 1328);
    			add_location(p6, file$1, 48, 6, 1341);
    			add_location(li6, file$1, 46, 4, 1279);
    			add_location(ul2, file$1, 45, 2, 1270);
    			attr_dev(div2, "class", "sections");
    			add_location(div2, file$1, 43, 0, 1226);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, h30);
    			append_dev(div0, t1);
    			append_dev(div0, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a0);
    			append_dev(li0, br0);
    			append_dev(li0, t3);
    			append_dev(li0, p0);
    			append_dev(ul0, t5);
    			append_dev(ul0, li1);
    			append_dev(li1, a1);
    			append_dev(li1, br1);
    			append_dev(li1, t7);
    			append_dev(li1, p1);
    			append_dev(ul0, t9);
    			append_dev(ul0, li2);
    			append_dev(li2, a2);
    			append_dev(li2, br2);
    			append_dev(li2, t11);
    			append_dev(li2, p2);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h31);
    			append_dev(div1, t15);
    			append_dev(div1, ul1);
    			append_dev(ul1, li3);
    			append_dev(li3, a3);
    			append_dev(li3, br3);
    			append_dev(li3, t17);
    			append_dev(li3, p3);
    			append_dev(ul1, t19);
    			append_dev(ul1, li4);
    			append_dev(li4, a4);
    			append_dev(li4, br4);
    			append_dev(li4, t21);
    			append_dev(li4, p4);
    			append_dev(ul1, t23);
    			append_dev(ul1, li5);
    			append_dev(li5, a5);
    			append_dev(li5, br5);
    			append_dev(li5, t25);
    			append_dev(li5, p5);
    			insert_dev(target, t27, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h32);
    			append_dev(div2, t29);
    			append_dev(div2, ul2);
    			append_dev(ul2, li6);
    			append_dev(li6, a6);
    			append_dev(li6, br6);
    			append_dev(li6, t31);
    			append_dev(li6, p6);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div0);
    				detach_dev(t13);
    				detach_dev(div1);
    				detach_dev(t27);
    				detach_dev(div2);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    class Family extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$1, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Family", options, id: create_fragment$1.name });
    	}
    }

    /* src/pages/french/French.svelte generated by Svelte v3.12.1 */

    const file$2 = "src/pages/french/French.svelte";

    function create_fragment$2(ctx) {
    	var div0, h30, t1, ul0, li0, a0, br0, t3, p0, t5, li1, a1, br1, t7, p1, t9, li2, a2, br2, t11, p2, t13, div1, h31, t15, ul1, li3, a3, br3, t17, p3, t19, li4, a4, br4, t21, p4, t23, li5, a5, br5, t25, p5, t27, li6, a6, br6, t29, p6;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Sides";
    			t1 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "Baguette (5 hours) ";
    			br0 = element("br");
    			t3 = space();
    			p0 = element("p");
    			p0.textContent = "Fresh, fragrant and beautiful, there is nothing as satisfying as bread\n        straight from the oven.";
    			t5 = space();
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "French Onion Soup (45 minutes) ";
    			br1 = element("br");
    			t7 = space();
    			p1 = element("p");
    			p1.textContent = "As delicious as it is easy, this amazing soup is the perfect first\n        course";
    			t9 = space();
    			li2 = element("li");
    			a2 = element("a");
    			a2.textContent = "Roasted Eggplant (20 minutes) ";
    			br2 = element("br");
    			t11 = space();
    			p2 = element("p");
    			p2.textContent = "A simple side dish, eggplant pairs well with any protein";
    			t13 = space();
    			div1 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Mains";
    			t15 = space();
    			ul1 = element("ul");
    			li3 = element("li");
    			a3 = element("a");
    			a3.textContent = "Coq Au Vin (1.5 hours)";
    			br3 = element("br");
    			t17 = space();
    			p3 = element("p");
    			p3.textContent = "Braised chicken thighs flavored with red wine, bacon, and mushrooms";
    			t19 = space();
    			li4 = element("li");
    			a4 = element("a");
    			a4.textContent = "Poulet Chasseur (1.5 hours)";
    			br4 = element("br");
    			t21 = space();
    			p4 = element("p");
    			p4.textContent = "Braised chicken thighs flavored with white wine, fresh tarragon, and\n        mushrooms";
    			t23 = space();
    			li5 = element("li");
    			a5 = element("a");
    			a5.textContent = "Beef Bourguignon (4-5 hours)";
    			br5 = element("br");
    			t25 = space();
    			p5 = element("p");
    			p5.textContent = "Slow cooked beef served in a red wine, mushroom sauce";
    			t27 = space();
    			li6 = element("li");
    			a6 = element("a");
    			a6.textContent = "Cotelette de Porc (20-30 minutes)";
    			br6 = element("br");
    			t29 = space();
    			p6 = element("p");
    			p6.textContent = "From the Normandy region of France comes pork chop with a creamy apple\n        cider reduction sauce";
    			add_location(h30, file$2, 1, 2, 25);
    			attr_dev(a0, "href", "/baguette");
    			add_location(a0, file$2, 4, 6, 62);
    			add_location(br0, file$2, 4, 49, 105);
    			add_location(p0, file$2, 5, 6, 118);
    			add_location(li0, file$2, 3, 4, 51);
    			attr_dev(a1, "href", "/french_onion_soup");
    			add_location(a1, file$2, 11, 6, 269);
    			add_location(br1, file$2, 11, 70, 333);
    			add_location(p1, file$2, 12, 6, 346);
    			add_location(li1, file$2, 10, 4, 258);
    			attr_dev(a2, "href", "/roasted_eggplant");
    			add_location(a2, file$2, 18, 6, 476);
    			add_location(br2, file$2, 18, 68, 538);
    			add_location(p2, file$2, 19, 6, 551);
    			add_location(li2, file$2, 17, 4, 465);
    			add_location(ul0, file$2, 2, 2, 42);
    			attr_dev(div0, "class", "sections");
    			add_location(div0, file$2, 0, 0, 0);
    			add_location(h31, file$2, 24, 2, 665);
    			attr_dev(a3, "href", "/coq_au_vin");
    			add_location(a3, file$2, 27, 6, 702);
    			add_location(br3, file$2, 27, 54, 750);
    			add_location(p3, file$2, 28, 6, 763);
    			add_location(li3, file$2, 26, 4, 691);
    			attr_dev(a4, "href", "/poulet_chasseur");
    			add_location(a4, file$2, 31, 6, 863);
    			add_location(br4, file$2, 31, 64, 921);
    			add_location(p4, file$2, 32, 6, 934);
    			add_location(li4, file$2, 30, 4, 852);
    			attr_dev(a5, "href", "/beef_bourguignon");
    			add_location(a5, file$2, 38, 6, 1069);
    			add_location(br5, file$2, 38, 66, 1129);
    			add_location(p5, file$2, 39, 6, 1142);
    			add_location(li5, file$2, 37, 4, 1058);
    			attr_dev(a6, "href", "/cotelette_de_porc");
    			add_location(a6, file$2, 42, 6, 1228);
    			add_location(br6, file$2, 42, 72, 1294);
    			add_location(p6, file$2, 43, 6, 1307);
    			add_location(li6, file$2, 41, 4, 1217);
    			add_location(ul1, file$2, 25, 2, 682);
    			attr_dev(div1, "class", "sections");
    			add_location(div1, file$2, 23, 0, 640);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, h30);
    			append_dev(div0, t1);
    			append_dev(div0, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a0);
    			append_dev(li0, br0);
    			append_dev(li0, t3);
    			append_dev(li0, p0);
    			append_dev(ul0, t5);
    			append_dev(ul0, li1);
    			append_dev(li1, a1);
    			append_dev(li1, br1);
    			append_dev(li1, t7);
    			append_dev(li1, p1);
    			append_dev(ul0, t9);
    			append_dev(ul0, li2);
    			append_dev(li2, a2);
    			append_dev(li2, br2);
    			append_dev(li2, t11);
    			append_dev(li2, p2);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h31);
    			append_dev(div1, t15);
    			append_dev(div1, ul1);
    			append_dev(ul1, li3);
    			append_dev(li3, a3);
    			append_dev(li3, br3);
    			append_dev(li3, t17);
    			append_dev(li3, p3);
    			append_dev(ul1, t19);
    			append_dev(ul1, li4);
    			append_dev(li4, a4);
    			append_dev(li4, br4);
    			append_dev(li4, t21);
    			append_dev(li4, p4);
    			append_dev(ul1, t23);
    			append_dev(ul1, li5);
    			append_dev(li5, a5);
    			append_dev(li5, br5);
    			append_dev(li5, t25);
    			append_dev(li5, p5);
    			append_dev(ul1, t27);
    			append_dev(ul1, li6);
    			append_dev(li6, a6);
    			append_dev(li6, br6);
    			append_dev(li6, t29);
    			append_dev(li6, p6);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div0);
    				detach_dev(t13);
    				detach_dev(div1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$2.name, type: "component", source: "", ctx });
    	return block;
    }

    class French extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$2, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "French", options, id: create_fragment$2.name });
    	}
    }

    /* src/pages/central/Central.svelte generated by Svelte v3.12.1 */

    const file$3 = "src/pages/central/Central.svelte";

    function create_fragment$3(ctx) {
    	var div0, h30, t1, ul0, li0, a0, br0, t3, p0, t5, div1, h31, t7, ul1, li1, a1, br1, t9, p1, t11, li2, a2, br2, t13, p2, t15, div2, h32, t17, ul2, li3, a3, br3, t19, p3;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Sides";
    			t1 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "Kőrözött (30 mins)";
    			br0 = element("br");
    			t3 = space();
    			p0 = element("p");
    			p0.textContent = "Creamy Hungarian dip, best served with toasted bread or chips";
    			t5 = space();
    			div1 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Mains";
    			t7 = space();
    			ul1 = element("ul");
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "Chicken Paprikás with Nokedl (1.5 hours)";
    			br1 = element("br");
    			t9 = space();
    			p1 = element("p");
    			p1.textContent = "Creamy braised chicken legs served with traditional Hungarian noodles";
    			t11 = space();
    			li2 = element("li");
    			a2 = element("a");
    			a2.textContent = "Hungarian Pea Soup (45 minutes)";
    			br2 = element("br");
    			t13 = space();
    			p2 = element("p");
    			p2.textContent = "Delicious vegatarian soup with peas, carrots, turnips, and tarragon";
    			t15 = space();
    			div2 = element("div");
    			h32 = element("h3");
    			h32.textContent = "Deserts";
    			t17 = space();
    			ul2 = element("ul");
    			li3 = element("li");
    			a3 = element("a");
    			a3.textContent = "Mákosguba (30 mins)";
    			br3 = element("br");
    			t19 = space();
    			p3 = element("p");
    			p3.textContent = "Hungarian Bread Pudding with Vanilla Custard";
    			add_location(h30, file$3, 1, 2, 25);
    			attr_dev(a0, "href", "/korozott");
    			add_location(a0, file$3, 4, 6, 62);
    			add_location(br0, file$3, 4, 48, 104);
    			add_location(p0, file$3, 5, 6, 117);
    			add_location(li0, file$3, 3, 4, 51);
    			add_location(ul0, file$3, 2, 2, 42);
    			attr_dev(div0, "class", "sections");
    			add_location(div0, file$3, 0, 0, 0);
    			add_location(h31, file$3, 10, 2, 236);
    			attr_dev(a1, "href", "/chicken_paprika");
    			add_location(a1, file$3, 13, 6, 273);
    			add_location(br1, file$3, 13, 78, 345);
    			add_location(p1, file$3, 15, 6, 364);
    			add_location(li1, file$3, 12, 4, 262);
    			attr_dev(a2, "href", "/hungarian_pea");
    			add_location(a2, file$3, 20, 6, 482);
    			add_location(br2, file$3, 20, 66, 542);
    			add_location(p2, file$3, 21, 6, 555);
    			add_location(li2, file$3, 19, 4, 471);
    			add_location(ul1, file$3, 11, 2, 253);
    			attr_dev(div1, "class", "sections");
    			add_location(div1, file$3, 9, 0, 211);
    			add_location(h32, file$3, 26, 2, 680);
    			attr_dev(a3, "href", "/makosguba");
    			add_location(a3, file$3, 29, 6, 719);
    			add_location(br3, file$3, 29, 50, 763);
    			add_location(p3, file$3, 30, 6, 776);
    			add_location(li3, file$3, 28, 4, 708);
    			add_location(ul2, file$3, 27, 2, 699);
    			attr_dev(div2, "class", "sections");
    			add_location(div2, file$3, 25, 0, 655);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, h30);
    			append_dev(div0, t1);
    			append_dev(div0, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a0);
    			append_dev(li0, br0);
    			append_dev(li0, t3);
    			append_dev(li0, p0);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h31);
    			append_dev(div1, t7);
    			append_dev(div1, ul1);
    			append_dev(ul1, li1);
    			append_dev(li1, a1);
    			append_dev(li1, br1);
    			append_dev(li1, t9);
    			append_dev(li1, p1);
    			append_dev(ul1, t11);
    			append_dev(ul1, li2);
    			append_dev(li2, a2);
    			append_dev(li2, br2);
    			append_dev(li2, t13);
    			append_dev(li2, p2);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h32);
    			append_dev(div2, t17);
    			append_dev(div2, ul2);
    			append_dev(ul2, li3);
    			append_dev(li3, a3);
    			append_dev(li3, br3);
    			append_dev(li3, t19);
    			append_dev(li3, p3);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div0);
    				detach_dev(t5);
    				detach_dev(div1);
    				detach_dev(t15);
    				detach_dev(div2);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$3.name, type: "component", source: "", ctx });
    	return block;
    }

    class Central extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$3, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Central", options, id: create_fragment$3.name });
    	}
    }

    /* src/pages/italian/Italian.svelte generated by Svelte v3.12.1 */

    const file$4 = "src/pages/italian/Italian.svelte";

    function create_fragment$4(ctx) {
    	var div, h3, t1, ul, li0, a0, br0, t3, p0, t5, li1, a1, br1, t7, p1, t9, li2, a2, br2, t11, p2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			h3.textContent = "Pastas";
    			t1 = space();
    			ul = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "Homemade Pasta (1 hour) ";
    			br0 = element("br");
    			t3 = space();
    			p0 = element("p");
    			p0.textContent = "Handmade eggy pasta served with walnut pesto";
    			t5 = space();
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "Cacio e Pepe (1 hour) ";
    			br1 = element("br");
    			t7 = space();
    			p1 = element("p");
    			p1.textContent = "Handmade pasta with a sharp parmesan reggiano sauce";
    			t9 = space();
    			li2 = element("li");
    			a2 = element("a");
    			a2.textContent = "Walnut Pesto (15 minutes) ";
    			br2 = element("br");
    			t11 = space();
    			p2 = element("p");
    			p2.textContent = "Homemade walnut pesto, the perfect addition to homemade pasta";
    			add_location(h3, file$4, 1, 2, 25);
    			attr_dev(a0, "href", "/homemade_pasta");
    			add_location(a0, file$4, 4, 6, 63);
    			add_location(br0, file$4, 4, 60, 117);
    			add_location(p0, file$4, 5, 6, 130);
    			add_location(li0, file$4, 3, 4, 52);
    			attr_dev(a1, "href", "/cacio_pepe");
    			add_location(a1, file$4, 8, 6, 207);
    			add_location(br1, file$4, 8, 54, 255);
    			add_location(p1, file$4, 9, 6, 268);
    			add_location(li1, file$4, 7, 4, 196);
    			attr_dev(a2, "href", "/pesto");
    			add_location(a2, file$4, 12, 6, 352);
    			add_location(br2, file$4, 12, 53, 399);
    			add_location(p2, file$4, 13, 6, 412);
    			add_location(li2, file$4, 11, 4, 341);
    			add_location(ul, file$4, 2, 2, 43);
    			attr_dev(div, "class", "sections");
    			add_location(div, file$4, 0, 0, 0);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    			append_dev(div, t1);
    			append_dev(div, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a0);
    			append_dev(li0, br0);
    			append_dev(li0, t3);
    			append_dev(li0, p0);
    			append_dev(ul, t5);
    			append_dev(ul, li1);
    			append_dev(li1, a1);
    			append_dev(li1, br1);
    			append_dev(li1, t7);
    			append_dev(li1, p1);
    			append_dev(ul, t9);
    			append_dev(ul, li2);
    			append_dev(li2, a2);
    			append_dev(li2, br2);
    			append_dev(li2, t11);
    			append_dev(li2, p2);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$4.name, type: "component", source: "", ctx });
    	return block;
    }

    class Italian extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$4, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Italian", options, id: create_fragment$4.name });
    	}
    }

    /* src/pages/other/Other.svelte generated by Svelte v3.12.1 */

    const file$5 = "src/pages/other/Other.svelte";

    function create_fragment$5(ctx) {
    	var div0, h30, t1, ul0, li0, a0, br0, t3, p0, t5, div1, h31, t7, ul1, li1, a1, br1, t9, p1, t11, li2, a2, br2, t13, p2;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Sides";
    			t1 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "Hot Spring Bread (1 hour) ";
    			br0 = element("br");
    			t3 = space();
    			p0 = element("p");
    			p0.textContent = "Sweet rye bread traditionally made in geothermal spring on the shores of\n        Lake Laugarvatn";
    			t5 = space();
    			div1 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Mains";
    			t7 = space();
    			ul1 = element("ul");
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "Coq Au Vin (1.5 hours)";
    			br1 = element("br");
    			t9 = space();
    			p1 = element("p");
    			p1.textContent = "Braised chicken thighs flavored with red wine, bacon, and mushrooms";
    			t11 = space();
    			li2 = element("li");
    			a2 = element("a");
    			a2.textContent = "Beef Bourguignon (4-5 hours)";
    			br2 = element("br");
    			t13 = space();
    			p2 = element("p");
    			p2.textContent = "Slow cooked beef served in a red wine, mushroom sauce";
    			add_location(h30, file$5, 1, 2, 25);
    			attr_dev(a0, "href", "/rye_bread");
    			add_location(a0, file$5, 4, 6, 62);
    			add_location(br0, file$5, 4, 57, 113);
    			add_location(p0, file$5, 5, 6, 126);
    			add_location(li0, file$5, 3, 4, 51);
    			add_location(ul0, file$5, 2, 2, 42);
    			attr_dev(div0, "class", "sections");
    			add_location(div0, file$5, 0, 0, 0);
    			add_location(h31, file$5, 13, 2, 296);
    			attr_dev(a1, "href", "/coq_au_vin");
    			add_location(a1, file$5, 16, 6, 333);
    			add_location(br1, file$5, 16, 54, 381);
    			add_location(p1, file$5, 17, 6, 394);
    			add_location(li1, file$5, 15, 4, 322);
    			attr_dev(a2, "href", "/beef_bourguignon");
    			add_location(a2, file$5, 20, 6, 494);
    			add_location(br2, file$5, 20, 66, 554);
    			add_location(p2, file$5, 21, 6, 567);
    			add_location(li2, file$5, 19, 4, 483);
    			add_location(ul1, file$5, 14, 2, 313);
    			attr_dev(div1, "class", "sections");
    			add_location(div1, file$5, 12, 0, 271);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, h30);
    			append_dev(div0, t1);
    			append_dev(div0, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a0);
    			append_dev(li0, br0);
    			append_dev(li0, t3);
    			append_dev(li0, p0);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h31);
    			append_dev(div1, t7);
    			append_dev(div1, ul1);
    			append_dev(ul1, li1);
    			append_dev(li1, a1);
    			append_dev(li1, br1);
    			append_dev(li1, t9);
    			append_dev(li1, p1);
    			append_dev(ul1, t11);
    			append_dev(ul1, li2);
    			append_dev(li2, a2);
    			append_dev(li2, br2);
    			append_dev(li2, t13);
    			append_dev(li2, p2);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div0);
    				detach_dev(t5);
    				detach_dev(div1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$5.name, type: "component", source: "", ctx });
    	return block;
    }

    class Other extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$5, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Other", options, id: create_fragment$5.name });
    	}
    }

    /* src/pages/Home.svelte generated by Svelte v3.12.1 */

    const file$6 = "src/pages/Home.svelte";

    function create_fragment$6(ctx) {
    	var h2, t1, div3, div0, t2, div0_class_value, t3, div1, t4, div1_class_value, t5, div2, t6, div2_class_value, t7, div7, div4, t8, div4_class_value, t9, div5, t10, div5_class_value, t11, div6, t12, div6_class_value, t13, hr, t14, switch_instance_anchor, current_1, dispose;

    	var switch_value = ctx.menu;

    	function switch_props(ctx) {
    		return { $$inline: true };
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Recipes";
    			t1 = space();
    			div3 = element("div");
    			div0 = element("div");
    			t2 = text("Family Classics");
    			t3 = space();
    			div1 = element("div");
    			t4 = text("French");
    			t5 = space();
    			div2 = element("div");
    			t6 = text("Italian");
    			t7 = space();
    			div7 = element("div");
    			div4 = element("div");
    			t8 = text("English");
    			t9 = space();
    			div5 = element("div");
    			t10 = text("Central European");
    			t11 = space();
    			div6 = element("div");
    			t12 = text("Other");
    			t13 = space();
    			hr = element("hr");
    			t14 = space();
    			if (switch_instance) switch_instance.$$.fragment.c();
    			switch_instance_anchor = empty();
    			attr_dev(h2, "class", "svelte-i3gfn6");
    			add_location(h2, file$6, 15, 0, 480);
    			attr_dev(div0, "class", div0_class_value = "menu " + (ctx.current === 'family' ? 'selected' : '') + " svelte-i3gfn6");
    			add_location(div0, file$6, 18, 2, 520);
    			attr_dev(div1, "class", div1_class_value = "menu " + (ctx.current === 'french' ? 'selected' : '') + " svelte-i3gfn6");
    			add_location(div1, file$6, 25, 2, 697);
    			attr_dev(div2, "class", div2_class_value = "menu " + (ctx.current === 'italian' ? 'selected' : '') + " svelte-i3gfn6");
    			add_location(div2, file$6, 32, 2, 865);
    			attr_dev(div3, "class", "menus svelte-i3gfn6");
    			add_location(div3, file$6, 17, 0, 498);
    			attr_dev(div4, "class", div4_class_value = "menu " + (ctx.current === 'english' ? 'selected' : '') + " svelte-i3gfn6");
    			add_location(div4, file$6, 42, 2, 1065);
    			attr_dev(div5, "class", div5_class_value = "menu " + (ctx.current === 'central' ? 'selected' : '') + " svelte-i3gfn6");
    			add_location(div5, file$6, 50, 2, 1237);
    			attr_dev(div6, "class", div6_class_value = "menu " + (ctx.current === 'other' ? 'selected' : '') + " svelte-i3gfn6");
    			add_location(div6, file$6, 57, 2, 1418);
    			attr_dev(div7, "class", "menus svelte-i3gfn6");
    			add_location(div7, file$6, 41, 0, 1043);
    			add_location(hr, file$6, 65, 0, 1587);

    			dispose = [
    				listen_dev(div0, "click", ctx.click_handler),
    				listen_dev(div0, "click", ctx.click_handler_1),
    				listen_dev(div1, "click", ctx.click_handler_2),
    				listen_dev(div1, "click", ctx.click_handler_3),
    				listen_dev(div2, "click", ctx.click_handler_4),
    				listen_dev(div2, "click", ctx.click_handler_5),
    				listen_dev(div4, "click", ctx.click_handler_6),
    				listen_dev(div4, "click", ctx.click_handler_7),
    				listen_dev(div5, "click", ctx.click_handler_8),
    				listen_dev(div5, "click", ctx.click_handler_9),
    				listen_dev(div6, "click", ctx.click_handler_10),
    				listen_dev(div6, "click", ctx.click_handler_11)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, t2);
    			append_dev(div3, t3);
    			append_dev(div3, div1);
    			append_dev(div1, t4);
    			append_dev(div3, t5);
    			append_dev(div3, div2);
    			append_dev(div2, t6);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div4);
    			append_dev(div4, t8);
    			append_dev(div7, t9);
    			append_dev(div7, div5);
    			append_dev(div5, t10);
    			append_dev(div7, t11);
    			append_dev(div7, div6);
    			append_dev(div6, t12);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, hr, anchor);
    			insert_dev(target, t14, anchor);

    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current_1 = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current_1 || changed.current) && div0_class_value !== (div0_class_value = "menu " + (ctx.current === 'family' ? 'selected' : '') + " svelte-i3gfn6")) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			if ((!current_1 || changed.current) && div1_class_value !== (div1_class_value = "menu " + (ctx.current === 'french' ? 'selected' : '') + " svelte-i3gfn6")) {
    				attr_dev(div1, "class", div1_class_value);
    			}

    			if ((!current_1 || changed.current) && div2_class_value !== (div2_class_value = "menu " + (ctx.current === 'italian' ? 'selected' : '') + " svelte-i3gfn6")) {
    				attr_dev(div2, "class", div2_class_value);
    			}

    			if ((!current_1 || changed.current) && div4_class_value !== (div4_class_value = "menu " + (ctx.current === 'english' ? 'selected' : '') + " svelte-i3gfn6")) {
    				attr_dev(div4, "class", div4_class_value);
    			}

    			if ((!current_1 || changed.current) && div5_class_value !== (div5_class_value = "menu " + (ctx.current === 'central' ? 'selected' : '') + " svelte-i3gfn6")) {
    				attr_dev(div5, "class", div5_class_value);
    			}

    			if ((!current_1 || changed.current) && div6_class_value !== (div6_class_value = "menu " + (ctx.current === 'other' ? 'selected' : '') + " svelte-i3gfn6")) {
    				attr_dev(div6, "class", div6_class_value);
    			}

    			if (switch_value !== (switch_value = ctx.menu)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;
    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});
    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());

    					switch_instance.$$.fragment.c();
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},

    		i: function intro(local) {
    			if (current_1) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);

    			current_1 = true;
    		},

    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current_1 = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h2);
    				detach_dev(t1);
    				detach_dev(div3);
    				detach_dev(t7);
    				detach_dev(div7);
    				detach_dev(t13);
    				detach_dev(hr);
    				detach_dev(t14);
    				detach_dev(switch_instance_anchor);
    			}

    			if (switch_instance) destroy_component(switch_instance, detaching);
    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$6.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	

      // depending on what the user selects, a different menu will show
      let menu = Family;

      // depending on what menu is clicked, a selected class will change
      let current = "family";

    	const click_handler = () => ($$invalidate('menu', menu = Family));

    	const click_handler_1 = () => ($$invalidate('current', current = "family"));

    	const click_handler_2 = () => ($$invalidate('menu', menu = French));

    	const click_handler_3 = () => ($$invalidate('current', current = "french"));

    	const click_handler_4 = () => ($$invalidate('menu', menu = Italian));

    	const click_handler_5 = () => ($$invalidate('current', current = "italian"));

    	const click_handler_6 = () => ($$invalidate('menu', menu = Family));

    	const click_handler_7 = () => ($$invalidate('current', current = "english"));

    	const click_handler_8 = () => ($$invalidate('menu', menu = Central));

    	const click_handler_9 = () => ($$invalidate('current', current = "central"));

    	const click_handler_10 = () => ($$invalidate('menu', menu = Other));

    	const click_handler_11 = () => ($$invalidate('current', current = "other"));

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('menu' in $$props) $$invalidate('menu', menu = $$props.menu);
    		if ('current' in $$props) $$invalidate('current', current = $$props.current);
    	};

    	return {
    		menu,
    		current,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6,
    		click_handler_7,
    		click_handler_8,
    		click_handler_9,
    		click_handler_10,
    		click_handler_11
    	};
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment$6, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Home", options, id: create_fragment$6.name });
    	}
    }

    /* src/pages/Seasons.svelte generated by Svelte v3.12.1 */

    const file$7 = "src/pages/Seasons.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.name = list[i].name;
    	child_ctx.description = list[i].description;
    	return child_ctx;
    }

    // (1:0) <script>   async function getData() {     let response = await fetch("./location");     let users = await response.json();     console.log(users);     return users;   }
    function create_catch_block(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		d: noop
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_catch_block.name, type: "catch", source: "(1:0) <script>   async function getData() {     let response = await fetch(\"./location\");     let users = await response.json();     console.log(users);     return users;   }", ctx });
    	return block;
    }

    // (13:0) {:then data}
    function create_then_block(ctx) {
    	var h3, t0, t1_value = ctx.data.state + "", t1, t2, t3_value = ctx.data.period + "", t3, t4, t5_value = ctx.data.month + "", t5, t6, t7, div;

    	let each_value = ctx.data.produce;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t0 = text("In ");
    			t1 = text(t1_value);
    			t2 = text(" during ");
    			t3 = text(t3_value);
    			t4 = space();
    			t5 = text(t5_value);
    			t6 = text(", the following produce is in season:");
    			t7 = space();
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr_dev(h3, "class", "svelte-itpnnr");
    			add_location(h3, file$7, 13, 2, 263);
    			attr_dev(div, "class", "container svelte-itpnnr");
    			add_location(div, file$7, 17, 2, 373);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t0);
    			append_dev(h3, t1);
    			append_dev(h3, t2);
    			append_dev(h3, t3);
    			append_dev(h3, t4);
    			append_dev(h3, t5);
    			append_dev(h3, t6);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},

    		p: function update(changed, ctx) {
    			if (changed.promise) {
    				each_value = ctx.data.produce;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h3);
    				detach_dev(t7);
    				detach_dev(div);
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_then_block.name, type: "then", source: "(13:0) {:then data}", ctx });
    	return block;
    }

    // (19:4) {#each data.produce as { name, description }}
    function create_each_block(ctx) {
    	var div1, div0, span0, t0_value = ctx.name + "", t0, t1, br0, br1, t2, span1, t3_value = ctx.description + "", t3, t4;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			br0 = element("br");
    			br1 = element("br");
    			t2 = space();
    			span1 = element("span");
    			t3 = text(t3_value);
    			t4 = space();
    			attr_dev(span0, "class", "title svelte-itpnnr");
    			add_location(span0, file$7, 21, 10, 514);
    			attr_dev(br0, "class", "svelte-itpnnr");
    			add_location(br0, file$7, 22, 10, 558);
    			attr_dev(br1, "class", "svelte-itpnnr");
    			add_location(br1, file$7, 22, 16, 564);
    			attr_dev(span1, "class", "text svelte-itpnnr");
    			add_location(span1, file$7, 23, 10, 581);
    			attr_dev(div0, "class", "card svelte-itpnnr");
    			add_location(div0, file$7, 20, 8, 485);
    			attr_dev(div1, "class", "card-wrap svelte-itpnnr");
    			add_location(div1, file$7, 19, 6, 453);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, span0);
    			append_dev(span0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, br0);
    			append_dev(div0, br1);
    			append_dev(div0, t2);
    			append_dev(div0, span1);
    			append_dev(span1, t3);
    			append_dev(div1, t4);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block.name, type: "each", source: "(19:4) {#each data.produce as { name, description }}", ctx });
    	return block;
    }

    // (11:16)    <h3>Loading...</h3> {:then data}
    function create_pending_block(ctx) {
    	var h3;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "Loading...";
    			attr_dev(h3, "class", "svelte-itpnnr");
    			add_location(h3, file$7, 11, 2, 228);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h3);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_pending_block.name, type: "pending", source: "(11:16)    <h3>Loading...</h3> {:then data}", ctx });
    	return block;
    }

    function create_fragment$7(ctx) {
    	var await_block_anchor, promise_1;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 'data',
    		error: 'null'
    	};

    	handle_promise(promise_1 = ctx.promise, info);

    	const block = {
    		c: function create() {
    			await_block_anchor = empty();

    			info.block.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, await_block_anchor, anchor);

    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => await_block_anchor.parentNode;
    			info.anchor = await_block_anchor;
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			info.block.p(changed, assign(assign({}, ctx), info.resolved));
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(await_block_anchor);
    			}

    			info.block.d(detaching);
    			info.token = null;
    			info = null;
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$7.name, type: "component", source: "", ctx });
    	return block;
    }

    async function getData() {
      let response = await fetch("./location");
      let users = await response.json();
      console.log(users);
      return users;
    }

    function instance$1($$self) {
    	
      const promise = getData();

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {};

    	return { promise };
    }

    class Seasons extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$7, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Seasons", options, id: create_fragment$7.name });
    	}
    }

    /* src/pages/family/BraisedBeef.svelte generated by Svelte v3.12.1 */

    const file$8 = "src/pages/family/BraisedBeef.svelte";

    function create_fragment$8(ctx) {
    	var h1, t1, p0, t3, h20, t5, p1, t7, p2, t9, p3, t11, p4, t13, p5, t15, p6, t17, p7, t19, p8, t21, p9, t23, h21, t25, p10, strong0, t27, t28, p11, strong1, t30, t31, p12, strong2, t33, t34, p13, strong3, t36, t37, p14, strong4, t39, t40, p15, strong5, t42, t43, p16, strong6, t45, t46, p17, strong7, t48, t49, p18, strong8, t51, t52, p19, strong9, t54, t55, p20, strong10, t57;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Braised Beef with Sunday Gravy";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Growing up, my mother would always make a tomatoey beef stew with carrots,\n  celery, and big chunks of potato. I loved it. After traveling to Budapest, I\n  found that it bears an uncanny resemblance to the flavor profiles of goulash.\n  This is my take on my mothers dish, served over mashed potatoes and topped\n  with pickled onions.";
    			t3 = space();
    			h20 = element("h2");
    			h20.textContent = "Ingredients";
    			t5 = space();
    			p1 = element("p");
    			p1.textContent = "1 package of beef for stews";
    			t7 = space();
    			p2 = element("p");
    			p2.textContent = "1 can of tomato sauce";
    			t9 = space();
    			p3 = element("p");
    			p3.textContent = "2 packages of beef stock";
    			t11 = space();
    			p4 = element("p");
    			p4.textContent = "1 white or yellow onion";
    			t13 = space();
    			p5 = element("p");
    			p5.textContent = "1 red or pickled onions";
    			t15 = space();
    			p6 = element("p");
    			p6.textContent = "Vinger";
    			t17 = space();
    			p7 = element("p");
    			p7.textContent = "Cornstarch";
    			t19 = space();
    			p8 = element("p");
    			p8.textContent = "2 potatoes";
    			t21 = space();
    			p9 = element("p");
    			p9.textContent = "Bay leaves";
    			t23 = space();
    			h21 = element("h2");
    			h21.textContent = "Instructions";
    			t25 = space();
    			p10 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Step 1:";
    			t27 = text(" Add one package of beef stock to a large pot; heat until\n  it boils and then let it simmer");
    			t28 = space();
    			p11 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Step 2:";
    			t30 = text(" Cut the white onion in half and cut off the ends and add\n  to pot");
    			t31 = space();
    			p12 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Step 3:";
    			t33 = text(" Add beef to pot");
    			t34 = space();
    			p13 = element("p");
    			strong3 = element("strong");
    			strong3.textContent = "Step 4:";
    			t36 = text(" Add 1/3 a cup of tomato sauce to pot");
    			t37 = space();
    			p14 = element("p");
    			strong4 = element("strong");
    			strong4.textContent = "Step 4.5:";
    			t39 = text(" If you don't have them, make pickled onions. Boil\n  equal parts vinegar and water and once boiling, fill a jar with sliced onions (cut\n  root to stem) and the mixture. It takes a few hours to pickle.");
    			t40 = space();
    			p15 = element("p");
    			strong5 = element("strong");
    			strong5.textContent = "Step 5:";
    			t42 = text(" Cook for 4 hours; stirring occasionally and adding beef\n  stock so that the beef is always submerged. Whenever you add stock, add in a spoonful\n  of tomato sauce as well. The further along it gets, the less submerged you want\n  it. By the end, it will turn into a gravy.");
    			t43 = space();
    			p16 = element("p");
    			strong6 = element("strong");
    			strong6.textContent = "Step 6:";
    			t45 = text(" When you are about 45 mins out, stop adding stock. You\n  will likely have used another half of a container at this point");
    			t46 = space();
    			p17 = element("p");
    			strong7 = element("strong");
    			strong7.textContent = "Step 7:";
    			t48 = text(" When you are 30 mins out, add potatoes to boiling water\n  and cook until fork tender (about 20 mins)");
    			t49 = space();
    			p18 = element("p");
    			strong8 = element("strong");
    			strong8.textContent = "Step 8:";
    			t51 = text(" Take out potatoes and add a slab of butter and a reasonable\n  amount of milk (like 1/3 a cup; just eye ball it). Add pepper and salt to taste\n  and mash.");
    			t52 = space();
    			p19 = element("p");
    			strong9 = element("strong");
    			strong9.textContent = "Step 9:";
    			t54 = text(" Mix a spoonful of cornstarch with a half mug of water.\n  Make sure it is mixed well and then add it to the pot by streaming it in and stirring\n  the mixture as you go. This should add some thickness to your gravy.");
    			t55 = space();
    			p20 = element("p");
    			strong10 = element("strong");
    			strong10.textContent = "Step 10:";
    			t57 = text(" Assemble! Put the potatoes down first, then add the beef\n  and gravy, then top with pickled onions.");
    			add_location(h1, file$8, 0, 0, 0);
    			add_location(p0, file$8, 1, 0, 40);
    			add_location(h20, file$8, 8, 0, 385);
    			add_location(p1, file$8, 9, 0, 406);
    			add_location(p2, file$8, 10, 0, 441);
    			add_location(p3, file$8, 11, 0, 470);
    			add_location(p4, file$8, 12, 0, 502);
    			add_location(p5, file$8, 13, 0, 533);
    			add_location(p6, file$8, 14, 0, 564);
    			add_location(p7, file$8, 15, 0, 578);
    			add_location(p8, file$8, 16, 0, 596);
    			add_location(p9, file$8, 17, 0, 614);
    			add_location(h21, file$8, 18, 0, 632);
    			add_location(strong0, file$8, 20, 2, 660);
    			add_location(p10, file$8, 19, 0, 654);
    			add_location(strong1, file$8, 24, 2, 788);
    			add_location(p11, file$8, 23, 0, 782);
    			add_location(strong2, file$8, 27, 3, 887);
    			add_location(p12, file$8, 27, 0, 884);
    			add_location(strong3, file$8, 28, 3, 936);
    			add_location(p13, file$8, 28, 0, 933);
    			add_location(strong4, file$8, 30, 2, 1008);
    			add_location(p14, file$8, 29, 0, 1002);
    			add_location(strong5, file$8, 35, 2, 1250);
    			add_location(p15, file$8, 34, 0, 1244);
    			add_location(strong6, file$8, 41, 2, 1557);
    			add_location(p16, file$8, 40, 0, 1551);
    			add_location(strong7, file$8, 45, 2, 1714);
    			add_location(p17, file$8, 44, 0, 1708);
    			add_location(strong8, file$8, 49, 2, 1851);
    			add_location(p18, file$8, 48, 0, 1845);
    			add_location(strong9, file$8, 54, 2, 2041);
    			add_location(p19, file$8, 53, 0, 2035);
    			add_location(strong10, file$8, 59, 2, 2291);
    			add_location(p20, file$8, 58, 0, 2285);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p3, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p5, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, p6, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, p7, anchor);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, p8, anchor);
    			insert_dev(target, t21, anchor);
    			insert_dev(target, p9, anchor);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t25, anchor);
    			insert_dev(target, p10, anchor);
    			append_dev(p10, strong0);
    			append_dev(p10, t27);
    			insert_dev(target, t28, anchor);
    			insert_dev(target, p11, anchor);
    			append_dev(p11, strong1);
    			append_dev(p11, t30);
    			insert_dev(target, t31, anchor);
    			insert_dev(target, p12, anchor);
    			append_dev(p12, strong2);
    			append_dev(p12, t33);
    			insert_dev(target, t34, anchor);
    			insert_dev(target, p13, anchor);
    			append_dev(p13, strong3);
    			append_dev(p13, t36);
    			insert_dev(target, t37, anchor);
    			insert_dev(target, p14, anchor);
    			append_dev(p14, strong4);
    			append_dev(p14, t39);
    			insert_dev(target, t40, anchor);
    			insert_dev(target, p15, anchor);
    			append_dev(p15, strong5);
    			append_dev(p15, t42);
    			insert_dev(target, t43, anchor);
    			insert_dev(target, p16, anchor);
    			append_dev(p16, strong6);
    			append_dev(p16, t45);
    			insert_dev(target, t46, anchor);
    			insert_dev(target, p17, anchor);
    			append_dev(p17, strong7);
    			append_dev(p17, t48);
    			insert_dev(target, t49, anchor);
    			insert_dev(target, p18, anchor);
    			append_dev(p18, strong8);
    			append_dev(p18, t51);
    			insert_dev(target, t52, anchor);
    			insert_dev(target, p19, anchor);
    			append_dev(p19, strong9);
    			append_dev(p19, t54);
    			insert_dev(target, t55, anchor);
    			insert_dev(target, p20, anchor);
    			append_dev(p20, strong10);
    			append_dev(p20, t57);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    				detach_dev(t1);
    				detach_dev(p0);
    				detach_dev(t3);
    				detach_dev(h20);
    				detach_dev(t5);
    				detach_dev(p1);
    				detach_dev(t7);
    				detach_dev(p2);
    				detach_dev(t9);
    				detach_dev(p3);
    				detach_dev(t11);
    				detach_dev(p4);
    				detach_dev(t13);
    				detach_dev(p5);
    				detach_dev(t15);
    				detach_dev(p6);
    				detach_dev(t17);
    				detach_dev(p7);
    				detach_dev(t19);
    				detach_dev(p8);
    				detach_dev(t21);
    				detach_dev(p9);
    				detach_dev(t23);
    				detach_dev(h21);
    				detach_dev(t25);
    				detach_dev(p10);
    				detach_dev(t28);
    				detach_dev(p11);
    				detach_dev(t31);
    				detach_dev(p12);
    				detach_dev(t34);
    				detach_dev(p13);
    				detach_dev(t37);
    				detach_dev(p14);
    				detach_dev(t40);
    				detach_dev(p15);
    				detach_dev(t43);
    				detach_dev(p16);
    				detach_dev(t46);
    				detach_dev(p17);
    				detach_dev(t49);
    				detach_dev(p18);
    				detach_dev(t52);
    				detach_dev(p19);
    				detach_dev(t55);
    				detach_dev(p20);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$8.name, type: "component", source: "", ctx });
    	return block;
    }

    class BraisedBeef extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$8, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "BraisedBeef", options, id: create_fragment$8.name });
    	}
    }

    /* src/pages/family/ChickenPan.svelte generated by Svelte v3.12.1 */

    const file$9 = "src/pages/family/ChickenPan.svelte";

    function create_fragment$9(ctx) {
    	var h1, t1, p0, t3, p1, t5, h20, t7, p2, t9, p3, t11, p4, t13, p5, t15, p6, t17, p7, t19, p8, t21, h21, t23, p9, strong0, t25, t26, p10, strong1, t28, t29, p11, strong2, t31, t32, p12, strong3, t34, t35, p13, strong4, t37, t38, p14, strong5, t40;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Chicken with Pan Sauce";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "The trick to eating right is to make some healthy something tasty. Bonus\n  points if you get to use fancy French words like fond when making it. This\n  will make the perfect main for a weeknight meal, especially one where you have\n  about 40 mins to make dinner. You should have plenty of time to make sides\n  when its in the oven, which typically takes 25-30 mins.";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "The amount of ingredients is left purposefully vague because pan sauces are\n  something you feel out more than you make with precision.";
    			t5 = space();
    			h20 = element("h2");
    			h20.textContent = "Ingredients";
    			t7 = space();
    			p2 = element("p");
    			p2.textContent = "2 chicken breasts bone in and skin on (it remains MUCH more moist this way)";
    			t9 = space();
    			p3 = element("p");
    			p3.textContent = "1 shallot";
    			t11 = space();
    			p4 = element("p");
    			p4.textContent = "White Wine/Sherry";
    			t13 = space();
    			p5 = element("p");
    			p5.textContent = "Chicken Stock";
    			t15 = space();
    			p6 = element("p");
    			p6.textContent = "Butter";
    			t17 = space();
    			p7 = element("p");
    			p7.textContent = "Teaspoon of flour";
    			t19 = space();
    			p8 = element("p");
    			p8.textContent = "Thyme, Sage, Parsley";
    			t21 = space();
    			h21 = element("h2");
    			h21.textContent = "Instructions";
    			t23 = space();
    			p9 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Step 1:";
    			t25 = text(" Sear the chicken in a cast iron pan with some canola oil\n  in the bottom of the pan. If the chicken is sticking to the pan, keep waiting,\n  when the sear is complete it will form a brown crust and release from the pan--\n  empty the grease, but don't clean the pan.");
    			t26 = space();
    			p10 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Step 2:";
    			t28 = text(" Place the chicken in a 375 degree oven until the internal\n  temperature is 160 degrees.");
    			t29 = space();
    			p11 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Step 3:";
    			t31 = text(" While the chicken is cooking, chop up the shallot and\n  spices. After the chicken is done cooking and is resting, you will make the pan\n  sauce");
    			t32 = space();
    			p12 = element("p");
    			strong3 = element("strong");
    			strong3.textContent = "Step 4:";
    			t34 = text(" Cook the shallots until they are translucent (you can\n  add a little bit of flour, which can make your sauce thicker but its not necessary)");
    			t35 = space();
    			p13 = element("p");
    			strong4 = element("strong");
    			strong4.textContent = "Step 5:";
    			t37 = text(" Add equal parts wine and chicken stock to the pan. Add\n  in the spices. Reduce until the mixture coats the back of the spoon.");
    			t38 = space();
    			p14 = element("p");
    			strong5 = element("strong");
    			strong5.textContent = "Step 6:";
    			t40 = text(" Add butter to the sauce and stir until it emulsifies");
    			add_location(h1, file$9, 0, 0, 0);
    			add_location(p0, file$9, 1, 0, 32);
    			add_location(p1, file$9, 8, 0, 409);
    			add_location(h20, file$9, 12, 0, 556);
    			add_location(p2, file$9, 13, 0, 577);
    			add_location(p3, file$9, 16, 0, 664);
    			add_location(p4, file$9, 17, 0, 681);
    			add_location(p5, file$9, 18, 0, 706);
    			add_location(p6, file$9, 19, 0, 727);
    			add_location(p7, file$9, 20, 0, 741);
    			add_location(p8, file$9, 21, 0, 766);
    			add_location(h21, file$9, 22, 0, 794);
    			add_location(strong0, file$9, 24, 2, 822);
    			add_location(p9, file$9, 23, 0, 816);
    			add_location(strong1, file$9, 30, 2, 1127);
    			add_location(p10, file$9, 29, 0, 1121);
    			add_location(strong2, file$9, 34, 2, 1251);
    			add_location(p11, file$9, 33, 0, 1245);
    			add_location(strong3, file$9, 39, 2, 1431);
    			add_location(p12, file$9, 38, 0, 1425);
    			add_location(strong4, file$9, 43, 2, 1607);
    			add_location(p13, file$9, 42, 0, 1601);
    			add_location(strong5, file$9, 47, 2, 1769);
    			add_location(p14, file$9, 46, 0, 1763);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p3, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p5, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, p6, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, p7, anchor);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, p8, anchor);
    			insert_dev(target, t21, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, p9, anchor);
    			append_dev(p9, strong0);
    			append_dev(p9, t25);
    			insert_dev(target, t26, anchor);
    			insert_dev(target, p10, anchor);
    			append_dev(p10, strong1);
    			append_dev(p10, t28);
    			insert_dev(target, t29, anchor);
    			insert_dev(target, p11, anchor);
    			append_dev(p11, strong2);
    			append_dev(p11, t31);
    			insert_dev(target, t32, anchor);
    			insert_dev(target, p12, anchor);
    			append_dev(p12, strong3);
    			append_dev(p12, t34);
    			insert_dev(target, t35, anchor);
    			insert_dev(target, p13, anchor);
    			append_dev(p13, strong4);
    			append_dev(p13, t37);
    			insert_dev(target, t38, anchor);
    			insert_dev(target, p14, anchor);
    			append_dev(p14, strong5);
    			append_dev(p14, t40);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    				detach_dev(t1);
    				detach_dev(p0);
    				detach_dev(t3);
    				detach_dev(p1);
    				detach_dev(t5);
    				detach_dev(h20);
    				detach_dev(t7);
    				detach_dev(p2);
    				detach_dev(t9);
    				detach_dev(p3);
    				detach_dev(t11);
    				detach_dev(p4);
    				detach_dev(t13);
    				detach_dev(p5);
    				detach_dev(t15);
    				detach_dev(p6);
    				detach_dev(t17);
    				detach_dev(p7);
    				detach_dev(t19);
    				detach_dev(p8);
    				detach_dev(t21);
    				detach_dev(h21);
    				detach_dev(t23);
    				detach_dev(p9);
    				detach_dev(t26);
    				detach_dev(p10);
    				detach_dev(t29);
    				detach_dev(p11);
    				detach_dev(t32);
    				detach_dev(p12);
    				detach_dev(t35);
    				detach_dev(p13);
    				detach_dev(t38);
    				detach_dev(p14);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$9.name, type: "component", source: "", ctx });
    	return block;
    }

    class ChickenPan extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$9, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "ChickenPan", options, id: create_fragment$9.name });
    	}
    }

    /* src/pages/family/SausageBalls.svelte generated by Svelte v3.12.1 */

    const file$a = "src/pages/family/SausageBalls.svelte";

    function create_fragment$a(ctx) {
    	var h1, t1, p0, t3, p1, t5, h20, t7, p2, t9, p3, t11, p4, t13, p5, t15, h21, t17, p6, strong0, t19, t20, p7, strong1, t22, strong2, t24, t25, p8, strong3, t27, t28, p9, strong4, t30, t31, p10, strong5, t33, t34, p11, strong6, t36, t37, p12, strong7, t39, t40, p13, strong8, t42;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Sausage Balls";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "In our house, these sausage balls have been a holiday favorite for over thirty\n  years. If I’m feeling especially merry, I devote a full week to making frozen\n  tins of them for friends. It’s a welcome gift that kick starts a party for\n  families who are busy, busy, busy.";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "-- Audrey Baylor";
    			t5 = space();
    			h20 = element("h2");
    			h20.textContent = "Ingredients";
    			t7 = space();
    			p2 = element("p");
    			p2.textContent = "2 pounds of Jimmy Dean hot sausage";
    			t9 = space();
    			p3 = element("p");
    			p3.textContent = "2 pounds of Jimmy Dean sage sausage";
    			t11 = space();
    			p4 = element("p");
    			p4.textContent = "8 cups of Bisquick (or 1 40 oz box)";
    			t13 = space();
    			p5 = element("p");
    			p5.textContent = "4 pounds of Vermont Extra Sharp White Cheddar Cheese (or 2 large blocks or 12\n  cups, grated)";
    			t15 = space();
    			h21 = element("h2");
    			h21.textContent = "Instructions";
    			t17 = space();
    			p6 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Temperature";
    			t19 = text(" 350 degrees");
    			t20 = space();
    			p7 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Time in the";
    			t22 = space();
    			strong2 = element("strong");
    			strong2.textContent = "oven";
    			t24 = text(" 7-10 minutes, freeze, and then\n  another 10 minutes");
    			t25 = space();
    			p8 = element("p");
    			strong3 = element("strong");
    			strong3.textContent = "Yield";
    			t27 = text(" 140 sausage balls (I usually make 5 batches for the holidays\n  as gifts for friends and family)");
    			t28 = space();
    			p9 = element("p");
    			strong4 = element("strong");
    			strong4.textContent = "Step 1:";
    			t30 = text(" Throw all of the ingredients in a large mixing bowl. If\n  you have a food processor, you’re set to mix, but if not, pull on a pair of disposable\n  gloves and mix with your hands until everything is well blended.");
    			t31 = space();
    			p10 = element("p");
    			strong5 = element("strong");
    			strong5.textContent = "Step 2:";
    			t33 = text(" An important point to know out of the gate: Never buy\n  bags of grated cheese. There’s nothing better than Vermont Extra Sharp White Cheddar\n  and nothing more mediocre than bagged grated cheese. I prefer to buy Vermont Extra\n  Sharp Cheddar in big blocks from Costco, or, surprisingly enough, the Private Selection\n  blocks of it from Kroger. If either of these are sold out, I use Cracker Barrel\n  Extra Sharp Cheddar.");
    			t34 = space();
    			p11 = element("p");
    			strong6 = element("strong");
    			strong6.textContent = "Step 3:";
    			t36 = text(" Roll the sausage dough into cookie-sized balls and half\n  bake them, probably between 7 to 10 minutes. Allow them to fully cool before placing\n  them in freezer bags and popping them in the freezer. You can package them at this\n  point if you want to give them as frozen treats.");
    			t37 = space();
    			p12 = element("p");
    			strong7 = element("strong");
    			strong7.textContent = "Step 4:";
    			t39 = text(" When you’re ready to serve them, do not thaw before placing\n  them back on a cookie sheet to brown in the oven for another ten minutes. Serve\n  piping hot.");
    			t40 = space();
    			p13 = element("p");
    			strong8 = element("strong");
    			strong8.textContent = "Step 5:";
    			t42 = text(" For Christmas-size batches (for gift-giving and holiday\n  parties), the proportions are giant size: 4 sausage packages, 1 box of Biscquick\n  (40 oz.), and 12 cups of grated cheese. Each batch yields 5-6 storage containers\n  (4 cup size). I usually make this two or three times to have enough to share.");
    			add_location(h1, file$a, 0, 0, 0);
    			add_location(p0, file$a, 1, 0, 23);
    			add_location(p1, file$a, 7, 0, 307);
    			add_location(h20, file$a, 8, 0, 331);
    			add_location(p2, file$a, 9, 0, 352);
    			add_location(p3, file$a, 10, 0, 394);
    			add_location(p4, file$a, 11, 0, 437);
    			add_location(p5, file$a, 12, 0, 480);
    			add_location(h21, file$a, 16, 0, 585);
    			add_location(strong0, file$a, 17, 3, 610);
    			add_location(p6, file$a, 17, 0, 607);
    			add_location(strong1, file$a, 19, 2, 661);
    			add_location(strong2, file$a, 19, 31, 690);
    			add_location(p7, file$a, 18, 0, 655);
    			add_location(strong3, file$a, 23, 2, 775);
    			add_location(p8, file$a, 22, 0, 769);
    			add_location(strong4, file$a, 27, 2, 905);
    			add_location(p9, file$a, 26, 0, 899);
    			add_location(strong5, file$a, 32, 2, 1153);
    			add_location(p10, file$a, 31, 0, 1147);
    			add_location(strong6, file$a, 40, 2, 1610);
    			add_location(p11, file$a, 39, 0, 1604);
    			add_location(strong7, file$a, 46, 2, 1925);
    			add_location(p12, file$a, 45, 0, 1919);
    			add_location(strong8, file$a, 51, 2, 2117);
    			add_location(p13, file$a, 50, 0, 2111);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p3, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p5, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, p6, anchor);
    			append_dev(p6, strong0);
    			append_dev(p6, t19);
    			insert_dev(target, t20, anchor);
    			insert_dev(target, p7, anchor);
    			append_dev(p7, strong1);
    			append_dev(p7, t22);
    			append_dev(p7, strong2);
    			append_dev(p7, t24);
    			insert_dev(target, t25, anchor);
    			insert_dev(target, p8, anchor);
    			append_dev(p8, strong3);
    			append_dev(p8, t27);
    			insert_dev(target, t28, anchor);
    			insert_dev(target, p9, anchor);
    			append_dev(p9, strong4);
    			append_dev(p9, t30);
    			insert_dev(target, t31, anchor);
    			insert_dev(target, p10, anchor);
    			append_dev(p10, strong5);
    			append_dev(p10, t33);
    			insert_dev(target, t34, anchor);
    			insert_dev(target, p11, anchor);
    			append_dev(p11, strong6);
    			append_dev(p11, t36);
    			insert_dev(target, t37, anchor);
    			insert_dev(target, p12, anchor);
    			append_dev(p12, strong7);
    			append_dev(p12, t39);
    			insert_dev(target, t40, anchor);
    			insert_dev(target, p13, anchor);
    			append_dev(p13, strong8);
    			append_dev(p13, t42);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    				detach_dev(t1);
    				detach_dev(p0);
    				detach_dev(t3);
    				detach_dev(p1);
    				detach_dev(t5);
    				detach_dev(h20);
    				detach_dev(t7);
    				detach_dev(p2);
    				detach_dev(t9);
    				detach_dev(p3);
    				detach_dev(t11);
    				detach_dev(p4);
    				detach_dev(t13);
    				detach_dev(p5);
    				detach_dev(t15);
    				detach_dev(h21);
    				detach_dev(t17);
    				detach_dev(p6);
    				detach_dev(t20);
    				detach_dev(p7);
    				detach_dev(t25);
    				detach_dev(p8);
    				detach_dev(t28);
    				detach_dev(p9);
    				detach_dev(t31);
    				detach_dev(p10);
    				detach_dev(t34);
    				detach_dev(p11);
    				detach_dev(t37);
    				detach_dev(p12);
    				detach_dev(t40);
    				detach_dev(p13);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$a.name, type: "component", source: "", ctx });
    	return block;
    }

    class SausageBalls extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$a, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "SausageBalls", options, id: create_fragment$a.name });
    	}
    }

    /* src/pages/family/SweetRolls.svelte generated by Svelte v3.12.1 */

    const file$b = "src/pages/family/SweetRolls.svelte";

    function create_fragment$b(ctx) {
    	var h1, t1, p0, t3, p1, t5, p2, t7, h20, t9, p3, strong0, t11, p4, t13, p5, t15, p6, t17, p7, t19, p8, t21, p9, t23, p10, t25, p11, strong1, t27, p12, t29, p13, t31, p14, t33, p15, t35, p16, strong2, t37, t38, p17, strong3, t40, t41, h21, t43, p18, strong4, t45, t46, p19, strong5, t48, t49, p20, strong6, t51, t52, p21, strong7, t54, t55, p22, strong8, t57, t58, p23, strong9, t60, t61, p24, strong10, t63, t64, p25, t66, p26, em, t68, p27, strong11, t70, p28, t72, p29, strong12, t74, p30, t76, p31, t78, p32;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Sweet Rolls";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Mother baked sweet rolls every Saturday—dozens and dozens of sweet rolls. She\n  baked them for Sunday morning, but since the rolls taste best fresh out of the\n  oven, we always ate as many as we liked hot out of the oven from her Saturday\n  afternoon baking. At about four o’clock on Saturday, mother would head out the\n  door to deliver pans of rolls to those she thought might need cheering up:\n  nursing home residents, people who lived alone, neighbors. That tradition of\n  giving sweet rolls continued into her late eighties and extended to her\n  grandchildren, sending home pans of cinnamon treats after nearly every visit.\n  Wherever she lived, she baked sweet rolls, and in her last home, one of her\n  neighbors regularly brought her a dozen red roses because, he said, she kept\n  everyone on their street happy with generous pans of sweet rolls.";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "-- Audrey Baylor";
    			t5 = space();
    			p2 = element("p");
    			p2.textContent = " ";
    			t7 = space();
    			h20 = element("h2");
    			h20.textContent = "Ingredients";
    			t9 = space();
    			p3 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Dough";
    			t11 = space();
    			p4 = element("p");
    			p4.textContent = "4 cups of milk";
    			t13 = space();
    			p5 = element("p");
    			p5.textContent = "1 cup of sugar";
    			t15 = space();
    			p6 = element("p");
    			p6.textContent = "2 teaspoons of salt";
    			t17 = space();
    			p7 = element("p");
    			p7.textContent = "1 cup or 8 Tablespoons of butter";
    			t19 = space();
    			p8 = element("p");
    			p8.textContent = "12 cups of flour";
    			t21 = space();
    			p9 = element("p");
    			p9.textContent = "4 eggs";
    			t23 = space();
    			p10 = element("p");
    			p10.textContent = "6 packages of Instant Yeast (premium Redstar recommended)";
    			t25 = space();
    			p11 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Topping";
    			t27 = space();
    			p12 = element("p");
    			p12.textContent = "1 cup or 8 Tablespoons of butter";
    			t29 = space();
    			p13 = element("p");
    			p13.textContent = "Sugar";
    			t31 = space();
    			p14 = element("p");
    			p14.textContent = "Cinnamon";
    			t33 = space();
    			p15 = element("p");
    			p15.textContent = " ";
    			t35 = space();
    			p16 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Yield:";
    			t37 = text(" 2 9x12 pans plus one 9” cake pan of rolls");
    			t38 = space();
    			p17 = element("p");
    			strong3 = element("strong");
    			strong3.textContent = "Bake:";
    			t40 = text(" 350 degrees for 17-20 minutes");
    			t41 = space();
    			h21 = element("h2");
    			h21.textContent = "Instructions";
    			t43 = space();
    			p18 = element("p");
    			strong4 = element("strong");
    			strong4.textContent = "Step 1:";
    			t45 = text(" Because you are working with yeast, temperatures and assembly\n  of ingredients must be followed exactly.");
    			t46 = space();
    			p19 = element("p");
    			strong5 = element("strong");
    			strong5.textContent = "Step 2:";
    			t48 = text(" Skald the milk on the stove (heat at medium heat until\n  a skin forms) as you stir to dissolve the sugar, butter, and salt, allowing the\n  butter to melt. Do not allow to boil.");
    			t49 = space();
    			p20 = element("p");
    			strong6 = element("strong");
    			strong6.textContent = "Step 3:";
    			t51 = text(" Pour the milk mixture into a very large bowl. My mother\n  always had a gigantic bowl that she used just for mixing up sweet rolls. (If you\n  do not have a gigantic bowl, you may need to make a half-size batch.) While the\n  milk is still hot, add half of the flour (6 cups), stirring thoroughly before adding\n  the eggs. You want the mixture to be warm (but not hot) because you need to add\n  the yeast and the temperature matters. The yeast is activated by the warm temperature,\n  but a hot temperature will kill the yeast and keep your dough from rising. Once\n  the yeast is added and stirred in, add the second half of your flour (another 6\n  cups). As you are adding the second half of the flour, you will want to work the\n  flour into the mixture with your hands. Gloves make this task easy. Do not overwork\n  the dough.");
    			t52 = space();
    			p21 = element("p");
    			strong7 = element("strong");
    			strong7.textContent = "Step 4:";
    			t54 = text(" Divide the dough into two parts. Generously sprinkle your\n  work surface with flour, probably a cup or maybe even a cup and a half. The dough\n  is still wet to the touch so the added flour on the surface should keep your dough\n  from sticking. Sprinkle a little additional flour to the top of the dough if you\n  see sticky spots that need it.");
    			t55 = space();
    			p22 = element("p");
    			strong8 = element("strong");
    			strong8.textContent = "Step 5:";
    			t57 = text(" Using a rolling pin, roll out the dough into a rectangular\n  shape, maybe 24”x12”. The dough should be between ¼ to ½ inch thick. Spread about\n  a half stick of softened butter across the dough. Add a generous layer of sugar,\n  and a heavy layer of cinnamon upon the buttered dough. Roll tightly into a long\n  role. Use a thread to cut the dough into ½ inch wide slices (slide the thread under\n  the roll, cross the two ends of the thread and pull for a clean, perfect cut).\n  Repeat this process with the second half of your dough.");
    			t58 = space();
    			p23 = element("p");
    			strong9 = element("strong");
    			strong9.textContent = "Step 6:";
    			t60 = text(" Use cooking spray to coat your baking pans. Place the\n  rolls so that they are touching each other in the 9x12 cake pans. For nice, high\n  sweet rolls, allow them to rise until at or slightly above the rim of the pan.\n  How quickly they do this will depend upon the temperature of your room, varying\n  from perhaps 40 minutes to a little over an hour. Bake in a preheated 350 degree\n  oven from 17 to 20 minutes, depending upon your pan. Dark pans tend to bake more\n  quickly and glass pans more slowly. The rolls should appear golden. The rolls will\n  continue to darken slightly even after they have been removed from the oven.");
    			t61 = space();
    			p24 = element("p");
    			strong10 = element("strong");
    			strong10.textContent = "Step 7:";
    			t63 = text(" The rolls are best served immediately from the oven although\n  they are good warmed in the oven later. You can eat them topped with a bit of butter\n  or spread with icing. We never measured the ingredients for the icing, but I’m\n  guessing that these approximate guessed measurements will at least get you started:\n  2 tablespoons of softened butter, 1 ½ teaspoons of vanilla, 2 cups of confectioner\n  sugar, and 1 ½ to 2 Tablespoons of milk.");
    			t64 = space();
    			p25 = element("p");
    			p25.textContent = " ";
    			t66 = space();
    			p26 = element("p");
    			em = element("em");
    			em.textContent = "Mother also made several variations to her basic recipe.";
    			t68 = space();
    			p27 = element("p");
    			strong11 = element("strong");
    			strong11.textContent = "Pecan Sticky Rolls:";
    			t70 = space();
    			p28 = element("p");
    			p28.textContent = "Spray a round glass baking dish with cooking oil, dot it with butter (probably\n  about 4 Tablespoons), add ¾ to a cup of brown sugar, pour in 1/3 cup of Half\n  and Half cream before placing the sweet rolls on top of this mixture. These\n  measurements are approximate and may need adjustment";
    			t72 = space();
    			p29 = element("p");
    			strong12 = element("strong");
    			strong12.textContent = "Orange Rolls:";
    			t74 = space();
    			p30 = element("p");
    			p30.textContent = "Make an orange icing with orange zest (grated orange peel) and orange juice\n  concentrate (from the frozen foods section of the grocery store). Stir\n  together";
    			t76 = space();
    			p31 = element("p");
    			p31.textContent = "2 tablespoons of frozen orange juice concentrate, 2 tablespoons of softened\n  butter, ½ teaspoons of vanilla, 3 1/2 cups of confectioner sugar. Measurements\n  are approximate and may need to be adjusted. Instead of using sugar and\n  cinnamon as the sweet roll filling as is more common, spread the dough with\n  this orange icing before rolling up the dough and slicing for the pan. Because\n  this variation is more of a treat, Mother generally cut these orange rolls\n  into a tea ring. A tea ring is formed by taking the long roll of dough,\n  forming a circle with it, and then half cutting each slice and laying it on\n  it’s side.";
    			t78 = space();
    			p32 = element("p");
    			add_location(h1, file$b, 0, 0, 0);
    			add_location(p0, file$b, 1, 0, 21);
    			add_location(p1, file$b, 14, 0, 887);
    			add_location(p2, file$b, 15, 0, 911);
    			add_location(h20, file$b, 16, 0, 925);
    			add_location(strong0, file$b, 17, 3, 949);
    			add_location(p3, file$b, 17, 0, 946);
    			add_location(p4, file$b, 18, 0, 976);
    			add_location(p5, file$b, 19, 0, 998);
    			add_location(p6, file$b, 20, 0, 1020);
    			add_location(p7, file$b, 21, 0, 1047);
    			add_location(p8, file$b, 22, 0, 1087);
    			add_location(p9, file$b, 23, 0, 1111);
    			add_location(p10, file$b, 24, 0, 1125);
    			add_location(strong1, file$b, 25, 3, 1193);
    			add_location(p11, file$b, 25, 0, 1190);
    			add_location(p12, file$b, 26, 0, 1222);
    			add_location(p13, file$b, 27, 0, 1262);
    			add_location(p14, file$b, 28, 0, 1275);
    			add_location(p15, file$b, 29, 0, 1291);
    			add_location(strong2, file$b, 30, 3, 1308);
    			add_location(p16, file$b, 30, 0, 1305);
    			add_location(strong3, file$b, 31, 3, 1381);
    			add_location(p17, file$b, 31, 0, 1378);
    			add_location(h21, file$b, 32, 0, 1438);
    			add_location(strong4, file$b, 34, 2, 1466);
    			add_location(p18, file$b, 33, 0, 1460);
    			add_location(strong5, file$b, 38, 2, 1607);
    			add_location(p19, file$b, 37, 0, 1601);
    			add_location(strong6, file$b, 43, 2, 1820);
    			add_location(p20, file$b, 42, 0, 1814);
    			add_location(strong7, file$b, 56, 2, 2681);
    			add_location(p21, file$b, 55, 0, 2675);
    			add_location(strong8, file$b, 63, 2, 3060);
    			add_location(p22, file$b, 62, 0, 3054);
    			add_location(strong9, file$b, 72, 2, 3629);
    			add_location(p23, file$b, 71, 0, 3623);
    			add_location(strong10, file$b, 82, 2, 4295);
    			add_location(p24, file$b, 81, 0, 4289);
    			add_location(p25, file$b, 89, 0, 4768);
    			add_location(em, file$b, 90, 3, 4785);
    			add_location(p26, file$b, 90, 0, 4782);
    			add_location(strong11, file$b, 91, 3, 4858);
    			add_location(p27, file$b, 91, 0, 4855);
    			add_location(p28, file$b, 92, 0, 4899);
    			add_location(strong12, file$b, 98, 3, 5204);
    			add_location(p29, file$b, 98, 0, 5201);
    			add_location(p30, file$b, 99, 0, 5239);
    			add_location(p31, file$b, 104, 0, 5410);
    			add_location(p32, file$b, 115, 0, 6053);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p3, anchor);
    			append_dev(p3, strong0);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p5, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, p6, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, p7, anchor);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, p8, anchor);
    			insert_dev(target, t21, anchor);
    			insert_dev(target, p9, anchor);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, p10, anchor);
    			insert_dev(target, t25, anchor);
    			insert_dev(target, p11, anchor);
    			append_dev(p11, strong1);
    			insert_dev(target, t27, anchor);
    			insert_dev(target, p12, anchor);
    			insert_dev(target, t29, anchor);
    			insert_dev(target, p13, anchor);
    			insert_dev(target, t31, anchor);
    			insert_dev(target, p14, anchor);
    			insert_dev(target, t33, anchor);
    			insert_dev(target, p15, anchor);
    			insert_dev(target, t35, anchor);
    			insert_dev(target, p16, anchor);
    			append_dev(p16, strong2);
    			append_dev(p16, t37);
    			insert_dev(target, t38, anchor);
    			insert_dev(target, p17, anchor);
    			append_dev(p17, strong3);
    			append_dev(p17, t40);
    			insert_dev(target, t41, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t43, anchor);
    			insert_dev(target, p18, anchor);
    			append_dev(p18, strong4);
    			append_dev(p18, t45);
    			insert_dev(target, t46, anchor);
    			insert_dev(target, p19, anchor);
    			append_dev(p19, strong5);
    			append_dev(p19, t48);
    			insert_dev(target, t49, anchor);
    			insert_dev(target, p20, anchor);
    			append_dev(p20, strong6);
    			append_dev(p20, t51);
    			insert_dev(target, t52, anchor);
    			insert_dev(target, p21, anchor);
    			append_dev(p21, strong7);
    			append_dev(p21, t54);
    			insert_dev(target, t55, anchor);
    			insert_dev(target, p22, anchor);
    			append_dev(p22, strong8);
    			append_dev(p22, t57);
    			insert_dev(target, t58, anchor);
    			insert_dev(target, p23, anchor);
    			append_dev(p23, strong9);
    			append_dev(p23, t60);
    			insert_dev(target, t61, anchor);
    			insert_dev(target, p24, anchor);
    			append_dev(p24, strong10);
    			append_dev(p24, t63);
    			insert_dev(target, t64, anchor);
    			insert_dev(target, p25, anchor);
    			insert_dev(target, t66, anchor);
    			insert_dev(target, p26, anchor);
    			append_dev(p26, em);
    			insert_dev(target, t68, anchor);
    			insert_dev(target, p27, anchor);
    			append_dev(p27, strong11);
    			insert_dev(target, t70, anchor);
    			insert_dev(target, p28, anchor);
    			insert_dev(target, t72, anchor);
    			insert_dev(target, p29, anchor);
    			append_dev(p29, strong12);
    			insert_dev(target, t74, anchor);
    			insert_dev(target, p30, anchor);
    			insert_dev(target, t76, anchor);
    			insert_dev(target, p31, anchor);
    			insert_dev(target, t78, anchor);
    			insert_dev(target, p32, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    				detach_dev(t1);
    				detach_dev(p0);
    				detach_dev(t3);
    				detach_dev(p1);
    				detach_dev(t5);
    				detach_dev(p2);
    				detach_dev(t7);
    				detach_dev(h20);
    				detach_dev(t9);
    				detach_dev(p3);
    				detach_dev(t11);
    				detach_dev(p4);
    				detach_dev(t13);
    				detach_dev(p5);
    				detach_dev(t15);
    				detach_dev(p6);
    				detach_dev(t17);
    				detach_dev(p7);
    				detach_dev(t19);
    				detach_dev(p8);
    				detach_dev(t21);
    				detach_dev(p9);
    				detach_dev(t23);
    				detach_dev(p10);
    				detach_dev(t25);
    				detach_dev(p11);
    				detach_dev(t27);
    				detach_dev(p12);
    				detach_dev(t29);
    				detach_dev(p13);
    				detach_dev(t31);
    				detach_dev(p14);
    				detach_dev(t33);
    				detach_dev(p15);
    				detach_dev(t35);
    				detach_dev(p16);
    				detach_dev(t38);
    				detach_dev(p17);
    				detach_dev(t41);
    				detach_dev(h21);
    				detach_dev(t43);
    				detach_dev(p18);
    				detach_dev(t46);
    				detach_dev(p19);
    				detach_dev(t49);
    				detach_dev(p20);
    				detach_dev(t52);
    				detach_dev(p21);
    				detach_dev(t55);
    				detach_dev(p22);
    				detach_dev(t58);
    				detach_dev(p23);
    				detach_dev(t61);
    				detach_dev(p24);
    				detach_dev(t64);
    				detach_dev(p25);
    				detach_dev(t66);
    				detach_dev(p26);
    				detach_dev(t68);
    				detach_dev(p27);
    				detach_dev(t70);
    				detach_dev(p28);
    				detach_dev(t72);
    				detach_dev(p29);
    				detach_dev(t74);
    				detach_dev(p30);
    				detach_dev(t76);
    				detach_dev(p31);
    				detach_dev(t78);
    				detach_dev(p32);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$b.name, type: "component", source: "", ctx });
    	return block;
    }

    class SweetRolls extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$b, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "SweetRolls", options, id: create_fragment$b.name });
    	}
    }

    /* src/pages/family/Biscuits.svelte generated by Svelte v3.12.1 */

    const file$c = "src/pages/family/Biscuits.svelte";

    function create_fragment$c(ctx) {
    	var h1, t1, p0, t3, p1, t5, h20, t7, p2, strong0, t9, p3, t11, p4, t13, p5, t15, p6, t17, p7, t19, p8, strong1, t21, p9, t23, p10, t25, h21, t27, p11, strong2, t29, t30, p12, strong3, t32, t33, p13, strong4, t35, t36, p14, strong5, t38, t39, p15, strong6, t41, t42, p16, strong7, t44, t45, p17;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Buttermilk Biscuits";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Every Tuesday morning my cafeteria would make biscuits and sausage gravy.\n  Objectively, it was not good. The biscuits were often times hard and crunchy,\n  instead of soft and fluffy. Its hard to mess up sausage gravy though. I would\n  always make little biscuits and gravy sandwiches stuffed with eggs and bacon.";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "Here's how to make biscuits that live up to my memory of them.";
    			t5 = space();
    			h20 = element("h2");
    			h20.textContent = "Ingredients";
    			t7 = space();
    			p2 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Dry";
    			t9 = space();
    			p3 = element("p");
    			p3.textContent = "1.5 cups of flour";
    			t11 = space();
    			p4 = element("p");
    			p4.textContent = "2 tablespoons of sugar";
    			t13 = space();
    			p5 = element("p");
    			p5.textContent = "1 tablespoon of baking powder";
    			t15 = space();
    			p6 = element("p");
    			p6.textContent = "1/2 teaspoon of baking soda";
    			t17 = space();
    			p7 = element("p");
    			p7.textContent = "Salt";
    			t19 = space();
    			p8 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Wet";
    			t21 = space();
    			p9 = element("p");
    			p9.textContent = "1.5 sticks of frozen butter (6 oz)";
    			t23 = space();
    			p10 = element("p");
    			p10.textContent = "1 1/4 cups of buttermilk (normal milk will work too)";
    			t25 = space();
    			h21 = element("h2");
    			h21.textContent = "Instructions";
    			t27 = space();
    			p11 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Step 1:";
    			t29 = text(" Combine all the dry ingredients together in a bowel and\n  whisk together well");
    			t30 = space();
    			p12 = element("p");
    			strong3 = element("strong");
    			strong3.textContent = "Step 2:";
    			t32 = text(" Grate the two frozen sticks of butter into your bowel\n  of dry ingredients and mix so that all the butter is coated. Its best to wear plastic\n  gloves at this point. You want the butter to remain cold.");
    			t33 = space();
    			p13 = element("p");
    			strong4 = element("strong");
    			strong4.textContent = "Step 3:";
    			t35 = text(" Make a little hole in the center of your dries and add\n  the buttermilk. Using a fork, work in the flour into the buttermilk. It will form\n  a flaky dough.");
    			t36 = space();
    			p14 = element("p");
    			strong5 = element("strong");
    			strong5.textContent = "Step 4:";
    			t38 = text(" Roll out the dough into a sheet. Fold the sheet over itself,\n  like you are folding a sheet of paper. Roll it out again, and then fold it over\n  again. This is called lamination. You want to create flaky layers of dough here.\n  But don't work the dough too hard. You want to prevent gluten development.\n  Gluten results in chewy tough biscuits. You don't want chewy tough biscuits.");
    			t39 = space();
    			p15 = element("p");
    			strong6 = element("strong");
    			strong6.textContent = "Step 5:";
    			t41 = text(" Put your dough into the fridge for 30 mins, again to harden\n  up the butter. Preheat the oven to 400 degrees.");
    			t42 = space();
    			p16 = element("p");
    			strong7 = element("strong");
    			strong7.textContent = "Step 6:";
    			t44 = text(" Roll out your dough to an inch or two thickness and put\n  it in the oven for 25-30 minutes");
    			t45 = space();
    			p17 = element("p");
    			p17.textContent = " ";
    			add_location(h1, file$c, 0, 0, 0);
    			add_location(p0, file$c, 1, 0, 29);
    			add_location(p1, file$c, 7, 0, 354);
    			add_location(h20, file$c, 8, 0, 428);
    			add_location(strong0, file$c, 9, 3, 452);
    			add_location(p2, file$c, 9, 0, 449);
    			add_location(p3, file$c, 10, 0, 477);
    			add_location(p4, file$c, 11, 0, 502);
    			add_location(p5, file$c, 12, 0, 532);
    			add_location(p6, file$c, 13, 0, 569);
    			add_location(p7, file$c, 14, 0, 604);
    			add_location(strong1, file$c, 15, 3, 619);
    			add_location(p8, file$c, 15, 0, 616);
    			add_location(p9, file$c, 16, 0, 644);
    			add_location(p10, file$c, 17, 0, 686);
    			add_location(h21, file$c, 18, 0, 746);
    			add_location(strong2, file$c, 20, 2, 774);
    			add_location(p11, file$c, 19, 0, 768);
    			add_location(strong3, file$c, 24, 2, 888);
    			add_location(p12, file$c, 23, 0, 882);
    			add_location(strong4, file$c, 29, 2, 1126);
    			add_location(p13, file$c, 28, 0, 1120);
    			add_location(strong5, file$c, 34, 2, 1318);
    			add_location(p14, file$c, 33, 0, 1312);
    			add_location(strong6, file$c, 41, 2, 1744);
    			add_location(p15, file$c, 40, 0, 1738);
    			add_location(strong7, file$c, 45, 2, 1890);
    			add_location(p16, file$c, 44, 0, 1884);
    			add_location(p17, file$c, 48, 0, 2011);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p2, anchor);
    			append_dev(p2, strong0);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p3, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p5, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, p6, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, p7, anchor);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, p8, anchor);
    			append_dev(p8, strong1);
    			insert_dev(target, t21, anchor);
    			insert_dev(target, p9, anchor);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, p10, anchor);
    			insert_dev(target, t25, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t27, anchor);
    			insert_dev(target, p11, anchor);
    			append_dev(p11, strong2);
    			append_dev(p11, t29);
    			insert_dev(target, t30, anchor);
    			insert_dev(target, p12, anchor);
    			append_dev(p12, strong3);
    			append_dev(p12, t32);
    			insert_dev(target, t33, anchor);
    			insert_dev(target, p13, anchor);
    			append_dev(p13, strong4);
    			append_dev(p13, t35);
    			insert_dev(target, t36, anchor);
    			insert_dev(target, p14, anchor);
    			append_dev(p14, strong5);
    			append_dev(p14, t38);
    			insert_dev(target, t39, anchor);
    			insert_dev(target, p15, anchor);
    			append_dev(p15, strong6);
    			append_dev(p15, t41);
    			insert_dev(target, t42, anchor);
    			insert_dev(target, p16, anchor);
    			append_dev(p16, strong7);
    			append_dev(p16, t44);
    			insert_dev(target, t45, anchor);
    			insert_dev(target, p17, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    				detach_dev(t1);
    				detach_dev(p0);
    				detach_dev(t3);
    				detach_dev(p1);
    				detach_dev(t5);
    				detach_dev(h20);
    				detach_dev(t7);
    				detach_dev(p2);
    				detach_dev(t9);
    				detach_dev(p3);
    				detach_dev(t11);
    				detach_dev(p4);
    				detach_dev(t13);
    				detach_dev(p5);
    				detach_dev(t15);
    				detach_dev(p6);
    				detach_dev(t17);
    				detach_dev(p7);
    				detach_dev(t19);
    				detach_dev(p8);
    				detach_dev(t21);
    				detach_dev(p9);
    				detach_dev(t23);
    				detach_dev(p10);
    				detach_dev(t25);
    				detach_dev(h21);
    				detach_dev(t27);
    				detach_dev(p11);
    				detach_dev(t30);
    				detach_dev(p12);
    				detach_dev(t33);
    				detach_dev(p13);
    				detach_dev(t36);
    				detach_dev(p14);
    				detach_dev(t39);
    				detach_dev(p15);
    				detach_dev(t42);
    				detach_dev(p16);
    				detach_dev(t45);
    				detach_dev(p17);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$c.name, type: "component", source: "", ctx });
    	return block;
    }

    class Biscuits extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$c, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Biscuits", options, id: create_fragment$c.name });
    	}
    }

    /* src/pages/family/Grits.svelte generated by Svelte v3.12.1 */

    const file$d = "src/pages/family/Grits.svelte";

    function create_fragment$d(ctx) {
    	var h10, t1, p0, t3, h2, t5, p1, t7, p2, t9, p3, t11, p4, t13, p5, t15, p6, t17, p7, t19, h11, t21, p8, strong0, t23, t24, p9, strong1, t26, t27, p10, strong2, t29, t30, p11, strong3, t32;

    	const block = {
    		c: function create() {
    			h10 = element("h1");
    			h10.textContent = "Grits";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Decades ago, grandmother Sandra made a solemn oath to never distribute her\n  famous grits recipe to the various old southern ladies that reside in Virginia\n  Beach. She managed to get the below recipe from a caterer who asked that she\n  keep it secret, lest his grits become common in the area. True to her word, it\n  took literal decades to pry out this recipe. She gave us quite a few red\n  herrings, each time changing the ingredients so that we never quite got the\n  right thing. Eventually, my sister Allie snagged the recipe by taking a\n  picture of it when she wasn't looking.";
    			t3 = space();
    			h2 = element("h2");
    			h2.textContent = "Ingredients";
    			t5 = space();
    			p1 = element("p");
    			p1.textContent = "1 cup of Gruyere cheese, shredded";
    			t7 = space();
    			p2 = element("p");
    			p2.textContent = "1 quart of milk";
    			t9 = space();
    			p3 = element("p");
    			p3.textContent = "1/2 cup of butter and 1/3 cup of butter";
    			t11 = space();
    			p4 = element("p");
    			p4.textContent = "1/2 cup of Parmesan cheese, shredded";
    			t13 = space();
    			p5 = element("p");
    			p5.textContent = "1 cup of slow cooked grits";
    			t15 = space();
    			p6 = element("p");
    			p6.textContent = "1 teaspoon of salt";
    			t17 = space();
    			p7 = element("p");
    			p7.textContent = "1/4 teaspoon of white pepper";
    			t19 = space();
    			h11 = element("h1");
    			h11.textContent = "Instructions";
    			t21 = space();
    			p8 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Step 1:";
    			t23 = text(" Skald milk and add butter. Once the butter is melted,\n  stir in grits. Resume cooking until grits are the consistency of a hot cereal like\n  Cream of Wheat. Remove from heat.");
    			t24 = space();
    			p9 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Step 2:";
    			t26 = text(" Stir in shredded cheeses (Gruyere and Parmesan), salt,\n  and white pepper.");
    			t27 = space();
    			p10 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Step 3:";
    			t29 = text(" Spray casserole dish with cooking oil and pour grits into\n  the dish. Top with a little additional Parmesan shredded cheese. Refrigerate until\n  you are ready to prepare the dinner. (These grits can be prepared a day or two\n  before the meal is served.)");
    			t30 = space();
    			p11 = element("p");
    			strong3 = element("strong");
    			strong3.textContent = "Step 4:";
    			t32 = text(" Bake in the oven at 350 degrees for 30 minutes to 40 minutes\n  or until top is golden");
    			add_location(h10, file$d, 0, 0, 0);
    			add_location(p0, file$d, 1, 0, 15);
    			add_location(h2, file$d, 11, 0, 614);
    			add_location(p1, file$d, 12, 0, 635);
    			add_location(p2, file$d, 13, 0, 676);
    			add_location(p3, file$d, 14, 0, 699);
    			add_location(p4, file$d, 15, 0, 746);
    			add_location(p5, file$d, 16, 0, 790);
    			add_location(p6, file$d, 17, 0, 824);
    			add_location(p7, file$d, 18, 0, 850);
    			add_location(h11, file$d, 19, 0, 886);
    			add_location(strong0, file$d, 21, 2, 914);
    			add_location(p8, file$d, 20, 0, 908);
    			add_location(strong1, file$d, 26, 2, 1125);
    			add_location(p9, file$d, 25, 0, 1119);
    			add_location(strong2, file$d, 30, 2, 1236);
    			add_location(p10, file$d, 29, 0, 1230);
    			add_location(strong3, file$d, 36, 2, 1526);
    			add_location(p11, file$d, 35, 0, 1520);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h10, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p3, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p5, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, p6, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, p7, anchor);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, h11, anchor);
    			insert_dev(target, t21, anchor);
    			insert_dev(target, p8, anchor);
    			append_dev(p8, strong0);
    			append_dev(p8, t23);
    			insert_dev(target, t24, anchor);
    			insert_dev(target, p9, anchor);
    			append_dev(p9, strong1);
    			append_dev(p9, t26);
    			insert_dev(target, t27, anchor);
    			insert_dev(target, p10, anchor);
    			append_dev(p10, strong2);
    			append_dev(p10, t29);
    			insert_dev(target, t30, anchor);
    			insert_dev(target, p11, anchor);
    			append_dev(p11, strong3);
    			append_dev(p11, t32);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h10);
    				detach_dev(t1);
    				detach_dev(p0);
    				detach_dev(t3);
    				detach_dev(h2);
    				detach_dev(t5);
    				detach_dev(p1);
    				detach_dev(t7);
    				detach_dev(p2);
    				detach_dev(t9);
    				detach_dev(p3);
    				detach_dev(t11);
    				detach_dev(p4);
    				detach_dev(t13);
    				detach_dev(p5);
    				detach_dev(t15);
    				detach_dev(p6);
    				detach_dev(t17);
    				detach_dev(p7);
    				detach_dev(t19);
    				detach_dev(h11);
    				detach_dev(t21);
    				detach_dev(p8);
    				detach_dev(t24);
    				detach_dev(p9);
    				detach_dev(t27);
    				detach_dev(p10);
    				detach_dev(t30);
    				detach_dev(p11);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$d.name, type: "component", source: "", ctx });
    	return block;
    }

    class Grits extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$d, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Grits", options, id: create_fragment$d.name });
    	}
    }

    /* src/pages/family/SweetPotatoSoup.svelte generated by Svelte v3.12.1 */

    const file$e = "src/pages/family/SweetPotatoSoup.svelte";

    function create_fragment$e(ctx) {
    	var h1, t1, p0, t3, p1, t5, h20, t7, p2, strong0, t9, p3, t11, p4, t13, p5, t15, p6, t17, p7, strong1, t19, p8, t21, p9, strong2, t23, p10, t25, p11, t27, p12, t29, h21, t31, p13, strong3, t33, t34, p14, strong4, t36, t37, p15, strong5, t39, t40, p16, strong6, t42, t43, p17, strong7, t45, strong8, t47, p18, strong9, t49, t50, p19, strong10, t52;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Sweet Potato Soup";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Good comfort food is warm and filing. Great comfort food is also good for you.\n  Sweet potato soup is great comfort food. This recipe is easy, taking a little\n  less than an hour, with most of that time spent waiting for veggies to cook.";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "With this recipe, you will make a full pot of soup, providing four servings. I\n  think this is best served with good bread, such as a quarter of a baguette.";
    			t5 = space();
    			h20 = element("h2");
    			h20.textContent = "Ingredients";
    			t7 = space();
    			p2 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Veggies";
    			t9 = space();
    			p3 = element("p");
    			p3.textContent = "1 sweet potato";
    			t11 = space();
    			p4 = element("p");
    			p4.textContent = "1/2 a pound of carrots";
    			t13 = space();
    			p5 = element("p");
    			p5.textContent = "1 small white onion";
    			t15 = space();
    			p6 = element("p");
    			p6.textContent = "1/2 of a fuji/honeycrisp apple";
    			t17 = space();
    			p7 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Spices";
    			t19 = space();
    			p8 = element("p");
    			p8.textContent = "3 teaspoons of curry";
    			t21 = space();
    			p9 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Other";
    			t23 = space();
    			p10 = element("p");
    			p10.textContent = "4 cups of chicken broth (this is one Swanson package)";
    			t25 = space();
    			p11 = element("p");
    			p11.textContent = "1 tablespoon of honey";
    			t27 = space();
    			p12 = element("p");
    			p12.textContent = "4 tablespoons of butter";
    			t29 = space();
    			h21 = element("h2");
    			h21.textContent = "Instructions";
    			t31 = space();
    			p13 = element("p");
    			strong3 = element("strong");
    			strong3.textContent = "Step 1:";
    			t33 = text(" Cook the onions in the bottom of a medium size pot with\n  4 tablespoons of butter");
    			t34 = space();
    			p14 = element("p");
    			strong4 = element("strong");
    			strong4.textContent = "Step 2:";
    			t36 = text(" Once the onions are translucent, add the curry powder.\n  Stir it up!");
    			t37 = space();
    			p15 = element("p");
    			strong5 = element("strong");
    			strong5.textContent = "Step 3:";
    			t39 = text(" Add chicken broth and bring to a boil");
    			t40 = space();
    			p16 = element("p");
    			strong6 = element("strong");
    			strong6.textContent = "Step 4:";
    			t42 = text(" While the chicken broth is coming to a boil, peel and\n  cut the sweet potato and carrots into cubes");
    			t43 = space();
    			p17 = element("p");
    			strong7 = element("strong");
    			strong7.textContent = "Step 5:";
    			t45 = text(" Add the sweet potato and carrot, cover and boil for\n  around ");
    			strong8 = element("strong");
    			strong8.textContent = "20 minutes";
    			t47 = space();
    			p18 = element("p");
    			strong9 = element("strong");
    			strong9.textContent = "Step 6:";
    			t49 = text(" Peel the apple and cut half of it into cubes. After the\n  potato and carrots have softened, which again takes about 20 minutes, add the apple\n  in. Cook with the apple for about 1 or 2 minutes.");
    			t50 = space();
    			p19 = element("p");
    			strong10 = element("strong");
    			strong10.textContent = "Step 7:";
    			t52 = text(" Using a stick blender, blend the soup until there are\n  no more chunks");
    			add_location(h1, file$e, 0, 0, 0);
    			add_location(p0, file$e, 1, 0, 27);
    			add_location(p1, file$e, 6, 0, 276);
    			add_location(h20, file$e, 10, 0, 444);
    			add_location(strong0, file$e, 11, 3, 468);
    			add_location(p2, file$e, 11, 0, 465);
    			add_location(p3, file$e, 12, 0, 497);
    			add_location(p4, file$e, 13, 0, 519);
    			add_location(p5, file$e, 14, 0, 549);
    			add_location(p6, file$e, 15, 0, 576);
    			add_location(strong1, file$e, 16, 3, 617);
    			add_location(p7, file$e, 16, 0, 614);
    			add_location(p8, file$e, 17, 0, 645);
    			add_location(strong2, file$e, 18, 3, 676);
    			add_location(p9, file$e, 18, 0, 673);
    			add_location(p10, file$e, 19, 0, 703);
    			add_location(p11, file$e, 20, 0, 764);
    			add_location(p12, file$e, 21, 0, 793);
    			add_location(h21, file$e, 22, 0, 824);
    			add_location(strong3, file$e, 24, 2, 852);
    			add_location(p13, file$e, 23, 0, 846);
    			add_location(strong4, file$e, 28, 2, 970);
    			add_location(p14, file$e, 27, 0, 964);
    			add_location(strong5, file$e, 31, 3, 1072);
    			add_location(p15, file$e, 31, 0, 1069);
    			add_location(strong6, file$e, 33, 2, 1145);
    			add_location(p16, file$e, 32, 0, 1139);
    			add_location(strong7, file$e, 37, 2, 1281);
    			add_location(strong8, file$e, 38, 9, 1367);
    			add_location(p17, file$e, 36, 0, 1275);
    			add_location(strong9, file$e, 41, 2, 1406);
    			add_location(p18, file$e, 40, 0, 1400);
    			add_location(strong10, file$e, 46, 2, 1636);
    			add_location(p19, file$e, 45, 0, 1630);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p2, anchor);
    			append_dev(p2, strong0);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p3, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p5, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, p6, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, p7, anchor);
    			append_dev(p7, strong1);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, p8, anchor);
    			insert_dev(target, t21, anchor);
    			insert_dev(target, p9, anchor);
    			append_dev(p9, strong2);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, p10, anchor);
    			insert_dev(target, t25, anchor);
    			insert_dev(target, p11, anchor);
    			insert_dev(target, t27, anchor);
    			insert_dev(target, p12, anchor);
    			insert_dev(target, t29, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t31, anchor);
    			insert_dev(target, p13, anchor);
    			append_dev(p13, strong3);
    			append_dev(p13, t33);
    			insert_dev(target, t34, anchor);
    			insert_dev(target, p14, anchor);
    			append_dev(p14, strong4);
    			append_dev(p14, t36);
    			insert_dev(target, t37, anchor);
    			insert_dev(target, p15, anchor);
    			append_dev(p15, strong5);
    			append_dev(p15, t39);
    			insert_dev(target, t40, anchor);
    			insert_dev(target, p16, anchor);
    			append_dev(p16, strong6);
    			append_dev(p16, t42);
    			insert_dev(target, t43, anchor);
    			insert_dev(target, p17, anchor);
    			append_dev(p17, strong7);
    			append_dev(p17, t45);
    			append_dev(p17, strong8);
    			insert_dev(target, t47, anchor);
    			insert_dev(target, p18, anchor);
    			append_dev(p18, strong9);
    			append_dev(p18, t49);
    			insert_dev(target, t50, anchor);
    			insert_dev(target, p19, anchor);
    			append_dev(p19, strong10);
    			append_dev(p19, t52);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    				detach_dev(t1);
    				detach_dev(p0);
    				detach_dev(t3);
    				detach_dev(p1);
    				detach_dev(t5);
    				detach_dev(h20);
    				detach_dev(t7);
    				detach_dev(p2);
    				detach_dev(t9);
    				detach_dev(p3);
    				detach_dev(t11);
    				detach_dev(p4);
    				detach_dev(t13);
    				detach_dev(p5);
    				detach_dev(t15);
    				detach_dev(p6);
    				detach_dev(t17);
    				detach_dev(p7);
    				detach_dev(t19);
    				detach_dev(p8);
    				detach_dev(t21);
    				detach_dev(p9);
    				detach_dev(t23);
    				detach_dev(p10);
    				detach_dev(t25);
    				detach_dev(p11);
    				detach_dev(t27);
    				detach_dev(p12);
    				detach_dev(t29);
    				detach_dev(h21);
    				detach_dev(t31);
    				detach_dev(p13);
    				detach_dev(t34);
    				detach_dev(p14);
    				detach_dev(t37);
    				detach_dev(p15);
    				detach_dev(t40);
    				detach_dev(p16);
    				detach_dev(t43);
    				detach_dev(p17);
    				detach_dev(t47);
    				detach_dev(p18);
    				detach_dev(t50);
    				detach_dev(p19);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$e.name, type: "component", source: "", ctx });
    	return block;
    }

    class SweetPotatoSoup extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$e, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "SweetPotatoSoup", options, id: create_fragment$e.name });
    	}
    }

    /* src/pages/french/RoastedCarrots.svelte generated by Svelte v3.12.1 */

    const file$f = "src/pages/french/RoastedCarrots.svelte";

    function create_fragment$f(ctx) {
    	var h1, t1, p0, t3, h20, t5, p1, t7, p2, t9, p3, t11, p4, t13, p5, t15, h21, t17, p6, strong0, t19, t20, p7, strong1, t22, t23, p8, strong2, t25, t26, p9, strong3, t28, t29, p10, strong4, t31;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Roasted Carrots";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Carrots taste awful raw. They are tough, overly fibrous, and basically just a\n  vessel to serve greater foods and textures like ranch and hummus. But once\n  cooked, they undergo the most delicious transformation. They become soft and\n  sweet and filing. They grow into their own. Properly spiced and seasoned,\n  carrots can be the main attraction.";
    			t3 = space();
    			h20 = element("h2");
    			h20.textContent = "Ingredients";
    			t5 = space();
    			p1 = element("p");
    			p1.textContent = "Carrots (real carrots, not baby carrots)";
    			t7 = space();
    			p2 = element("p");
    			p2.textContent = "Olive Oil";
    			t9 = space();
    			p3 = element("p");
    			p3.textContent = "Lemon";
    			t11 = space();
    			p4 = element("p");
    			p4.textContent = "Rosemary, thyme, sage or bay";
    			t13 = space();
    			p5 = element("p");
    			p5.textContent = "Cloves of Garlic";
    			t15 = space();
    			h21 = element("h2");
    			h21.textContent = "Instructions";
    			t17 = space();
    			p6 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Step 1:";
    			t19 = text(" Cut carrots into large chunks");
    			t20 = space();
    			p7 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Step 2:";
    			t22 = text(" Add carrots to a pot of boiling water seasoned with salt,\n  cook until you are just able to pierce them with a fork but not until fully cooked");
    			t23 = space();
    			p8 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Step 3:";
    			t25 = text(" Dice herbs and smash garlic with wide side of a chef's\n  nice. Set oven to 425 degrees");
    			t26 = space();
    			p9 = element("p");
    			strong3 = element("strong");
    			strong3.textContent = "Step 4:";
    			t28 = text(" Add the cooked carrots to a bowl. Toss with salt, olive\n  oil, a squeeze of lemon, garlic, and herbs");
    			t29 = space();
    			p10 = element("p");
    			strong4 = element("strong");
    			strong4.textContent = "Step 5:";
    			t31 = text(" Roast in oven for around half an hour");
    			add_location(h1, file$f, 0, 0, 0);
    			add_location(p0, file$f, 1, 0, 25);
    			add_location(h20, file$f, 8, 0, 384);
    			add_location(p1, file$f, 9, 0, 405);
    			add_location(p2, file$f, 10, 0, 453);
    			add_location(p3, file$f, 11, 0, 470);
    			add_location(p4, file$f, 12, 0, 483);
    			add_location(p5, file$f, 13, 0, 519);
    			add_location(h21, file$f, 14, 0, 543);
    			add_location(strong0, file$f, 15, 3, 568);
    			add_location(p6, file$f, 15, 0, 565);
    			add_location(strong1, file$f, 17, 2, 633);
    			add_location(p7, file$f, 16, 0, 627);
    			add_location(strong2, file$f, 21, 2, 812);
    			add_location(p8, file$f, 20, 0, 806);
    			add_location(strong3, file$f, 25, 2, 939);
    			add_location(p9, file$f, 24, 0, 933);
    			add_location(strong4, file$f, 28, 3, 1073);
    			add_location(p10, file$f, 28, 0, 1070);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p3, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p5, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, p6, anchor);
    			append_dev(p6, strong0);
    			append_dev(p6, t19);
    			insert_dev(target, t20, anchor);
    			insert_dev(target, p7, anchor);
    			append_dev(p7, strong1);
    			append_dev(p7, t22);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, p8, anchor);
    			append_dev(p8, strong2);
    			append_dev(p8, t25);
    			insert_dev(target, t26, anchor);
    			insert_dev(target, p9, anchor);
    			append_dev(p9, strong3);
    			append_dev(p9, t28);
    			insert_dev(target, t29, anchor);
    			insert_dev(target, p10, anchor);
    			append_dev(p10, strong4);
    			append_dev(p10, t31);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    				detach_dev(t1);
    				detach_dev(p0);
    				detach_dev(t3);
    				detach_dev(h20);
    				detach_dev(t5);
    				detach_dev(p1);
    				detach_dev(t7);
    				detach_dev(p2);
    				detach_dev(t9);
    				detach_dev(p3);
    				detach_dev(t11);
    				detach_dev(p4);
    				detach_dev(t13);
    				detach_dev(p5);
    				detach_dev(t15);
    				detach_dev(h21);
    				detach_dev(t17);
    				detach_dev(p6);
    				detach_dev(t20);
    				detach_dev(p7);
    				detach_dev(t23);
    				detach_dev(p8);
    				detach_dev(t26);
    				detach_dev(p9);
    				detach_dev(t29);
    				detach_dev(p10);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$f.name, type: "component", source: "", ctx });
    	return block;
    }

    class RoastedCarrots extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$f, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "RoastedCarrots", options, id: create_fragment$f.name });
    	}
    }

    /* src/pages/french/CoqAuVin.svelte generated by Svelte v3.12.1 */

    const file$g = "src/pages/french/CoqAuVin.svelte";

    function create_fragment$g(ctx) {
    	var h1, t1, p0, t3, p1, t5, h20, t7, p2, t9, p3, t11, p4, t13, p5, t15, p6, t17, p7, t19, p8, t21, p9, t23, p10, t25, p11, t27, h21, t29, p12, strong0, t31, t32, p13, strong1, t34, t35, p14, strong2, t37, t38, p15, strong3, t40, t41, p16, strong4, t43, t44, p17;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Coq Au Vin";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "One of my favorite things to do is to buy a whole chicken from the supermarket\n  and break it down into the two breasts, two legs, and two thighs. I use the\n  rest to make stock. This leads me to need a chicken breast and chicken thigh\n  meal for each week. The chicken breast meal is usually pretty straight\n  forward. The thigh meals are more interesting.";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "Due to the higher fat content of the thighs, it stands up well to a braise.\n  Coq Au Vin is a French flavored braise of the chicken thighs. Its rich,\n  unctuous and quite easy to make.";
    			t5 = space();
    			h20 = element("h2");
    			h20.textContent = "Ingredients";
    			t7 = space();
    			p2 = element("p");
    			p2.textContent = "2 chicken legs";
    			t9 = space();
    			p3 = element("p");
    			p3.textContent = "2 chicken thighs";
    			t11 = space();
    			p4 = element("p");
    			p4.textContent = "1 yellow onion";
    			t13 = space();
    			p5 = element("p");
    			p5.textContent = "4 strips of bacon";
    			t15 = space();
    			p6 = element("p");
    			p6.textContent = "3 carrots";
    			t17 = space();
    			p7 = element("p");
    			p7.textContent = "1/2 pound of mushrooms";
    			t19 = space();
    			p8 = element("p");
    			p8.textContent = "Tomato paste";
    			t21 = space();
    			p9 = element("p");
    			p9.textContent = "Minced garlic";
    			t23 = space();
    			p10 = element("p");
    			p10.textContent = "1 cup of wine";
    			t25 = space();
    			p11 = element("p");
    			p11.textContent = "1 cup of chicken stock";
    			t27 = space();
    			h21 = element("h2");
    			h21.textContent = "Instructions";
    			t29 = space();
    			p12 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Step 1:";
    			t31 = text(" Marinate the chicken in wine and chicken stock");
    			t32 = space();
    			p13 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Step 2:";
    			t34 = text(" Cut the bacon into bits and fry in a cast iron pan. Reserve\n  the bacon on the side (I often cook this without bacon)");
    			t35 = space();
    			p14 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Step 3:";
    			t37 = text(" Brown the chicken in the cast iron. The cast iron should\n  be pretty hot to get a good sear. You will finish in the oven, so don't worry\n  about getting everything cooked. Reserve the wine from the marinade.");
    			t38 = space();
    			p15 = element("p");
    			strong3 = element("strong");
    			strong3.textContent = "Step 4:";
    			t40 = text(" Remove the chicken and cook a diced onion and garlic.\n  I would suggest waiting a second before tossing in the onion and garlic. While\n  the chicken needs high heat to get a proper sear, the onion and especially garlic\n  will burn if the iron is too hot");
    			t41 = space();
    			p16 = element("p");
    			strong4 = element("strong");
    			strong4.textContent = "Step 5:";
    			t43 = text(" Add back the wine, the chicken and the bacon to the pan\n  with cooked onions. Add mushrooms and carrots. Place into a 350 degree oven for\n  1 hour");
    			t44 = space();
    			p17 = element("p");
    			p17.textContent = " ";
    			add_location(h1, file$g, 0, 0, 0);
    			add_location(p0, file$g, 1, 0, 20);
    			add_location(p1, file$g, 8, 0, 389);
    			add_location(h20, file$g, 13, 0, 585);
    			add_location(p2, file$g, 14, 0, 606);
    			add_location(p3, file$g, 15, 0, 628);
    			add_location(p4, file$g, 16, 0, 652);
    			add_location(p5, file$g, 17, 0, 674);
    			add_location(p6, file$g, 18, 0, 699);
    			add_location(p7, file$g, 19, 0, 716);
    			add_location(p8, file$g, 20, 0, 746);
    			add_location(p9, file$g, 21, 0, 766);
    			add_location(p10, file$g, 22, 0, 787);
    			add_location(p11, file$g, 23, 0, 808);
    			add_location(h21, file$g, 24, 0, 838);
    			add_location(strong0, file$g, 25, 3, 863);
    			add_location(p12, file$g, 25, 0, 860);
    			add_location(strong1, file$g, 27, 2, 946);
    			add_location(p13, file$g, 26, 0, 940);
    			add_location(strong2, file$g, 31, 2, 1100);
    			add_location(p14, file$g, 30, 0, 1094);
    			add_location(strong3, file$g, 36, 2, 1348);
    			add_location(p15, file$g, 35, 0, 1342);
    			add_location(strong4, file$g, 42, 2, 1638);
    			add_location(p16, file$g, 41, 0, 1632);
    			add_location(p17, file$g, 46, 0, 1815);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p3, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p5, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, p6, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, p7, anchor);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, p8, anchor);
    			insert_dev(target, t21, anchor);
    			insert_dev(target, p9, anchor);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, p10, anchor);
    			insert_dev(target, t25, anchor);
    			insert_dev(target, p11, anchor);
    			insert_dev(target, t27, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t29, anchor);
    			insert_dev(target, p12, anchor);
    			append_dev(p12, strong0);
    			append_dev(p12, t31);
    			insert_dev(target, t32, anchor);
    			insert_dev(target, p13, anchor);
    			append_dev(p13, strong1);
    			append_dev(p13, t34);
    			insert_dev(target, t35, anchor);
    			insert_dev(target, p14, anchor);
    			append_dev(p14, strong2);
    			append_dev(p14, t37);
    			insert_dev(target, t38, anchor);
    			insert_dev(target, p15, anchor);
    			append_dev(p15, strong3);
    			append_dev(p15, t40);
    			insert_dev(target, t41, anchor);
    			insert_dev(target, p16, anchor);
    			append_dev(p16, strong4);
    			append_dev(p16, t43);
    			insert_dev(target, t44, anchor);
    			insert_dev(target, p17, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    				detach_dev(t1);
    				detach_dev(p0);
    				detach_dev(t3);
    				detach_dev(p1);
    				detach_dev(t5);
    				detach_dev(h20);
    				detach_dev(t7);
    				detach_dev(p2);
    				detach_dev(t9);
    				detach_dev(p3);
    				detach_dev(t11);
    				detach_dev(p4);
    				detach_dev(t13);
    				detach_dev(p5);
    				detach_dev(t15);
    				detach_dev(p6);
    				detach_dev(t17);
    				detach_dev(p7);
    				detach_dev(t19);
    				detach_dev(p8);
    				detach_dev(t21);
    				detach_dev(p9);
    				detach_dev(t23);
    				detach_dev(p10);
    				detach_dev(t25);
    				detach_dev(p11);
    				detach_dev(t27);
    				detach_dev(h21);
    				detach_dev(t29);
    				detach_dev(p12);
    				detach_dev(t32);
    				detach_dev(p13);
    				detach_dev(t35);
    				detach_dev(p14);
    				detach_dev(t38);
    				detach_dev(p15);
    				detach_dev(t41);
    				detach_dev(p16);
    				detach_dev(t44);
    				detach_dev(p17);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$g.name, type: "component", source: "", ctx });
    	return block;
    }

    class CoqAuVin extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$g, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "CoqAuVin", options, id: create_fragment$g.name });
    	}
    }

    /* src/pages/french/BeefBourguignon.svelte generated by Svelte v3.12.1 */

    const file$h = "src/pages/french/BeefBourguignon.svelte";

    function create_fragment$h(ctx) {
    	var h1, t1, p0, t3, h20, t5, p1, t7, p2, t9, p3, t11, p4, t13, p5, t15, p6, t17, p7, t19, p8, t21, p9, t23, p10, t25, p11, t27, h21, t29, p12, strong0, t31, t32, p13, strong1, t34, t35, p14, strong2, t37, t38, p15, strong3, t40, t41, p16, strong4, t43, t44, p17, strong5, t46, t47, p18, strong6, t49, t50, p19, strong7, t52;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Beef Bourguignon";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "The first time I cooked dinner for my girlfriend's parents, I used this\n  recipe. While there are a lot of ingredients to be found here, the actual\n  cooking of the dish has very little hands on time. You will get something akin\n  to Coq Au Vin but with a somewhat richer texture and taste. You can serve this\n  with noodles or turn it into a gravy and serve with mashed potatoes.";
    			t3 = space();
    			h20 = element("h2");
    			h20.textContent = "Ingredients";
    			t5 = space();
    			p1 = element("p");
    			p1.textContent = "2 stalks of celery";
    			t7 = space();
    			p2 = element("p");
    			p2.textContent = "1 yellow onion";
    			t9 = space();
    			p3 = element("p");
    			p3.textContent = "minced garlic";
    			t11 = space();
    			p4 = element("p");
    			p4.textContent = "1 lb of a fatty beef (stew beef or short ribs)";
    			t13 = space();
    			p5 = element("p");
    			p5.textContent = "3 carrots";
    			t15 = space();
    			p6 = element("p");
    			p6.textContent = "3 table spoons of tomato paste";
    			t17 = space();
    			p7 = element("p");
    			p7.textContent = "2 cups of red wine";
    			t19 = space();
    			p8 = element("p");
    			p8.textContent = "2 cups of chicken or beef stock";
    			t21 = space();
    			p9 = element("p");
    			p9.textContent = "Parsley and thyme";
    			t23 = space();
    			p10 = element("p");
    			p10.textContent = "Flour";
    			t25 = space();
    			p11 = element("p");
    			p11.textContent = "Egg noodles";
    			t27 = space();
    			h21 = element("h2");
    			h21.textContent = "Instructions";
    			t29 = space();
    			p12 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Step 1:";
    			t31 = text(" Brown the beef in the bottom of your dutch oven. Set aside\n  when golden brown");
    			t32 = space();
    			p13 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Step 2:";
    			t34 = text(" Dice onion and add to the dutch oven. Cook until translucent.\n  Add tomato paste and a spoonful of flour");
    			t35 = space();
    			p14 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Step 3:";
    			t37 = text(" Add red wine and stock. Cut carrots into big thick pieces\n  and add to the stew. Add parsley and thyme.");
    			t38 = space();
    			p15 = element("p");
    			strong3 = element("strong");
    			strong3.textContent = "Step 4:";
    			t40 = text(" Cook for three hour on low heat until the meat is fork\n  tender (the broth should be at about 200 degrees for the duration of the cooking\n  process)");
    			t41 = space();
    			p16 = element("p");
    			strong4 = element("strong");
    			strong4.textContent = "Step 5:";
    			t43 = text(" When the stew is 10 minutes out, cook noodles. Stir in\n  chopped parsley with the noodles right before plating for extra color");
    			t44 = space();
    			p17 = element("p");
    			strong5 = element("strong");
    			strong5.textContent = "Step 5:";
    			t46 = text(" When the beef is just about ready, cook the mushrooms\n  in butter and garlic");
    			t47 = space();
    			p18 = element("p");
    			strong6 = element("strong");
    			strong6.textContent = "Step 6:";
    			t49 = text(" Add the mushrooms to the stew. If the stew is too thin,\n  add more flour. Take out the spent parsley and thyme.");
    			t50 = space();
    			p19 = element("p");
    			strong7 = element("strong");
    			strong7.textContent = "Step 7:";
    			t52 = text(" If you would like the stew to become a gravy, strain out\n  all the ingredients with a colander. On a frying pan, add a pad of butter. Wait\n  until it melts and add some flour. Pour in the broth and mix with a spatula");
    			add_location(h1, file$h, 0, 0, 0);
    			add_location(p0, file$h, 1, 0, 26);
    			add_location(h20, file$h, 8, 0, 422);
    			add_location(p1, file$h, 9, 0, 443);
    			add_location(p2, file$h, 10, 0, 469);
    			add_location(p3, file$h, 11, 0, 491);
    			add_location(p4, file$h, 12, 0, 512);
    			add_location(p5, file$h, 13, 0, 566);
    			add_location(p6, file$h, 14, 0, 583);
    			add_location(p7, file$h, 15, 0, 621);
    			add_location(p8, file$h, 16, 0, 647);
    			add_location(p9, file$h, 17, 0, 686);
    			add_location(p10, file$h, 18, 0, 711);
    			add_location(p11, file$h, 19, 0, 724);
    			add_location(h21, file$h, 20, 0, 743);
    			add_location(strong0, file$h, 22, 2, 771);
    			add_location(p12, file$h, 21, 0, 765);
    			add_location(strong1, file$h, 26, 2, 886);
    			add_location(p13, file$h, 25, 0, 880);
    			add_location(strong2, file$h, 30, 2, 1027);
    			add_location(p14, file$h, 29, 0, 1021);
    			add_location(strong3, file$h, 34, 2, 1167);
    			add_location(p15, file$h, 33, 0, 1161);
    			add_location(strong4, file$h, 39, 2, 1352);
    			add_location(p16, file$h, 38, 0, 1346);
    			add_location(strong5, file$h, 43, 2, 1515);
    			add_location(p17, file$h, 42, 0, 1509);
    			add_location(strong6, file$h, 47, 2, 1628);
    			add_location(p18, file$h, 46, 0, 1622);
    			add_location(strong7, file$h, 51, 2, 1776);
    			add_location(p19, file$h, 50, 0, 1770);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p3, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p5, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, p6, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, p7, anchor);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, p8, anchor);
    			insert_dev(target, t21, anchor);
    			insert_dev(target, p9, anchor);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, p10, anchor);
    			insert_dev(target, t25, anchor);
    			insert_dev(target, p11, anchor);
    			insert_dev(target, t27, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t29, anchor);
    			insert_dev(target, p12, anchor);
    			append_dev(p12, strong0);
    			append_dev(p12, t31);
    			insert_dev(target, t32, anchor);
    			insert_dev(target, p13, anchor);
    			append_dev(p13, strong1);
    			append_dev(p13, t34);
    			insert_dev(target, t35, anchor);
    			insert_dev(target, p14, anchor);
    			append_dev(p14, strong2);
    			append_dev(p14, t37);
    			insert_dev(target, t38, anchor);
    			insert_dev(target, p15, anchor);
    			append_dev(p15, strong3);
    			append_dev(p15, t40);
    			insert_dev(target, t41, anchor);
    			insert_dev(target, p16, anchor);
    			append_dev(p16, strong4);
    			append_dev(p16, t43);
    			insert_dev(target, t44, anchor);
    			insert_dev(target, p17, anchor);
    			append_dev(p17, strong5);
    			append_dev(p17, t46);
    			insert_dev(target, t47, anchor);
    			insert_dev(target, p18, anchor);
    			append_dev(p18, strong6);
    			append_dev(p18, t49);
    			insert_dev(target, t50, anchor);
    			insert_dev(target, p19, anchor);
    			append_dev(p19, strong7);
    			append_dev(p19, t52);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    				detach_dev(t1);
    				detach_dev(p0);
    				detach_dev(t3);
    				detach_dev(h20);
    				detach_dev(t5);
    				detach_dev(p1);
    				detach_dev(t7);
    				detach_dev(p2);
    				detach_dev(t9);
    				detach_dev(p3);
    				detach_dev(t11);
    				detach_dev(p4);
    				detach_dev(t13);
    				detach_dev(p5);
    				detach_dev(t15);
    				detach_dev(p6);
    				detach_dev(t17);
    				detach_dev(p7);
    				detach_dev(t19);
    				detach_dev(p8);
    				detach_dev(t21);
    				detach_dev(p9);
    				detach_dev(t23);
    				detach_dev(p10);
    				detach_dev(t25);
    				detach_dev(p11);
    				detach_dev(t27);
    				detach_dev(h21);
    				detach_dev(t29);
    				detach_dev(p12);
    				detach_dev(t32);
    				detach_dev(p13);
    				detach_dev(t35);
    				detach_dev(p14);
    				detach_dev(t38);
    				detach_dev(p15);
    				detach_dev(t41);
    				detach_dev(p16);
    				detach_dev(t44);
    				detach_dev(p17);
    				detach_dev(t47);
    				detach_dev(p18);
    				detach_dev(t50);
    				detach_dev(p19);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$h.name, type: "component", source: "", ctx });
    	return block;
    }

    class BeefBourguignon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$h, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "BeefBourguignon", options, id: create_fragment$h.name });
    	}
    }

    /* src/pages/french/Baguette.svelte generated by Svelte v3.12.1 */

    const file$i = "src/pages/french/Baguette.svelte";

    function create_fragment$i(ctx) {
    	var h1, t1, p0, t3, p1, t5, h20, t7, p2, t9, p3, t11, p4, t13, p5, t15, h21, t17, p6, strong0, t19, t20, p7, strong1, t22, t23, p8, strong2, t25, strong3, t27, t28, p9, strong4, t30, em, t32, t33, p10, strong5, t35, t36, p11, strong6, t38, t39, p12, strong7, t41, t42, p13, strong8, t44, t45, p14, strong9, t47, t48, p15;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "French Baguette";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Making a French baguette is about setting a schedule, walking over to a bowl\n  with weird sticky dough, flopping it over and then popping that into the oven.\n  It's kind of like cooking but feels more like babysitting.";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "The end result is fresh bread that tastes like the platonic ideal of bread.\n  It's beautiful, fragrant, and makes something that is usually an\n  afterthought, the main attraction.";
    			t5 = space();
    			h20 = element("h2");
    			h20.textContent = "Ingredients";
    			t7 = space();
    			p2 = element("p");
    			p2.textContent = "1.5 cups of 100 degree water";
    			t9 = space();
    			p3 = element("p");
    			p3.textContent = "2 cups of flour";
    			t11 = space();
    			p4 = element("p");
    			p4.textContent = "1 packet of instant yeast";
    			t13 = space();
    			p5 = element("p");
    			p5.textContent = "Salt";
    			t15 = space();
    			h21 = element("h2");
    			h21.textContent = "Instructions";
    			t17 = space();
    			p6 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Step 1:";
    			t19 = text(" Proof your yeast by adding a packet of instant yeast and\n  a spoonful of flour to lukewarm (100 degrees) water. Give it five minutes. Some\n  bubbles should start to form at the top. This indicates that the yeast is in fact\n  alive");
    			t20 = space();
    			p7 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Step 2:";
    			t22 = text(" Add two cups of flour and a generous dash of salt to a\n  greased, very large bowl. I like to use my dutch oven for this since I can use\n  the lid instead of plastic wrap");
    			t23 = space();
    			p8 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Step 3:";
    			t25 = text(" Mix the flour, yeast and warm water together. This is\n  a high hydration dough so it will be ");
    			strong3 = element("strong");
    			strong3.textContent = "very";
    			t27 = text(" sticky. Cover the dough\n  and let rest for 15 minutes");
    			t28 = space();
    			p9 = element("p");
    			strong4 = element("strong");
    			strong4.textContent = "Step 4:";
    			t30 = text(" We will be kneading the dough using something called\n  the stretch and fold method. This method takes ");
    			em = element("em");
    			em.textContent = "a lot";
    			t32 = text(" longer but is also\n  much easier. To stretch and fold, grab one corner of the dough and pull it as high\n  as it will go without breaking, then fold it over top of the rest of the dough.\n  It is as if you are draping it over itself. Do this five or six times, rotating\n  the dough each time. After you have done this, flip the dough over and let rest\n  for 25 minutes.");
    			t33 = space();
    			p10 = element("p");
    			strong5 = element("strong");
    			strong5.textContent = "Step 5-8:";
    			t35 = text(" Repeat this three to four more time until a gluten network\n  has formed. After each time you let the bread rest, you should be able to pull\n  the dough farther and farther. You can test if the gluten is strong enough by cutting\n  off a piece of the dough and stretching it out in your hands. You will want it\n  to be thin enough that it forms a \"gluten window\".");
    			t36 = space();
    			p11 = element("p");
    			strong6 = element("strong");
    			strong6.textContent = "Step 9:";
    			t38 = text(" Flour your workspace and divide your dough into two or\n  three equal parts. Stretch out your dough into rectangles. Folding lengthwise,\n  fold the dough in half and pinch off to seal the dough. Fold in half again lengthwise\n  and seal off the dough. This should create a log of dough. Place these on parchment\n  paper.");
    			t39 = space();
    			p12 = element("p");
    			strong7 = element("strong");
    			strong7.textContent = "Step 10:";
    			t41 = text(" Let the dough rest for 1 hour or until it becomes 1.5x\n  its size. When there is about 20 minutes left in the final rest, turn on the oven\n  to 475 degrees. Put your baking sheet in the middle rack and a casserole dish of\n  water on the bottom rack.");
    			t42 = space();
    			p13 = element("p");
    			strong8 = element("strong");
    			strong8.textContent = "Step 11:";
    			t44 = text(" After the dough has risen, score the bread by running\n  a sharp knife across the side of the bread at a 45 degree angle. All the hot air\n  and gas will escape through this opening. Its called the oven spring and it will\n  provide a lot of the verticality of the bread. Spritz the bread with water.");
    			t45 = space();
    			p14 = element("p");
    			strong9 = element("strong");
    			strong9.textContent = "Step 12:";
    			t47 = text(" Slide the bread into the oven and cook for 20-30 minutes\n  or until the crust is golden brown.");
    			t48 = space();
    			p15 = element("p");
    			p15.textContent = " ";
    			add_location(h1, file$i, 0, 0, 0);
    			add_location(p0, file$i, 1, 0, 25);
    			add_location(p1, file$i, 6, 0, 259);
    			add_location(h20, file$i, 11, 0, 454);
    			add_location(p2, file$i, 12, 0, 475);
    			add_location(p3, file$i, 13, 0, 511);
    			add_location(p4, file$i, 14, 0, 534);
    			add_location(p5, file$i, 15, 0, 567);
    			add_location(h21, file$i, 16, 0, 579);
    			add_location(strong0, file$i, 18, 2, 607);
    			add_location(p6, file$i, 17, 0, 601);
    			add_location(strong1, file$i, 24, 2, 874);
    			add_location(p7, file$i, 23, 0, 868);
    			add_location(strong2, file$i, 29, 2, 1080);
    			add_location(strong3, file$i, 30, 39, 1198);
    			add_location(p8, file$i, 28, 0, 1074);
    			add_location(strong4, file$i, 34, 2, 1285);
    			add_location(em, file$i, 35, 49, 1412);
    			add_location(p9, file$i, 33, 0, 1279);
    			add_location(strong5, file$i, 43, 2, 1806);
    			add_location(p10, file$i, 42, 0, 1800);
    			add_location(strong6, file$i, 50, 2, 2216);
    			add_location(p11, file$i, 49, 0, 2210);
    			add_location(strong7, file$i, 57, 2, 2571);
    			add_location(p12, file$i, 56, 0, 2565);
    			add_location(strong8, file$i, 63, 2, 2858);
    			add_location(p13, file$i, 62, 0, 2852);
    			add_location(strong9, file$i, 69, 2, 3193);
    			add_location(p14, file$i, 68, 0, 3187);
    			add_location(p15, file$i, 72, 0, 3319);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p3, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p5, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, p6, anchor);
    			append_dev(p6, strong0);
    			append_dev(p6, t19);
    			insert_dev(target, t20, anchor);
    			insert_dev(target, p7, anchor);
    			append_dev(p7, strong1);
    			append_dev(p7, t22);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, p8, anchor);
    			append_dev(p8, strong2);
    			append_dev(p8, t25);
    			append_dev(p8, strong3);
    			append_dev(p8, t27);
    			insert_dev(target, t28, anchor);
    			insert_dev(target, p9, anchor);
    			append_dev(p9, strong4);
    			append_dev(p9, t30);
    			append_dev(p9, em);
    			append_dev(p9, t32);
    			insert_dev(target, t33, anchor);
    			insert_dev(target, p10, anchor);
    			append_dev(p10, strong5);
    			append_dev(p10, t35);
    			insert_dev(target, t36, anchor);
    			insert_dev(target, p11, anchor);
    			append_dev(p11, strong6);
    			append_dev(p11, t38);
    			insert_dev(target, t39, anchor);
    			insert_dev(target, p12, anchor);
    			append_dev(p12, strong7);
    			append_dev(p12, t41);
    			insert_dev(target, t42, anchor);
    			insert_dev(target, p13, anchor);
    			append_dev(p13, strong8);
    			append_dev(p13, t44);
    			insert_dev(target, t45, anchor);
    			insert_dev(target, p14, anchor);
    			append_dev(p14, strong9);
    			append_dev(p14, t47);
    			insert_dev(target, t48, anchor);
    			insert_dev(target, p15, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    				detach_dev(t1);
    				detach_dev(p0);
    				detach_dev(t3);
    				detach_dev(p1);
    				detach_dev(t5);
    				detach_dev(h20);
    				detach_dev(t7);
    				detach_dev(p2);
    				detach_dev(t9);
    				detach_dev(p3);
    				detach_dev(t11);
    				detach_dev(p4);
    				detach_dev(t13);
    				detach_dev(p5);
    				detach_dev(t15);
    				detach_dev(h21);
    				detach_dev(t17);
    				detach_dev(p6);
    				detach_dev(t20);
    				detach_dev(p7);
    				detach_dev(t23);
    				detach_dev(p8);
    				detach_dev(t28);
    				detach_dev(p9);
    				detach_dev(t33);
    				detach_dev(p10);
    				detach_dev(t36);
    				detach_dev(p11);
    				detach_dev(t39);
    				detach_dev(p12);
    				detach_dev(t42);
    				detach_dev(p13);
    				detach_dev(t45);
    				detach_dev(p14);
    				detach_dev(t48);
    				detach_dev(p15);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$i.name, type: "component", source: "", ctx });
    	return block;
    }

    class Baguette extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$i, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Baguette", options, id: create_fragment$i.name });
    	}
    }

    /* src/pages/french/FrenchOnion.svelte generated by Svelte v3.12.1 */

    const file$j = "src/pages/french/FrenchOnion.svelte";

    function create_fragment$j(ctx) {
    	var h1, t1, p0, t3, h20, t5, p1, t7, p2, t9, p3, t11, p4, t13, p5, t15, p6, t17, p7, t19, p8, t21, h21, t23, p9, strong0, t25, t26, p10, strong1, t28, t29, p11, strong2, t31, t32, p12, strong3, t34;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "French Onion Soup";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "The perfect mix of cheese, bread, and sweet onion taste, French onion soup is\n  a modern day classic.It is also perfect for the last few days of the week when\n  you are largely out of ingredients. As long as you have onions, beef broth,\n  bread, and white cheese, you can make some version of this soup. If you\n  don't have these things or just a few of them, this soup will be\n  tantalizingly just out of reach, mocking you for your insolence.";
    			t3 = space();
    			h20 = element("h2");
    			h20.textContent = "Ingredients";
    			t5 = space();
    			p1 = element("p");
    			p1.textContent = "1/2 cup of unsalted butter";
    			t7 = space();
    			p2 = element("p");
    			p2.textContent = "Olive oil";
    			t9 = space();
    			p3 = element("p");
    			p3.textContent = "4 onions";
    			t11 = space();
    			p4 = element("p");
    			p4.textContent = "4 10.5 oz cans of beef broth";
    			t13 = space();
    			p5 = element("p");
    			p5.textContent = "1 teaspoon of dried thyme";
    			t15 = space();
    			p6 = element("p");
    			p6.textContent = "Salt and pepper";
    			t17 = space();
    			p7 = element("p");
    			p7.textContent = "Slices of Swiss and provolone cheese";
    			t19 = space();
    			p8 = element("p");
    			p8.textContent = "1/4 cup of grated parmesan";
    			t21 = space();
    			h21 = element("h2");
    			h21.textContent = "Instructions";
    			t23 = space();
    			p9 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Step 1:";
    			t25 = text(" Melt the butter in a pot with a splash of olive oil. Add\n  onions and stir until they are translucent");
    			t26 = space();
    			p10 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Step 2:";
    			t28 = text(" Add beef broth and thyme to soup and simmer for 30 minutes.\n  Add salt and pepper to taste");
    			t29 = space();
    			p11 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Step 3:";
    			t31 = text(" Ladle the soup into oven safe bowl. Gently place a slice\n  a of bread overtop the soup. Next layer a slice of provolone on top, then Swiss,\n  then a tablespoon of parmesan cheese.");
    			t32 = space();
    			p12 = element("p");
    			strong3 = element("strong");
    			strong3.textContent = "Step 4:";
    			t34 = text(" Broil the bowls in the oven until the cheese is bubbling");
    			add_location(h1, file$j, 0, 0, 0);
    			add_location(p0, file$j, 1, 0, 27);
    			add_location(h20, file$j, 9, 0, 487);
    			add_location(p1, file$j, 10, 0, 508);
    			add_location(p2, file$j, 11, 0, 542);
    			add_location(p3, file$j, 12, 0, 559);
    			add_location(p4, file$j, 13, 0, 575);
    			add_location(p5, file$j, 14, 0, 611);
    			add_location(p6, file$j, 15, 0, 644);
    			add_location(p7, file$j, 16, 0, 667);
    			add_location(p8, file$j, 17, 0, 711);
    			add_location(h21, file$j, 18, 0, 745);
    			add_location(strong0, file$j, 20, 2, 773);
    			add_location(p9, file$j, 19, 0, 767);
    			add_location(strong1, file$j, 24, 2, 911);
    			add_location(p10, file$j, 23, 0, 905);
    			add_location(strong2, file$j, 28, 2, 1039);
    			add_location(p11, file$j, 27, 0, 1033);
    			add_location(strong3, file$j, 33, 2, 1255);
    			add_location(p12, file$j, 32, 0, 1249);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p3, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p5, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, p6, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, p7, anchor);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, p8, anchor);
    			insert_dev(target, t21, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, p9, anchor);
    			append_dev(p9, strong0);
    			append_dev(p9, t25);
    			insert_dev(target, t26, anchor);
    			insert_dev(target, p10, anchor);
    			append_dev(p10, strong1);
    			append_dev(p10, t28);
    			insert_dev(target, t29, anchor);
    			insert_dev(target, p11, anchor);
    			append_dev(p11, strong2);
    			append_dev(p11, t31);
    			insert_dev(target, t32, anchor);
    			insert_dev(target, p12, anchor);
    			append_dev(p12, strong3);
    			append_dev(p12, t34);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    				detach_dev(t1);
    				detach_dev(p0);
    				detach_dev(t3);
    				detach_dev(h20);
    				detach_dev(t5);
    				detach_dev(p1);
    				detach_dev(t7);
    				detach_dev(p2);
    				detach_dev(t9);
    				detach_dev(p3);
    				detach_dev(t11);
    				detach_dev(p4);
    				detach_dev(t13);
    				detach_dev(p5);
    				detach_dev(t15);
    				detach_dev(p6);
    				detach_dev(t17);
    				detach_dev(p7);
    				detach_dev(t19);
    				detach_dev(p8);
    				detach_dev(t21);
    				detach_dev(h21);
    				detach_dev(t23);
    				detach_dev(p9);
    				detach_dev(t26);
    				detach_dev(p10);
    				detach_dev(t29);
    				detach_dev(p11);
    				detach_dev(t32);
    				detach_dev(p12);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$j.name, type: "component", source: "", ctx });
    	return block;
    }

    class FrenchOnion extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$j, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "FrenchOnion", options, id: create_fragment$j.name });
    	}
    }

    /* src/pages/french/PouletChasseur.svelte generated by Svelte v3.12.1 */

    const file$k = "src/pages/french/PouletChasseur.svelte";

    function create_fragment$k(ctx) {
    	var h1, t1, p0, t3, h20, t5, p1, t7, p2, t9, p3, t11, p4, t13, p5, t15, p6, t17, p7, t19, p8, t21, p9, t23, p10, t25, h21, t27, p11, strong0, t29, t30, p12, strong1, t32, t33, p13, strong2, t35, t36, p14, strong3, t38, t39, p15, strong4, t41, t42, p16, strong5, t44, t45, p17, strong6, t47, t48, p18;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Poulet Chasseur";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Hunters chicken is the lesser known but refined, almost understated brother of\n  Coq Au Vin. Whereas Coq Au Vin get all the girls and is captain on the\n  football team, Poulet Chasseur was earning straight As and was a tough out on\n  the tennis team. Enough with the metaphors, Poulet Chasseur or Hunters Chicken\n  is another way to cook the dark meat of the chicken. Using white wine instead\n  of red, Hunters Chicken has a softer, more delicate flavor, but is just as\n  good.";
    			t3 = space();
    			h20 = element("h2");
    			h20.textContent = "Ingredients";
    			t5 = space();
    			p1 = element("p");
    			p1.textContent = "2 chicken legs";
    			t7 = space();
    			p2 = element("p");
    			p2.textContent = "2 chicken thighs";
    			t9 = space();
    			p3 = element("p");
    			p3.textContent = "Butter";
    			t11 = space();
    			p4 = element("p");
    			p4.textContent = "1 large onion";
    			t13 = space();
    			p5 = element("p");
    			p5.textContent = "2 shallots";
    			t15 = space();
    			p6 = element("p");
    			p6.textContent = "2 garlic cloves";
    			t17 = space();
    			p7 = element("p");
    			p7.textContent = "Mushrooms";
    			t19 = space();
    			p8 = element("p");
    			p8.textContent = "1/4 a cup of white wine";
    			t21 = space();
    			p9 = element("p");
    			p9.textContent = "3/4 chicken stock";
    			t23 = space();
    			p10 = element("p");
    			p10.textContent = "Fresh tarragon";
    			t25 = space();
    			h21 = element("h2");
    			h21.textContent = "Instructions";
    			t27 = space();
    			p11 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Step 1:";
    			t29 = text(" Preheat oven to 400 degrees");
    			t30 = space();
    			p12 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Step 2:";
    			t32 = text(" In a very hot cast iron pan, brown chicken legs and thighs.\n  The legs may stick at first but will release once they are properly browned.");
    			t33 = space();
    			p13 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Step 3:";
    			t35 = text(" Remove chicken and add in onion, garlic, and shallots,\n  cook until they are translucent");
    			t36 = space();
    			p14 = element("p");
    			strong3 = element("strong");
    			strong3.textContent = "Step 4:";
    			t38 = text(" Next, add the chicken back to the pan, add the wine and\n  chicken stock and cook in the oven for 25-30 minutes");
    			t39 = space();
    			p15 = element("p");
    			strong4 = element("strong");
    			strong4.textContent = "Step 5:";
    			t41 = text(" After taking the pan out of the oven, use a sieve to separate\n  the onions and meat from the braising fluid. In the now empty pan, brown the mushrooms\n  in butter.");
    			t42 = space();
    			p16 = element("p");
    			strong5 = element("strong");
    			strong5.textContent = "Step 6:";
    			t44 = text(" Once the mushrooms are browned, add a table spoon of flour\n  to the butter and mushrooms and pour a cup of the braising fluid on top. Stir until\n  it forms a sauce.");
    			t45 = space();
    			p17 = element("p");
    			strong6 = element("strong");
    			strong6.textContent = "Step 7:";
    			t47 = text(" Cover the resting chicken with the sauce and top with\n  tarragon");
    			t48 = space();
    			p18 = element("p");
    			add_location(h1, file$k, 0, 0, 0);
    			add_location(p0, file$k, 1, 0, 25);
    			add_location(h20, file$k, 10, 0, 514);
    			add_location(p1, file$k, 11, 0, 535);
    			add_location(p2, file$k, 12, 0, 557);
    			add_location(p3, file$k, 13, 0, 581);
    			add_location(p4, file$k, 14, 0, 595);
    			add_location(p5, file$k, 15, 0, 616);
    			add_location(p6, file$k, 16, 0, 634);
    			add_location(p7, file$k, 17, 0, 657);
    			add_location(p8, file$k, 18, 0, 674);
    			add_location(p9, file$k, 19, 0, 705);
    			add_location(p10, file$k, 20, 0, 730);
    			add_location(h21, file$k, 21, 0, 752);
    			add_location(strong0, file$k, 22, 3, 777);
    			add_location(p11, file$k, 22, 0, 774);
    			add_location(strong1, file$k, 24, 2, 840);
    			add_location(p12, file$k, 23, 0, 834);
    			add_location(strong2, file$k, 28, 2, 1016);
    			add_location(p13, file$k, 27, 0, 1010);
    			add_location(strong3, file$k, 32, 2, 1141);
    			add_location(p14, file$k, 31, 0, 1135);
    			add_location(strong4, file$k, 36, 2, 1288);
    			add_location(p15, file$k, 35, 0, 1282);
    			add_location(strong5, file$k, 41, 2, 1488);
    			add_location(p16, file$k, 40, 0, 1482);
    			add_location(strong6, file$k, 46, 2, 1689);
    			add_location(p17, file$k, 45, 0, 1683);
    			add_location(p18, file$k, 49, 0, 1784);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p3, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p5, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, p6, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, p7, anchor);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, p8, anchor);
    			insert_dev(target, t21, anchor);
    			insert_dev(target, p9, anchor);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, p10, anchor);
    			insert_dev(target, t25, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t27, anchor);
    			insert_dev(target, p11, anchor);
    			append_dev(p11, strong0);
    			append_dev(p11, t29);
    			insert_dev(target, t30, anchor);
    			insert_dev(target, p12, anchor);
    			append_dev(p12, strong1);
    			append_dev(p12, t32);
    			insert_dev(target, t33, anchor);
    			insert_dev(target, p13, anchor);
    			append_dev(p13, strong2);
    			append_dev(p13, t35);
    			insert_dev(target, t36, anchor);
    			insert_dev(target, p14, anchor);
    			append_dev(p14, strong3);
    			append_dev(p14, t38);
    			insert_dev(target, t39, anchor);
    			insert_dev(target, p15, anchor);
    			append_dev(p15, strong4);
    			append_dev(p15, t41);
    			insert_dev(target, t42, anchor);
    			insert_dev(target, p16, anchor);
    			append_dev(p16, strong5);
    			append_dev(p16, t44);
    			insert_dev(target, t45, anchor);
    			insert_dev(target, p17, anchor);
    			append_dev(p17, strong6);
    			append_dev(p17, t47);
    			insert_dev(target, t48, anchor);
    			insert_dev(target, p18, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    				detach_dev(t1);
    				detach_dev(p0);
    				detach_dev(t3);
    				detach_dev(h20);
    				detach_dev(t5);
    				detach_dev(p1);
    				detach_dev(t7);
    				detach_dev(p2);
    				detach_dev(t9);
    				detach_dev(p3);
    				detach_dev(t11);
    				detach_dev(p4);
    				detach_dev(t13);
    				detach_dev(p5);
    				detach_dev(t15);
    				detach_dev(p6);
    				detach_dev(t17);
    				detach_dev(p7);
    				detach_dev(t19);
    				detach_dev(p8);
    				detach_dev(t21);
    				detach_dev(p9);
    				detach_dev(t23);
    				detach_dev(p10);
    				detach_dev(t25);
    				detach_dev(h21);
    				detach_dev(t27);
    				detach_dev(p11);
    				detach_dev(t30);
    				detach_dev(p12);
    				detach_dev(t33);
    				detach_dev(p13);
    				detach_dev(t36);
    				detach_dev(p14);
    				detach_dev(t39);
    				detach_dev(p15);
    				detach_dev(t42);
    				detach_dev(p16);
    				detach_dev(t45);
    				detach_dev(p17);
    				detach_dev(t48);
    				detach_dev(p18);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$k.name, type: "component", source: "", ctx });
    	return block;
    }

    class PouletChasseur extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$k, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "PouletChasseur", options, id: create_fragment$k.name });
    	}
    }

    /* src/pages/french/Eggplant.svelte generated by Svelte v3.12.1 */

    const file$l = "src/pages/french/Eggplant.svelte";

    function create_fragment$l(ctx) {
    	var h1, t1, p0, t2, em0, t4, em1, t6, t7, h20, t9, p1, t11, p2, t13, p3, t15, h21, t17, p4, strong0, t19, t20, p5, strong1, t22, t23, p6, strong2, t25;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Roasted Eggplant";
    			t1 = space();
    			p0 = element("p");
    			t2 = text("A simple side that goes well with any protein heavy dish. I adapted this\n  recipe from Mimi Thorisson's French Country Cooking and interestingly she\n  describes this dish as being Italian in nature. But here's the thing, it\n  came from a ");
    			em0 = element("em");
    			em0.textContent = "French";
    			t4 = text(" cookbook so its going in the ");
    			em1 = element("em");
    			em1.textContent = "French";
    			t6 = text(" section\n  of my website.");
    			t7 = space();
    			h20 = element("h2");
    			h20.textContent = "Ingredients";
    			t9 = space();
    			p1 = element("p");
    			p1.textContent = "1 Large Eggplant";
    			t11 = space();
    			p2 = element("p");
    			p2.textContent = "Pine Nuts or Cashews";
    			t13 = space();
    			p3 = element("p");
    			p3.textContent = "Raisins";
    			t15 = space();
    			h21 = element("h2");
    			h21.textContent = "Instructions";
    			t17 = space();
    			p4 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Step 1:";
    			t19 = text(" Preheat the oven to 400 degrees");
    			t20 = space();
    			p5 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Step 2:";
    			t22 = text(" In a large pan, heat olive oil in medium high heat and\n  cook the eggplant until they get a nice golden brown, season with salt and pepper");
    			t23 = space();
    			p6 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Step 3:";
    			t25 = text(" Arrange the eggplant in a single layer on the baking sheet,\n  scattering the nuts and raisins on top. Roast for about 10 minutes");
    			add_location(h1, file$l, 0, 0, 0);
    			add_location(em0, file$l, 5, 14, 278);
    			add_location(em1, file$l, 5, 59, 323);
    			add_location(p0, file$l, 1, 0, 26);
    			add_location(h20, file$l, 8, 0, 369);
    			add_location(p1, file$l, 9, 0, 390);
    			add_location(p2, file$l, 10, 0, 414);
    			add_location(p3, file$l, 11, 0, 442);
    			add_location(h21, file$l, 12, 0, 457);
    			add_location(strong0, file$l, 13, 3, 482);
    			add_location(p4, file$l, 13, 0, 479);
    			add_location(strong1, file$l, 15, 2, 549);
    			add_location(p5, file$l, 14, 0, 543);
    			add_location(strong2, file$l, 19, 2, 724);
    			add_location(p6, file$l, 18, 0, 718);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t2);
    			append_dev(p0, em0);
    			append_dev(p0, t4);
    			append_dev(p0, em1);
    			append_dev(p0, t6);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p3, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, p4, anchor);
    			append_dev(p4, strong0);
    			append_dev(p4, t19);
    			insert_dev(target, t20, anchor);
    			insert_dev(target, p5, anchor);
    			append_dev(p5, strong1);
    			append_dev(p5, t22);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, p6, anchor);
    			append_dev(p6, strong2);
    			append_dev(p6, t25);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    				detach_dev(t1);
    				detach_dev(p0);
    				detach_dev(t7);
    				detach_dev(h20);
    				detach_dev(t9);
    				detach_dev(p1);
    				detach_dev(t11);
    				detach_dev(p2);
    				detach_dev(t13);
    				detach_dev(p3);
    				detach_dev(t15);
    				detach_dev(h21);
    				detach_dev(t17);
    				detach_dev(p4);
    				detach_dev(t20);
    				detach_dev(p5);
    				detach_dev(t23);
    				detach_dev(p6);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$l.name, type: "component", source: "", ctx });
    	return block;
    }

    class Eggplant extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$l, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Eggplant", options, id: create_fragment$l.name });
    	}
    }

    /* src/pages/french/CotelettedePorc.svelte generated by Svelte v3.12.1 */

    const file$m = "src/pages/french/CotelettedePorc.svelte";

    function create_fragment$m(ctx) {
    	var h1, t1, p0, t3, p1, t5, h20, t7, p2, t9, p3, t11, p4, t13, p5, t15, p6, t17, p7, t19, p8, t21, h21, t23, p9, strong0, t25, t26, p10, strong1, t28, t29, p11, strong2, t31, t32, p12, strong3, t34, t35, p13, strong4, t37, t38, p14, strong5, t40;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Cotelette de Porc";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "The simple pork chop, long a favorite with American households, soon to be\n  elevated the French way. Growing up, I would oftentimes have pork chops with\n  apple sauce. Something just works about the deep fatty flavor of pork paired\n  with the sweet tang of apple sauce. This easy, one-pan recipe makes an elegant\n  play on that classic combo.";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "Mimi Thorisson, who from which this dish is adapted, tells us that most of the\n  flavors in this dish--the cream, the apples, the sage--are from the cool,\n  rainy region of Normandy. Imagine yourself in Northern France sitting down to\n  dinner in a cottage that overlooks your apple orchard. Enjoy!";
    			t5 = space();
    			h20 = element("h2");
    			h20.textContent = "Ingredients";
    			t7 = space();
    			p2 = element("p");
    			p2.textContent = "Bone-In Pork Chop";
    			t9 = space();
    			p3 = element("p");
    			p3.textContent = "Butter";
    			t11 = space();
    			p4 = element("p");
    			p4.textContent = "4 Shallots";
    			t13 = space();
    			p5 = element("p");
    			p5.textContent = "2 Cloves of Garlic";
    			t15 = space();
    			p6 = element("p");
    			p6.textContent = "Sage";
    			t17 = space();
    			p7 = element("p");
    			p7.textContent = "2/3 a Cup of Apple Cider";
    			t19 = space();
    			p8 = element("p");
    			p8.textContent = "3 Tablespoons of Creme Fraiche";
    			t21 = space();
    			h21 = element("h2");
    			h21.textContent = "Instructions";
    			t23 = space();
    			p9 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Step 1:";
    			t25 = text(" Preheat Oven to 375");
    			t26 = space();
    			p10 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Step 2:";
    			t28 = text(" Score the pork chops and season with salt and pepper");
    			t29 = space();
    			p11 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Step 3:";
    			t31 = text(" Heat butter in the pan and add chopped shallot and crushed\n  garlic");
    			t32 = space();
    			p12 = element("p");
    			strong3 = element("strong");
    			strong3.textContent = "Step 4:";
    			t34 = text(" Cook the pork chop on each side for about 5 minutes. The\n  temp of the pork chop should reach around 120 degrees");
    			t35 = space();
    			p13 = element("p");
    			strong4 = element("strong");
    			strong4.textContent = "Step 5:";
    			t37 = text(" Place sage leaves and a pad of butter on top of each chop\n  and transfer to the oven. It will only need to be in there for about 10 minutes\n  to reach an internal temp of 145 degrees.");
    			t38 = space();
    			p14 = element("p");
    			strong5 = element("strong");
    			strong5.textContent = "Step 6:";
    			t40 = text(" Remove pork chops and let rest. In the same pan, add the\n  apple cider and let simmer until reduced (about 2 minutes). Add creme fraiche,\n  spoonful by spoonful, into the reduced cider, until you have achieved the creamy\n  flavor and texture you desire.");
    			add_location(h1, file$m, 0, 0, 0);
    			add_location(p0, file$m, 1, 0, 27);
    			add_location(p1, file$m, 8, 0, 382);
    			add_location(h20, file$m, 14, 0, 692);
    			add_location(p2, file$m, 15, 0, 713);
    			add_location(p3, file$m, 16, 0, 738);
    			add_location(p4, file$m, 17, 0, 752);
    			add_location(p5, file$m, 18, 0, 770);
    			add_location(p6, file$m, 19, 0, 796);
    			add_location(p7, file$m, 20, 0, 808);
    			add_location(p8, file$m, 21, 0, 840);
    			add_location(h21, file$m, 22, 0, 878);
    			add_location(strong0, file$m, 23, 3, 903);
    			add_location(p9, file$m, 23, 0, 900);
    			add_location(strong1, file$m, 25, 2, 958);
    			add_location(p10, file$m, 24, 0, 952);
    			add_location(strong2, file$m, 28, 2, 1047);
    			add_location(p11, file$m, 27, 0, 1041);
    			add_location(strong3, file$m, 32, 2, 1151);
    			add_location(p12, file$m, 31, 0, 1145);
    			add_location(strong4, file$m, 36, 2, 1300);
    			add_location(p13, file$m, 35, 0, 1294);
    			add_location(strong5, file$m, 41, 2, 1520);
    			add_location(p14, file$m, 40, 0, 1514);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p3, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p5, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, p6, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, p7, anchor);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, p8, anchor);
    			insert_dev(target, t21, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, p9, anchor);
    			append_dev(p9, strong0);
    			append_dev(p9, t25);
    			insert_dev(target, t26, anchor);
    			insert_dev(target, p10, anchor);
    			append_dev(p10, strong1);
    			append_dev(p10, t28);
    			insert_dev(target, t29, anchor);
    			insert_dev(target, p11, anchor);
    			append_dev(p11, strong2);
    			append_dev(p11, t31);
    			insert_dev(target, t32, anchor);
    			insert_dev(target, p12, anchor);
    			append_dev(p12, strong3);
    			append_dev(p12, t34);
    			insert_dev(target, t35, anchor);
    			insert_dev(target, p13, anchor);
    			append_dev(p13, strong4);
    			append_dev(p13, t37);
    			insert_dev(target, t38, anchor);
    			insert_dev(target, p14, anchor);
    			append_dev(p14, strong5);
    			append_dev(p14, t40);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    				detach_dev(t1);
    				detach_dev(p0);
    				detach_dev(t3);
    				detach_dev(p1);
    				detach_dev(t5);
    				detach_dev(h20);
    				detach_dev(t7);
    				detach_dev(p2);
    				detach_dev(t9);
    				detach_dev(p3);
    				detach_dev(t11);
    				detach_dev(p4);
    				detach_dev(t13);
    				detach_dev(p5);
    				detach_dev(t15);
    				detach_dev(p6);
    				detach_dev(t17);
    				detach_dev(p7);
    				detach_dev(t19);
    				detach_dev(p8);
    				detach_dev(t21);
    				detach_dev(h21);
    				detach_dev(t23);
    				detach_dev(p9);
    				detach_dev(t26);
    				detach_dev(p10);
    				detach_dev(t29);
    				detach_dev(p11);
    				detach_dev(t32);
    				detach_dev(p12);
    				detach_dev(t35);
    				detach_dev(p13);
    				detach_dev(t38);
    				detach_dev(p14);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$m.name, type: "component", source: "", ctx });
    	return block;
    }

    class CotelettedePorc extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$m, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "CotelettedePorc", options, id: create_fragment$m.name });
    	}
    }

    /* src/pages/italian/HomemadePasta.svelte generated by Svelte v3.12.1 */

    const file$n = "src/pages/italian/HomemadePasta.svelte";

    function create_fragment$n(ctx) {
    	var h1, t1, p0, t3, p1, t5, p2, t7, h20, t9, p3, strong0, t11, p4, t13, p5, t15, p6, strong1, t17, p7, t19, p8, t21, p9, t23, p10, t25, p11, strong2, t27, p12, t29, p13, t31, h21, t33, p14, strong3, t35, t36, p15, strong4, t38, t39, p16, strong5, t41, t42, p17, strong6, t44, t45, p18, strong7, t47, t48, p19, strong8, t50, t51, p20, strong9, t53, t54, p21, strong10, t56, t57, p22, strong11, t59, t60, p23, strong12, t62, t63, p24, t65, p25;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Homemade Pasta";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Homemade pasta is a delight. The noodles always taste just a little more\n  substantial when they are freshly made, like they are a focus of the meal\n  rather than a vessel for the sauce. While the noodles could be easily paired\n  with any number of sauces, I would recommend something light, because again,\n  the focus should be on the noodles.";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "I like to serve homemade pasta with pesto mixed with crushed walnuts, halved\n  grape tomatoes, and loads of parmesan. Half the fun of this recipe is kneading\n  the dough, making this recipe a good date night activity.";
    			t5 = space();
    			p2 = element("p");
    			p2.textContent = "In total, this takes about 1 hour and produces about 4 meals.";
    			t7 = space();
    			h20 = element("h2");
    			h20.textContent = "Ingredients";
    			t9 = space();
    			p3 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Pasta";
    			t11 = space();
    			p4 = element("p");
    			p4.textContent = "2 cups of flour";
    			t13 = space();
    			p5 = element("p");
    			p5.textContent = "8 eggs";
    			t15 = space();
    			p6 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Pesto";
    			t17 = space();
    			p7 = element("p");
    			p7.textContent = "Store bought pesto";
    			t19 = space();
    			p8 = element("p");
    			p8.textContent = "Cherry tomatoes";
    			t21 = space();
    			p9 = element("p");
    			p9.textContent = "Walnuts";
    			t23 = space();
    			p10 = element("p");
    			p10.textContent = "Parmesan";
    			t25 = space();
    			p11 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Special Equipment";
    			t27 = space();
    			p12 = element("p");
    			p12.textContent = "Pasta maker";
    			t29 = space();
    			p13 = element("p");
    			p13.textContent = "Plastic wrap";
    			t31 = space();
    			h21 = element("h2");
    			h21.textContent = "Instructions";
    			t33 = space();
    			p14 = element("p");
    			strong3 = element("strong");
    			strong3.textContent = "Step 1:";
    			t35 = text(" Separate 6 egg yolks and combine them with 2 additional\n  eggs in a mixing bowl. Beat all 8 eggs together until well mixed");
    			t36 = space();
    			p15 = element("p");
    			strong4 = element("strong");
    			strong4.textContent = "Step 2:";
    			t38 = text(" Pour the flour into a large bowl. You are going to create\n  a little well with the flour. Essentially you want to be able to pour in your eggs\n  into the center of the flour without the eggs seeping out.");
    			t39 = space();
    			p16 = element("p");
    			strong5 = element("strong");
    			strong5.textContent = "Step 3:";
    			t41 = text(" Go ahead and pour your egg mixture into the center of\n  the flour well. Using a fork, gradually incorporate more and more of the flour\n  into the egg mixture. Keep whisking the egg while you are slowly incorporating\n  the flour. Eventually this will form into a dough.");
    			t42 = space();
    			p17 = element("p");
    			strong6 = element("strong");
    			strong6.textContent = "Step 4:";
    			t44 = text(" Once the dough becomes dough, begin kneading it for 7\n  minutes. To knead, first sprinkle down some flour on your counter and fold and\n  roll the dough.");
    			t45 = space();
    			p18 = element("p");
    			strong7 = element("strong");
    			strong7.textContent = "Step 5:";
    			t47 = text(" After about 7 minutes of kneading, check to see if you\n  dough is ready by poking it. If it bounces back, than the gluten has successfully\n  developed");
    			t48 = space();
    			p19 = element("p");
    			strong8 = element("strong");
    			strong8.textContent = "Step 6:";
    			t50 = text(" Wrap your dough in plastic wrap and let is rest for 30\n  minutes. While the dough is resting, cut the cherry tomatoes in half, and crush\n  the walnuts in ziplock bag with a rolling pen.");
    			t51 = space();
    			p20 = element("p");
    			strong9 = element("strong");
    			strong9.textContent = "Step 7:";
    			t53 = text(" Boil the water. You will need a big pot with a lot of\n  boiling water for this, so I would recommend getting that started when you are\n  about half way done with cutting your pasta (which is the next step).");
    			t54 = space();
    			p21 = element("p");
    			strong10 = element("strong");
    			strong10.textContent = "Step 8:";
    			t56 = text(" At this point, dough is ready to be cut into pasta. Use\n  a roller to flatten the dough and then run it through the pasta maker. The pasta\n  will expand once cooked so you want it to be as thin as possible.");
    			t57 = space();
    			p22 = element("p");
    			strong11 = element("strong");
    			strong11.textContent = "Step 9:";
    			t59 = text(" Cook the pasta for about 5 minutes. Once the noodles start\n  floating to the top, they are done. Pour it all out into a big bowl.");
    			t60 = space();
    			p23 = element("p");
    			strong12 = element("strong");
    			strong12.textContent = "Step 10:";
    			t62 = text(" Combine the pasta, pesto, parmesan, cut tomatoes and\n  walnuts all together and enjoy.");
    			t63 = space();
    			p24 = element("p");
    			p24.textContent = " ";
    			t65 = space();
    			p25 = element("p");
    			p25.textContent = " ";
    			add_location(h1, file$n, 0, 0, 0);
    			add_location(p0, file$n, 1, 0, 24);
    			add_location(p1, file$n, 8, 0, 380);
    			add_location(p2, file$n, 13, 0, 609);
    			add_location(h20, file$n, 14, 0, 678);
    			add_location(strong0, file$n, 15, 3, 702);
    			add_location(p3, file$n, 15, 0, 699);
    			add_location(p4, file$n, 16, 0, 729);
    			add_location(p5, file$n, 17, 0, 752);
    			add_location(strong1, file$n, 18, 3, 769);
    			add_location(p6, file$n, 18, 0, 766);
    			add_location(p7, file$n, 19, 0, 796);
    			add_location(p8, file$n, 20, 0, 822);
    			add_location(p9, file$n, 21, 0, 845);
    			add_location(p10, file$n, 22, 0, 860);
    			add_location(strong2, file$n, 23, 3, 879);
    			add_location(p11, file$n, 23, 0, 876);
    			add_location(p12, file$n, 24, 0, 918);
    			add_location(p13, file$n, 25, 0, 937);
    			add_location(h21, file$n, 26, 0, 957);
    			add_location(strong3, file$n, 28, 2, 985);
    			add_location(p14, file$n, 27, 0, 979);
    			add_location(strong4, file$n, 32, 2, 1144);
    			add_location(p15, file$n, 31, 0, 1138);
    			add_location(strong5, file$n, 37, 2, 1384);
    			add_location(p16, file$n, 36, 0, 1378);
    			add_location(strong6, file$n, 43, 2, 1689);
    			add_location(p17, file$n, 42, 0, 1683);
    			add_location(strong7, file$n, 48, 2, 1878);
    			add_location(p18, file$n, 47, 0, 1872);
    			add_location(strong8, file$n, 53, 2, 2065);
    			add_location(p19, file$n, 52, 0, 2059);
    			add_location(strong9, file$n, 58, 2, 2287);
    			add_location(p20, file$n, 57, 0, 2281);
    			add_location(strong10, file$n, 63, 2, 2530);
    			add_location(p21, file$n, 62, 0, 2524);
    			add_location(strong11, file$n, 68, 2, 2773);
    			add_location(p22, file$n, 67, 0, 2767);
    			add_location(strong12, file$n, 72, 2, 2939);
    			add_location(p23, file$n, 71, 0, 2933);
    			add_location(p24, file$n, 75, 0, 3058);
    			add_location(p25, file$n, 76, 0, 3072);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p3, anchor);
    			append_dev(p3, strong0);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p5, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, p6, anchor);
    			append_dev(p6, strong1);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, p7, anchor);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, p8, anchor);
    			insert_dev(target, t21, anchor);
    			insert_dev(target, p9, anchor);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, p10, anchor);
    			insert_dev(target, t25, anchor);
    			insert_dev(target, p11, anchor);
    			append_dev(p11, strong2);
    			insert_dev(target, t27, anchor);
    			insert_dev(target, p12, anchor);
    			insert_dev(target, t29, anchor);
    			insert_dev(target, p13, anchor);
    			insert_dev(target, t31, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t33, anchor);
    			insert_dev(target, p14, anchor);
    			append_dev(p14, strong3);
    			append_dev(p14, t35);
    			insert_dev(target, t36, anchor);
    			insert_dev(target, p15, anchor);
    			append_dev(p15, strong4);
    			append_dev(p15, t38);
    			insert_dev(target, t39, anchor);
    			insert_dev(target, p16, anchor);
    			append_dev(p16, strong5);
    			append_dev(p16, t41);
    			insert_dev(target, t42, anchor);
    			insert_dev(target, p17, anchor);
    			append_dev(p17, strong6);
    			append_dev(p17, t44);
    			insert_dev(target, t45, anchor);
    			insert_dev(target, p18, anchor);
    			append_dev(p18, strong7);
    			append_dev(p18, t47);
    			insert_dev(target, t48, anchor);
    			insert_dev(target, p19, anchor);
    			append_dev(p19, strong8);
    			append_dev(p19, t50);
    			insert_dev(target, t51, anchor);
    			insert_dev(target, p20, anchor);
    			append_dev(p20, strong9);
    			append_dev(p20, t53);
    			insert_dev(target, t54, anchor);
    			insert_dev(target, p21, anchor);
    			append_dev(p21, strong10);
    			append_dev(p21, t56);
    			insert_dev(target, t57, anchor);
    			insert_dev(target, p22, anchor);
    			append_dev(p22, strong11);
    			append_dev(p22, t59);
    			insert_dev(target, t60, anchor);
    			insert_dev(target, p23, anchor);
    			append_dev(p23, strong12);
    			append_dev(p23, t62);
    			insert_dev(target, t63, anchor);
    			insert_dev(target, p24, anchor);
    			insert_dev(target, t65, anchor);
    			insert_dev(target, p25, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    				detach_dev(t1);
    				detach_dev(p0);
    				detach_dev(t3);
    				detach_dev(p1);
    				detach_dev(t5);
    				detach_dev(p2);
    				detach_dev(t7);
    				detach_dev(h20);
    				detach_dev(t9);
    				detach_dev(p3);
    				detach_dev(t11);
    				detach_dev(p4);
    				detach_dev(t13);
    				detach_dev(p5);
    				detach_dev(t15);
    				detach_dev(p6);
    				detach_dev(t17);
    				detach_dev(p7);
    				detach_dev(t19);
    				detach_dev(p8);
    				detach_dev(t21);
    				detach_dev(p9);
    				detach_dev(t23);
    				detach_dev(p10);
    				detach_dev(t25);
    				detach_dev(p11);
    				detach_dev(t27);
    				detach_dev(p12);
    				detach_dev(t29);
    				detach_dev(p13);
    				detach_dev(t31);
    				detach_dev(h21);
    				detach_dev(t33);
    				detach_dev(p14);
    				detach_dev(t36);
    				detach_dev(p15);
    				detach_dev(t39);
    				detach_dev(p16);
    				detach_dev(t42);
    				detach_dev(p17);
    				detach_dev(t45);
    				detach_dev(p18);
    				detach_dev(t48);
    				detach_dev(p19);
    				detach_dev(t51);
    				detach_dev(p20);
    				detach_dev(t54);
    				detach_dev(p21);
    				detach_dev(t57);
    				detach_dev(p22);
    				detach_dev(t60);
    				detach_dev(p23);
    				detach_dev(t63);
    				detach_dev(p24);
    				detach_dev(t65);
    				detach_dev(p25);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$n.name, type: "component", source: "", ctx });
    	return block;
    }

    class HomemadePasta extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$n, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "HomemadePasta", options, id: create_fragment$n.name });
    	}
    }

    /* src/pages/italian/CacioPepe.svelte generated by Svelte v3.12.1 */

    const file$o = "src/pages/italian/CacioPepe.svelte";

    function create_fragment$o(ctx) {
    	var h1, t1, p0, t3, p1, t4, em, t6, t7, h20, t9, p2, t11, p3, t13, p4, t15, p5, t17, h21, t19, p6, strong0, t21, t22, p7, strong1, t24, t25, p8, strong2, t27, t28, p9, strong3, t30, t31, p10, strong4, t33, t34, p11, strong5, t36, t37, p12, strong6, t39, t40, p13, strong7, t42, t43, p14, strong8, t45, t46, p15;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Cacio e Pepe";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "This is adult Mac and cheese. There is no getting around it. It's creamy\n  and simple, unctuous with bite. Its the perfect lunch or dinner to make when\n  you have nothing but some flour, eggs, and parmesan cheese. I will give one\n  word of warning. Do not skimp on the cheese. I have tried to make this with\n  Kraft Pre-shredded Parmesan and the results were horrific. The cheese\n  immediately congealed into a clump and never formed a nice sauce.";
    			t3 = space();
    			p1 = element("p");
    			t4 = text("With this little ingredients, the quality matters greatly. Choose real, ");
    			em = element("em");
    			em.textContent = "unshredded";
    			t6 = text(" parmesan reggiano and pecorino romano and you will be in for a treat. This is\n  unfortunately one of those recipes that you do by feel rather than follow directly,\n  so all ingredient amounts are meant as guidance rather than gospel.");
    			t7 = space();
    			h20 = element("h2");
    			h20.textContent = "Ingredients";
    			t9 = space();
    			p2 = element("p");
    			p2.textContent = "1 block of parmesan reggiano";
    			t11 = space();
    			p3 = element("p");
    			p3.textContent = "1 block of pecorino romano";
    			t13 = space();
    			p4 = element("p");
    			p4.textContent = "1.5 cups of flour";
    			t15 = space();
    			p5 = element("p");
    			p5.textContent = "3 eggs";
    			t17 = space();
    			h21 = element("h2");
    			h21.textContent = "Instructions";
    			t19 = space();
    			p6 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Step 1:";
    			t21 = text(" Put your flour into a nice deep mixing bowl and hollow\n  out a well in the center");
    			t22 = space();
    			p7 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Step 2:";
    			t24 = text(" Add your eggs to the center of the flour and incorporate\n  them with a fork");
    			t25 = space();
    			p8 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Step 3:";
    			t27 = text(" Keep adding more and more flour to the mixture until it\n  forms a dough. If it is still wet, add more flour. In general, its harder to have\n  too much flour because the eggs will incorporate the appropriate amount of dough\n  until they \"dry out\". You want it to be somewhat firm before you take\n  it out of the mixing bowl");
    			t28 = space();
    			p9 = element("p");
    			strong3 = element("strong");
    			strong3.textContent = "Step 4:";
    			t30 = text(" Knead the dough for 7-10 mins, until when you press your\n  thumb against it, it springs back. That means that the gluten has formed");
    			t31 = space();
    			p10 = element("p");
    			strong4 = element("strong");
    			strong4.textContent = "Step 5:";
    			t33 = text(" Wrap in plastic wrap and let rest for 30 mins. You now\n  need the gluten to relax");
    			t34 = space();
    			p11 = element("p");
    			strong5 = element("strong");
    			strong5.textContent = "Step 6:";
    			t36 = text(" Using a rolling pin, roll out your dough into sheets.\n  Then using a pasta maker, roll it out further and cut it. You can use a knife if\n  you don't have a pasta machine.");
    			t37 = space();
    			p12 = element("p");
    			strong6 = element("strong");
    			strong6.textContent = "Step 7:";
    			t39 = text(" Boil the pasta in lightly salted water for about 5 minutes");
    			t40 = space();
    			p13 = element("p");
    			strong7 = element("strong");
    			strong7.textContent = "Step 8:";
    			t42 = text(" While the pasta is boiling, shred a mix of parmesan reggiano\n  and pecorino romano into a serving tray or a bowl. You want maybe a half an inch\n  of cheese at the bottom of the tray or bowl.");
    			t43 = space();
    			p14 = element("p");
    			strong8 = element("strong");
    			strong8.textContent = "Step 9:";
    			t45 = text(" Without draining the pasta, using a slotted spoon or tongs,\n  place your noodles into the bowl with cheese. Mix it up. The pasta water that clings\n  to the noodles should mix with cheese to form a sauce. If the cheese remains too\n  dry, add some more pasta water, a tablespoon at a time");
    			t46 = space();
    			p15 = element("p");
    			p15.textContent = " ";
    			add_location(h1, file$o, 0, 0, 0);
    			add_location(p0, file$o, 1, 0, 22);
    			add_location(em, file$o, 10, 74, 563);
    			add_location(p1, file$o, 9, 0, 485);
    			add_location(h20, file$o, 16, 0, 830);
    			add_location(p2, file$o, 17, 0, 851);
    			add_location(p3, file$o, 18, 0, 887);
    			add_location(p4, file$o, 19, 0, 921);
    			add_location(p5, file$o, 20, 0, 946);
    			add_location(h21, file$o, 21, 0, 960);
    			add_location(strong0, file$o, 23, 2, 988);
    			add_location(p6, file$o, 22, 0, 982);
    			add_location(strong1, file$o, 27, 2, 1106);
    			add_location(p7, file$o, 26, 0, 1100);
    			add_location(strong2, file$o, 31, 2, 1218);
    			add_location(p8, file$o, 30, 0, 1212);
    			add_location(strong3, file$o, 38, 2, 1587);
    			add_location(p9, file$o, 37, 0, 1581);
    			add_location(strong4, file$o, 42, 2, 1755);
    			add_location(p10, file$o, 41, 0, 1749);
    			add_location(strong5, file$o, 46, 2, 1873);
    			add_location(p11, file$o, 45, 0, 1867);
    			add_location(strong6, file$o, 51, 2, 2084);
    			add_location(p12, file$o, 50, 0, 2078);
    			add_location(strong7, file$o, 54, 2, 2179);
    			add_location(p13, file$o, 53, 0, 2173);
    			add_location(strong8, file$o, 59, 2, 2406);
    			add_location(p14, file$o, 58, 0, 2400);
    			add_location(p15, file$o, 64, 0, 2723);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t4);
    			append_dev(p1, em);
    			append_dev(p1, t6);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p3, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, p5, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, p6, anchor);
    			append_dev(p6, strong0);
    			append_dev(p6, t21);
    			insert_dev(target, t22, anchor);
    			insert_dev(target, p7, anchor);
    			append_dev(p7, strong1);
    			append_dev(p7, t24);
    			insert_dev(target, t25, anchor);
    			insert_dev(target, p8, anchor);
    			append_dev(p8, strong2);
    			append_dev(p8, t27);
    			insert_dev(target, t28, anchor);
    			insert_dev(target, p9, anchor);
    			append_dev(p9, strong3);
    			append_dev(p9, t30);
    			insert_dev(target, t31, anchor);
    			insert_dev(target, p10, anchor);
    			append_dev(p10, strong4);
    			append_dev(p10, t33);
    			insert_dev(target, t34, anchor);
    			insert_dev(target, p11, anchor);
    			append_dev(p11, strong5);
    			append_dev(p11, t36);
    			insert_dev(target, t37, anchor);
    			insert_dev(target, p12, anchor);
    			append_dev(p12, strong6);
    			append_dev(p12, t39);
    			insert_dev(target, t40, anchor);
    			insert_dev(target, p13, anchor);
    			append_dev(p13, strong7);
    			append_dev(p13, t42);
    			insert_dev(target, t43, anchor);
    			insert_dev(target, p14, anchor);
    			append_dev(p14, strong8);
    			append_dev(p14, t45);
    			insert_dev(target, t46, anchor);
    			insert_dev(target, p15, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    				detach_dev(t1);
    				detach_dev(p0);
    				detach_dev(t3);
    				detach_dev(p1);
    				detach_dev(t7);
    				detach_dev(h20);
    				detach_dev(t9);
    				detach_dev(p2);
    				detach_dev(t11);
    				detach_dev(p3);
    				detach_dev(t13);
    				detach_dev(p4);
    				detach_dev(t15);
    				detach_dev(p5);
    				detach_dev(t17);
    				detach_dev(h21);
    				detach_dev(t19);
    				detach_dev(p6);
    				detach_dev(t22);
    				detach_dev(p7);
    				detach_dev(t25);
    				detach_dev(p8);
    				detach_dev(t28);
    				detach_dev(p9);
    				detach_dev(t31);
    				detach_dev(p10);
    				detach_dev(t34);
    				detach_dev(p11);
    				detach_dev(t37);
    				detach_dev(p12);
    				detach_dev(t40);
    				detach_dev(p13);
    				detach_dev(t43);
    				detach_dev(p14);
    				detach_dev(t46);
    				detach_dev(p15);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$o.name, type: "component", source: "", ctx });
    	return block;
    }

    class CacioPepe extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$o, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "CacioPepe", options, id: create_fragment$o.name });
    	}
    }

    /* src/pages/italian/Pesto.svelte generated by Svelte v3.12.1 */

    const file$p = "src/pages/italian/Pesto.svelte";

    function create_fragment$p(ctx) {
    	var h1, t1, p0, t3, h20, t5, p1, t7, p2, t9, p3, t11, p4, t13, p5, t15, h21, t17, p6, strong0, t19, t20, p7, strong1, t22, t23, p8, strong2, t25;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Pesto";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "As a child, I was scared off from pesto due to its bright green color and the\n  resulting association with vegetables. Luckily, the older me now understands\n  that pesto is as much about parmesan cheese as it is about basil, though that\n  is not to say that basil is not delicious.";
    			t3 = space();
    			h20 = element("h2");
    			h20.textContent = "Ingredients";
    			t5 = space();
    			p1 = element("p");
    			p1.textContent = "2 cups of fresh basil leaves";
    			t7 = space();
    			p2 = element("p");
    			p2.textContent = "2 tablespoons of crushed walnuts";
    			t9 = space();
    			p3 = element("p");
    			p3.textContent = "2 large cloves of garlic";
    			t11 = space();
    			p4 = element("p");
    			p4.textContent = "1/2 cup of parmesan cheese";
    			t13 = space();
    			p5 = element("p");
    			p5.textContent = "1/2 cup of olive oil";
    			t15 = space();
    			h21 = element("h2");
    			h21.textContent = "Instructions";
    			t17 = space();
    			p6 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Step 1:";
    			t19 = text(" Combine basil leaves, nuts and garlic in a blender and\n  blend");
    			t20 = space();
    			p7 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Step 2:";
    			t22 = text(" Adding a small amount of oil at a time, add in olive oil.\n  Do this until the desired consistency is reached");
    			t23 = space();
    			p8 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Step 3:";
    			t25 = text(" Add the parmesan and pulse the blender until it is combined");
    			add_location(h1, file$p, 0, 0, 0);
    			add_location(p0, file$p, 1, 0, 15);
    			add_location(h20, file$p, 7, 0, 308);
    			add_location(p1, file$p, 8, 0, 329);
    			add_location(p2, file$p, 9, 0, 365);
    			add_location(p3, file$p, 10, 0, 405);
    			add_location(p4, file$p, 11, 0, 437);
    			add_location(p5, file$p, 12, 0, 471);
    			add_location(h21, file$p, 13, 0, 499);
    			add_location(strong0, file$p, 15, 2, 527);
    			add_location(p6, file$p, 14, 0, 521);
    			add_location(strong1, file$p, 19, 2, 626);
    			add_location(p7, file$p, 18, 0, 620);
    			add_location(strong2, file$p, 23, 2, 771);
    			add_location(p8, file$p, 22, 0, 765);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p3, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p5, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, p6, anchor);
    			append_dev(p6, strong0);
    			append_dev(p6, t19);
    			insert_dev(target, t20, anchor);
    			insert_dev(target, p7, anchor);
    			append_dev(p7, strong1);
    			append_dev(p7, t22);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, p8, anchor);
    			append_dev(p8, strong2);
    			append_dev(p8, t25);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    				detach_dev(t1);
    				detach_dev(p0);
    				detach_dev(t3);
    				detach_dev(h20);
    				detach_dev(t5);
    				detach_dev(p1);
    				detach_dev(t7);
    				detach_dev(p2);
    				detach_dev(t9);
    				detach_dev(p3);
    				detach_dev(t11);
    				detach_dev(p4);
    				detach_dev(t13);
    				detach_dev(p5);
    				detach_dev(t15);
    				detach_dev(h21);
    				detach_dev(t17);
    				detach_dev(p6);
    				detach_dev(t20);
    				detach_dev(p7);
    				detach_dev(t23);
    				detach_dev(p8);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$p.name, type: "component", source: "", ctx });
    	return block;
    }

    class Pesto extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$p, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Pesto", options, id: create_fragment$p.name });
    	}
    }

    /* src/pages/central/Paprika.svelte generated by Svelte v3.12.1 */

    const file$q = "src/pages/central/Paprika.svelte";

    function create_fragment$q(ctx) {
    	var h1, t1, p0, t3, p1, t5, h20, strong0, t7, p2, t9, p3, t11, p4, t13, p5, t15, p6, t17, p7, t19, p8, t21, p9, t23, p10, t25, p11, strong1, t27, t28, p12, t30, p13, t32, p14, t34, p15, t36, h21, t38, p16, strong2, t40, t41, p17, strong3, t43, t44, p18, strong4, t46, t47, p19, strong5, t49, em0, t51, p20, strong6, t53, t54, p21, strong7, t56, t57, p22, strong8, t59, p23, em1, t61, p24, strong9, t63, t64, p25, strong10, t66, t67, p26, strong11, t69, t70, p27;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Chicken Paprikás with Nokedl";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "In the summer of 2019, my mother and I went on a trip together to Hungary. We\n  took a class called \"Easy Cooking Budapest\" and was led by a woman\n  called Cecilia Kertész. Between chopping vegetables and cooking meat, she\n  would tell us how times were tough and how under communist rule at least\n  everyone had what they needed. Below is her recipe for Chicken Paprikas with\n  Nokedl, a traditional Hungarian noodle.";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "Cooked meat, onions and paprika. Nothing could be more Hungarian!";
    			t5 = space();
    			h20 = element("h2");
    			strong0 = element("strong");
    			strong0.textContent = "Ingredients:";
    			t7 = space();
    			p2 = element("p");
    			p2.textContent = "2 big onions";
    			t9 = space();
    			p3 = element("p");
    			p3.textContent = "Approx. 4 tablespoons of sunflower oil";
    			t11 = space();
    			p4 = element("p");
    			p4.textContent = "4 teaspoons of salt";
    			t13 = space();
    			p5 = element("p");
    			p5.textContent = "1 teaspoon of ground pepper";
    			t15 = space();
    			p6 = element("p");
    			p6.textContent = "5 teaspoons of paprika powder";
    			t17 = space();
    			p7 = element("p");
    			p7.textContent = "6 legs of chicken";
    			t19 = space();
    			p8 = element("p");
    			p8.textContent = "330 g (12 oz) sour cream (20% fat)";
    			t21 = space();
    			p9 = element("p");
    			p9.textContent = "1 tablespoon of flour";
    			t23 = space();
    			p10 = element("p");
    			p10.textContent = "Water";
    			t25 = space();
    			p11 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Nokedl";
    			t27 = text(":");
    			t28 = space();
    			p12 = element("p");
    			p12.textContent = "9 tablespoons of flour";
    			t30 = space();
    			p13 = element("p");
    			p13.textContent = "3 eggs";
    			t32 = space();
    			p14 = element("p");
    			p14.textContent = "60 ml (0,25 cups) water - optional";
    			t34 = space();
    			p15 = element("p");
    			p15.textContent = "1 coffee spoon of salt";
    			t36 = space();
    			h21 = element("h2");
    			h21.textContent = "Instructions:";
    			t38 = space();
    			p16 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Step 1: ";
    			t40 = text("Chop the onions into small pieces. Heat the oil in a\n  big pan and fry the onions until they are glassy.");
    			t41 = space();
    			p17 = element("p");
    			strong3 = element("strong");
    			strong3.textContent = "Step 2: ";
    			t43 = text("Pull the pan off the fire and add the salt, pepper\n  and paprika powder. Pour 1 dl (half a cup) of water on the mixture, so the\n  paprika powder doesn’t get burnt, then put the pan back over the fire.");
    			t44 = space();
    			p18 = element("p");
    			strong4 = element("strong");
    			strong4.textContent = "Step 3";
    			t46 = text(": Wash the chicken legs and cut them into upper and\n  lower leg (thigh and leg). Add the chicken legs to the pan and pour water on\n  top, just to cover them up.");
    			t47 = space();
    			p19 = element("p");
    			strong5 = element("strong");
    			strong5.textContent = "Step 4:";
    			t49 = text(" Cover the pan and cook for one hour on high heat.\n  ");
    			em0 = element("em");
    			em0.textContent = "The goal here is to braise the legs. You can also put them in the oven at\n    350 for an hour";
    			t51 = space();
    			p20 = element("p");
    			strong6 = element("strong");
    			strong6.textContent = "Step 4:";
    			t53 = text(" Mix the sour cream with the flour.");
    			t54 = space();
    			p21 = element("p");
    			strong7 = element("strong");
    			strong7.textContent = "Step 5:";
    			t56 = text(" Once the chicken is soft, pull it off the fire and mix\n  in the sour cream. Boil once more.");
    			t57 = space();
    			p22 = element("p");
    			strong8 = element("strong");
    			strong8.textContent = "Prepare the nokedli:";
    			t59 = space();
    			p23 = element("p");
    			em1 = element("em");
    			em1.textContent = "I would suggest doing this while the chicken is braising";
    			t61 = space();
    			p24 = element("p");
    			strong9 = element("strong");
    			strong9.textContent = "Step 1:";
    			t63 = text(" Mix the ingredients until you get a hard dough.");
    			t64 = space();
    			p25 = element("p");
    			strong10 = element("strong");
    			strong10.textContent = "Step 2:";
    			t66 = text(" ’Tear’ the nokedli-dough into boiling water. Keep it on\n  the fire until it boils again (don’t cook any longer).");
    			t67 = space();
    			p26 = element("p");
    			strong11 = element("strong");
    			strong11.textContent = "Step 3:";
    			t69 = text(" Serve the chicken paprikás with the nokedli.");
    			t70 = space();
    			p27 = element("p");
    			p27.textContent = " ";
    			add_location(h1, file$q, 0, 0, 0);
    			add_location(p0, file$q, 1, 0, 38);
    			add_location(p1, file$q, 9, 0, 478);
    			add_location(strong0, file$q, 10, 4, 555);
    			add_location(h20, file$q, 10, 0, 551);
    			add_location(p2, file$q, 11, 0, 590);
    			add_location(p3, file$q, 12, 0, 610);
    			add_location(p4, file$q, 13, 0, 656);
    			add_location(p5, file$q, 14, 0, 683);
    			add_location(p6, file$q, 15, 0, 718);
    			add_location(p7, file$q, 16, 0, 755);
    			add_location(p8, file$q, 17, 0, 780);
    			add_location(p9, file$q, 18, 0, 822);
    			add_location(p10, file$q, 19, 0, 851);
    			add_location(strong1, file$q, 20, 3, 867);
    			add_location(p11, file$q, 20, 0, 864);
    			add_location(p12, file$q, 21, 0, 896);
    			add_location(p13, file$q, 22, 0, 926);
    			add_location(p14, file$q, 23, 0, 940);
    			add_location(p15, file$q, 24, 0, 982);
    			add_location(h21, file$q, 25, 0, 1012);
    			add_location(strong2, file$q, 27, 2, 1041);
    			add_location(p16, file$q, 26, 0, 1035);
    			add_location(strong3, file$q, 31, 2, 1182);
    			add_location(p17, file$q, 30, 0, 1176);
    			add_location(strong4, file$q, 36, 2, 1419);
    			add_location(p18, file$q, 35, 0, 1413);
    			add_location(strong5, file$q, 41, 2, 1614);
    			add_location(em0, file$q, 42, 2, 1691);
    			add_location(p19, file$q, 40, 0, 1608);
    			add_location(strong6, file$q, 47, 3, 1810);
    			add_location(p20, file$q, 47, 0, 1807);
    			add_location(strong7, file$q, 49, 2, 1880);
    			add_location(p21, file$q, 48, 0, 1874);
    			add_location(strong8, file$q, 52, 3, 2005);
    			add_location(p22, file$q, 52, 0, 2002);
    			add_location(em1, file$q, 53, 3, 2050);
    			add_location(p23, file$q, 53, 0, 2047);
    			add_location(strong9, file$q, 54, 3, 2123);
    			add_location(p24, file$q, 54, 0, 2120);
    			add_location(strong10, file$q, 56, 2, 2206);
    			add_location(p25, file$q, 55, 0, 2200);
    			add_location(strong11, file$q, 59, 3, 2352);
    			add_location(p26, file$q, 59, 0, 2349);
    			add_location(p27, file$q, 60, 0, 2426);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, h20, anchor);
    			append_dev(h20, strong0);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p3, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p5, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, p6, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, p7, anchor);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, p8, anchor);
    			insert_dev(target, t21, anchor);
    			insert_dev(target, p9, anchor);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, p10, anchor);
    			insert_dev(target, t25, anchor);
    			insert_dev(target, p11, anchor);
    			append_dev(p11, strong1);
    			append_dev(p11, t27);
    			insert_dev(target, t28, anchor);
    			insert_dev(target, p12, anchor);
    			insert_dev(target, t30, anchor);
    			insert_dev(target, p13, anchor);
    			insert_dev(target, t32, anchor);
    			insert_dev(target, p14, anchor);
    			insert_dev(target, t34, anchor);
    			insert_dev(target, p15, anchor);
    			insert_dev(target, t36, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t38, anchor);
    			insert_dev(target, p16, anchor);
    			append_dev(p16, strong2);
    			append_dev(p16, t40);
    			insert_dev(target, t41, anchor);
    			insert_dev(target, p17, anchor);
    			append_dev(p17, strong3);
    			append_dev(p17, t43);
    			insert_dev(target, t44, anchor);
    			insert_dev(target, p18, anchor);
    			append_dev(p18, strong4);
    			append_dev(p18, t46);
    			insert_dev(target, t47, anchor);
    			insert_dev(target, p19, anchor);
    			append_dev(p19, strong5);
    			append_dev(p19, t49);
    			append_dev(p19, em0);
    			insert_dev(target, t51, anchor);
    			insert_dev(target, p20, anchor);
    			append_dev(p20, strong6);
    			append_dev(p20, t53);
    			insert_dev(target, t54, anchor);
    			insert_dev(target, p21, anchor);
    			append_dev(p21, strong7);
    			append_dev(p21, t56);
    			insert_dev(target, t57, anchor);
    			insert_dev(target, p22, anchor);
    			append_dev(p22, strong8);
    			insert_dev(target, t59, anchor);
    			insert_dev(target, p23, anchor);
    			append_dev(p23, em1);
    			insert_dev(target, t61, anchor);
    			insert_dev(target, p24, anchor);
    			append_dev(p24, strong9);
    			append_dev(p24, t63);
    			insert_dev(target, t64, anchor);
    			insert_dev(target, p25, anchor);
    			append_dev(p25, strong10);
    			append_dev(p25, t66);
    			insert_dev(target, t67, anchor);
    			insert_dev(target, p26, anchor);
    			append_dev(p26, strong11);
    			append_dev(p26, t69);
    			insert_dev(target, t70, anchor);
    			insert_dev(target, p27, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    				detach_dev(t1);
    				detach_dev(p0);
    				detach_dev(t3);
    				detach_dev(p1);
    				detach_dev(t5);
    				detach_dev(h20);
    				detach_dev(t7);
    				detach_dev(p2);
    				detach_dev(t9);
    				detach_dev(p3);
    				detach_dev(t11);
    				detach_dev(p4);
    				detach_dev(t13);
    				detach_dev(p5);
    				detach_dev(t15);
    				detach_dev(p6);
    				detach_dev(t17);
    				detach_dev(p7);
    				detach_dev(t19);
    				detach_dev(p8);
    				detach_dev(t21);
    				detach_dev(p9);
    				detach_dev(t23);
    				detach_dev(p10);
    				detach_dev(t25);
    				detach_dev(p11);
    				detach_dev(t28);
    				detach_dev(p12);
    				detach_dev(t30);
    				detach_dev(p13);
    				detach_dev(t32);
    				detach_dev(p14);
    				detach_dev(t34);
    				detach_dev(p15);
    				detach_dev(t36);
    				detach_dev(h21);
    				detach_dev(t38);
    				detach_dev(p16);
    				detach_dev(t41);
    				detach_dev(p17);
    				detach_dev(t44);
    				detach_dev(p18);
    				detach_dev(t47);
    				detach_dev(p19);
    				detach_dev(t51);
    				detach_dev(p20);
    				detach_dev(t54);
    				detach_dev(p21);
    				detach_dev(t57);
    				detach_dev(p22);
    				detach_dev(t59);
    				detach_dev(p23);
    				detach_dev(t61);
    				detach_dev(p24);
    				detach_dev(t64);
    				detach_dev(p25);
    				detach_dev(t67);
    				detach_dev(p26);
    				detach_dev(t70);
    				detach_dev(p27);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$q.name, type: "component", source: "", ctx });
    	return block;
    }

    class Paprika extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$q, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Paprika", options, id: create_fragment$q.name });
    	}
    }

    /* src/pages/central/Korozott.svelte generated by Svelte v3.12.1 */

    const file$r = "src/pages/central/Korozott.svelte";

    function create_fragment$r(ctx) {
    	var h1, strong0, t1, p0, t3, p1, strong1, t5, p2, t6, em, t8, p3, t10, p4, t12, p5, t14, p6, t16, p7, t18, p8, t20, p9, t22, p10, t24, p11, t26, h2, t28, p12, strong2, t30, t31, p13, strong3, t33, t34, p14, strong4, t36, t37, p15, strong5, t39, t40, p16, strong6, t42;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			strong0 = element("strong");
    			strong0.textContent = "Kőrözött";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "In the summer of 2019, my mother and I went on a trip together to Hungary. We\n  took a class called \"Easy Cooking Budapest\" and was led by a woman\n  called Cecilia Kertész. Between chopping vegetables and cooking meat, she\n  would tell us how times were tough and how under communist rule at least\n  everyone had what they needed. Below is her recipe for Kőrözött which is a\n  sort of dip that is best served with chips or toasted bread.";
    			t3 = space();
    			p1 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Ingredients:";
    			t5 = space();
    			p2 = element("p");
    			t6 = text("400 g (14 oz) sheep cottage cheese (cow cheese for a milder taste, or 50-50%) ");
    			em = element("em");
    			em.textContent = "Use ricotta if not available";
    			t8 = space();
    			p3 = element("p");
    			p3.textContent = "1 onion";
    			t10 = space();
    			p4 = element("p");
    			p4.textContent = "175 g (6 oz) sour cream (or more if you want it creamier)";
    			t12 = space();
    			p5 = element("p");
    			p5.textContent = "4 teaspoons of paprika powder";
    			t14 = space();
    			p6 = element("p");
    			p6.textContent = "2 teaspoons of ground pepper";
    			t16 = space();
    			p7 = element("p");
    			p7.textContent = "2 tablespoons of mustard";
    			t18 = space();
    			p8 = element("p");
    			p8.textContent = "2 fresh spring onions (optional)";
    			t20 = space();
    			p9 = element("p");
    			p9.textContent = "1 teaspoon of hot paprika/ chili pepper";
    			t22 = space();
    			p10 = element("p");
    			p10.textContent = "1/2 teaspoon ground caraway seed";
    			t24 = space();
    			p11 = element("p");
    			p11.textContent = "1 coffee-spoon of cognac (optional)";
    			t26 = space();
    			h2 = element("h2");
    			h2.textContent = "Instructions";
    			t28 = space();
    			p12 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Step 1:";
    			t30 = text(" Chop the onions in small pieces.");
    			t31 = space();
    			p13 = element("p");
    			strong3 = element("strong");
    			strong3.textContent = "Step 2:";
    			t33 = text(" Mix the onions in the ricotta.");
    			t34 = space();
    			p14 = element("p");
    			strong4 = element("strong");
    			strong4.textContent = "Step 3:";
    			t36 = text(" Then, mix in the paprika powder.");
    			t37 = space();
    			p15 = element("p");
    			strong5 = element("strong");
    			strong5.textContent = "Step 4:";
    			t39 = text(" Mix in the other spices, the mustard and the cognac. (You\n  don’t need chili if the paprika powder is hot.)");
    			t40 = space();
    			p16 = element("p");
    			strong6 = element("strong");
    			strong6.textContent = "Step 5:";
    			t42 = text(" Mix in the sour cream with a fork, the amount depends\n  on how creamy you like your kőrözött.");
    			add_location(strong0, file$r, 0, 4, 4);
    			add_location(h1, file$r, 0, 0, 0);
    			add_location(p0, file$r, 1, 0, 35);
    			add_location(strong1, file$r, 9, 3, 497);
    			add_location(p1, file$r, 9, 0, 494);
    			add_location(em, file$r, 11, 80, 615);
    			add_location(p2, file$r, 10, 0, 531);
    			add_location(p3, file$r, 15, 0, 666);
    			add_location(p4, file$r, 16, 0, 681);
    			add_location(p5, file$r, 17, 0, 746);
    			add_location(p6, file$r, 18, 0, 783);
    			add_location(p7, file$r, 19, 0, 819);
    			add_location(p8, file$r, 20, 0, 851);
    			add_location(p9, file$r, 21, 0, 891);
    			add_location(p10, file$r, 22, 0, 938);
    			add_location(p11, file$r, 23, 0, 978);
    			add_location(h2, file$r, 24, 0, 1021);
    			add_location(strong2, file$r, 25, 3, 1046);
    			add_location(p12, file$r, 25, 0, 1043);
    			add_location(strong3, file$r, 26, 3, 1111);
    			add_location(p13, file$r, 26, 0, 1108);
    			add_location(strong4, file$r, 27, 3, 1174);
    			add_location(p14, file$r, 27, 0, 1171);
    			add_location(strong5, file$r, 29, 2, 1242);
    			add_location(p15, file$r, 28, 0, 1236);
    			add_location(strong6, file$r, 33, 2, 1386);
    			add_location(p16, file$r, 32, 0, 1380);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			append_dev(h1, strong0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, strong1);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, p2, anchor);
    			append_dev(p2, t6);
    			append_dev(p2, em);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, p3, anchor);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, p5, anchor);
    			insert_dev(target, t14, anchor);
    			insert_dev(target, p6, anchor);
    			insert_dev(target, t16, anchor);
    			insert_dev(target, p7, anchor);
    			insert_dev(target, t18, anchor);
    			insert_dev(target, p8, anchor);
    			insert_dev(target, t20, anchor);
    			insert_dev(target, p9, anchor);
    			insert_dev(target, t22, anchor);
    			insert_dev(target, p10, anchor);
    			insert_dev(target, t24, anchor);
    			insert_dev(target, p11, anchor);
    			insert_dev(target, t26, anchor);
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t28, anchor);
    			insert_dev(target, p12, anchor);
    			append_dev(p12, strong2);
    			append_dev(p12, t30);
    			insert_dev(target, t31, anchor);
    			insert_dev(target, p13, anchor);
    			append_dev(p13, strong3);
    			append_dev(p13, t33);
    			insert_dev(target, t34, anchor);
    			insert_dev(target, p14, anchor);
    			append_dev(p14, strong4);
    			append_dev(p14, t36);
    			insert_dev(target, t37, anchor);
    			insert_dev(target, p15, anchor);
    			append_dev(p15, strong5);
    			append_dev(p15, t39);
    			insert_dev(target, t40, anchor);
    			insert_dev(target, p16, anchor);
    			append_dev(p16, strong6);
    			append_dev(p16, t42);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    				detach_dev(t1);
    				detach_dev(p0);
    				detach_dev(t3);
    				detach_dev(p1);
    				detach_dev(t5);
    				detach_dev(p2);
    				detach_dev(t8);
    				detach_dev(p3);
    				detach_dev(t10);
    				detach_dev(p4);
    				detach_dev(t12);
    				detach_dev(p5);
    				detach_dev(t14);
    				detach_dev(p6);
    				detach_dev(t16);
    				detach_dev(p7);
    				detach_dev(t18);
    				detach_dev(p8);
    				detach_dev(t20);
    				detach_dev(p9);
    				detach_dev(t22);
    				detach_dev(p10);
    				detach_dev(t24);
    				detach_dev(p11);
    				detach_dev(t26);
    				detach_dev(h2);
    				detach_dev(t28);
    				detach_dev(p12);
    				detach_dev(t31);
    				detach_dev(p13);
    				detach_dev(t34);
    				detach_dev(p14);
    				detach_dev(t37);
    				detach_dev(p15);
    				detach_dev(t40);
    				detach_dev(p16);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$r.name, type: "component", source: "", ctx });
    	return block;
    }

    class Korozott extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$r, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Korozott", options, id: create_fragment$r.name });
    	}
    }

    /* src/pages/central/Makosguba.svelte generated by Svelte v3.12.1 */

    const file$s = "src/pages/central/Makosguba.svelte";

    function create_fragment$s(ctx) {
    	var h1, t1, p0, t3, p1, t5, h20, t7, p2, t9, p3, t11, p4, t13, p5, t15, p6, t17, p7, t19, p8, t21, p9, strong0, t23, p10, t25, p11, t27, p12, t29, p13, t31, p14, t33, h21, t35, p15, strong1, t37, t38, p16, strong2, t40, t41, p17, strong3, t43, t44, p18, strong4, t46, t47, p19, strong5, t49, t50, p20, strong6, t52, t53, p21, em, t55, p22, strong7, t57, t58, p23, strong8, t60, t61, p24, strong9, t63;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Mákosguba";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "In the summer of 2019, my mother and I went on a trip together to Hungary. We\n  took a class called \"Easy Cooking Budapest\" and was led by a woman\n  called Cecilia Kertész. Between chopping vegetables and cooking meat, she\n  would tell us how times were tough and how under communist rule at least\n  everyone had what they needed.";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "The mákosguba is originally a Christmas dessert for good luck. It is said,\n  that the many little poppy seeds will bring wealth to the house in the new\n  year.";
    			t5 = space();
    			h20 = element("h2");
    			h20.textContent = "Ingredients:";
    			t7 = space();
    			p2 = element("p");
    			p2.textContent = "15 tablespoons of ground poppy seeds";
    			t9 = space();
    			p3 = element("p");
    			p3.textContent = "7 tablespoons of powdered sugar";
    			t11 = space();
    			p4 = element("p");
    			p4.textContent = "10 dry crescent rolls (you can use dry white bread or sweet bread)";
    			t13 = space();
    			p5 = element("p");
    			p5.textContent = "1,5 liters of milk (2,8 or 3,5% fat)";
    			t15 = space();
    			p6 = element("p");
    			p6.textContent = "1 tablespoon of rum (or rum aroma)";
    			t17 = space();
    			p7 = element("p");
    			p7.textContent = "Raisins (optional)";
    			t19 = space();
    			p8 = element("p");
    			p8.textContent = "1 pack of vanilla sugar";
    			t21 = space();
    			p9 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "For the vanilla custard:";
    			t23 = space();
    			p10 = element("p");
    			p10.textContent = "5 egg yolks";
    			t25 = space();
    			p11 = element("p");
    			p11.textContent = "4 tablespoons of sugar";
    			t27 = space();
    			p12 = element("p");
    			p12.textContent = "1-2 tablespoons of flour";
    			t29 = space();
    			p13 = element("p");
    			p13.textContent = "0,5 liters of milk";
    			t31 = space();
    			p14 = element("p");
    			p14.textContent = "1 pack of vanilla sugar";
    			t33 = space();
    			h21 = element("h2");
    			h21.textContent = "Instructions:";
    			t35 = space();
    			p15 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Step 1:";
    			t37 = text(" Cut the crescent rolls in 2 cm wide slices.");
    			t38 = space();
    			p16 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Step 2:";
    			t40 = text(" Boil the milk with the pack of vanilla sugar.");
    			t41 = space();
    			p17 = element("p");
    			strong3 = element("strong");
    			strong3.textContent = "Step 3:";
    			t43 = text(" Pour the milk on the crescent rolls, make sure all of\n  them are soaked.");
    			t44 = space();
    			p18 = element("p");
    			strong4 = element("strong");
    			strong4.textContent = "Step 4:";
    			t46 = text(" Mix the poppy seeds with the sugar.");
    			t47 = space();
    			p19 = element("p");
    			strong5 = element("strong");
    			strong5.textContent = "Step 5:";
    			t49 = text(" Get a big bowl that you can also put in the oven. Put\n  a layer of the soaked bread rolls on the bottom, then a layer of the poppy seed-\n  sugar mix, then a layer of the bread again. Carry on until you run out of ingredients.\n  You can also put raisins between the layers.");
    			t50 = space();
    			p20 = element("p");
    			strong6 = element("strong");
    			strong6.textContent = "Step 6:";
    			t52 = text(" Put the bowl in the oven for 10-15 minutes on 150 °C.");
    			t53 = space();
    			p21 = element("p");
    			em = element("em");
    			em.textContent = "Prepare the vanilla custard:";
    			t55 = space();
    			p22 = element("p");
    			strong7 = element("strong");
    			strong7.textContent = "Step 1:";
    			t57 = text(" Mix the egg yolks with the sugar and the vanilla sugar.");
    			t58 = space();
    			p23 = element("p");
    			strong8 = element("strong");
    			strong8.textContent = "Step 2:";
    			t60 = text(" Slowly add the flour and the milk to the egg yolks over\n  gentle heat until it is as thick as you want it.");
    			t61 = space();
    			p24 = element("p");
    			strong9 = element("strong");
    			strong9.textContent = "Step 3:";
    			t63 = text(" Serve the baked poppy seed bread with the vanilla custard.\n  You can use sweet butter instead of the vanilla custard: heat up butter in a pan\n  until just before it starts burning.");
    			add_location(h1, file$s, 0, 0, 0);
    			add_location(p0, file$s, 1, 0, 19);
    			add_location(p1, file$s, 8, 0, 371);
    			add_location(h20, file$s, 13, 0, 542);
    			add_location(p2, file$s, 14, 0, 564);
    			add_location(p3, file$s, 15, 0, 608);
    			add_location(p4, file$s, 16, 0, 647);
    			add_location(p5, file$s, 17, 0, 721);
    			add_location(p6, file$s, 18, 0, 765);
    			add_location(p7, file$s, 19, 0, 807);
    			add_location(p8, file$s, 20, 0, 833);
    			add_location(strong0, file$s, 21, 3, 867);
    			add_location(p9, file$s, 21, 0, 864);
    			add_location(p10, file$s, 22, 0, 913);
    			add_location(p11, file$s, 23, 0, 932);
    			add_location(p12, file$s, 24, 0, 962);
    			add_location(p13, file$s, 25, 0, 994);
    			add_location(p14, file$s, 26, 0, 1020);
    			add_location(h21, file$s, 27, 0, 1051);
    			add_location(strong1, file$s, 28, 3, 1077);
    			add_location(p15, file$s, 28, 0, 1074);
    			add_location(strong2, file$s, 29, 3, 1153);
    			add_location(p16, file$s, 29, 0, 1150);
    			add_location(strong3, file$s, 31, 2, 1234);
    			add_location(p17, file$s, 30, 0, 1228);
    			add_location(strong4, file$s, 34, 3, 1340);
    			add_location(p18, file$s, 34, 0, 1337);
    			add_location(strong5, file$s, 36, 2, 1411);
    			add_location(p19, file$s, 35, 0, 1405);
    			add_location(strong6, file$s, 42, 2, 1720);
    			add_location(p20, file$s, 41, 0, 1714);
    			add_location(em, file$s, 44, 3, 1808);
    			add_location(p21, file$s, 44, 0, 1805);
    			add_location(strong7, file$s, 46, 2, 1856);
    			add_location(p22, file$s, 45, 0, 1850);
    			add_location(strong8, file$s, 49, 2, 1948);
    			add_location(p23, file$s, 48, 0, 1942);
    			add_location(strong9, file$s, 53, 2, 2091);
    			add_location(p24, file$s, 52, 0, 2085);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p3, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p5, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, p6, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, p7, anchor);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, p8, anchor);
    			insert_dev(target, t21, anchor);
    			insert_dev(target, p9, anchor);
    			append_dev(p9, strong0);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, p10, anchor);
    			insert_dev(target, t25, anchor);
    			insert_dev(target, p11, anchor);
    			insert_dev(target, t27, anchor);
    			insert_dev(target, p12, anchor);
    			insert_dev(target, t29, anchor);
    			insert_dev(target, p13, anchor);
    			insert_dev(target, t31, anchor);
    			insert_dev(target, p14, anchor);
    			insert_dev(target, t33, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t35, anchor);
    			insert_dev(target, p15, anchor);
    			append_dev(p15, strong1);
    			append_dev(p15, t37);
    			insert_dev(target, t38, anchor);
    			insert_dev(target, p16, anchor);
    			append_dev(p16, strong2);
    			append_dev(p16, t40);
    			insert_dev(target, t41, anchor);
    			insert_dev(target, p17, anchor);
    			append_dev(p17, strong3);
    			append_dev(p17, t43);
    			insert_dev(target, t44, anchor);
    			insert_dev(target, p18, anchor);
    			append_dev(p18, strong4);
    			append_dev(p18, t46);
    			insert_dev(target, t47, anchor);
    			insert_dev(target, p19, anchor);
    			append_dev(p19, strong5);
    			append_dev(p19, t49);
    			insert_dev(target, t50, anchor);
    			insert_dev(target, p20, anchor);
    			append_dev(p20, strong6);
    			append_dev(p20, t52);
    			insert_dev(target, t53, anchor);
    			insert_dev(target, p21, anchor);
    			append_dev(p21, em);
    			insert_dev(target, t55, anchor);
    			insert_dev(target, p22, anchor);
    			append_dev(p22, strong7);
    			append_dev(p22, t57);
    			insert_dev(target, t58, anchor);
    			insert_dev(target, p23, anchor);
    			append_dev(p23, strong8);
    			append_dev(p23, t60);
    			insert_dev(target, t61, anchor);
    			insert_dev(target, p24, anchor);
    			append_dev(p24, strong9);
    			append_dev(p24, t63);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    				detach_dev(t1);
    				detach_dev(p0);
    				detach_dev(t3);
    				detach_dev(p1);
    				detach_dev(t5);
    				detach_dev(h20);
    				detach_dev(t7);
    				detach_dev(p2);
    				detach_dev(t9);
    				detach_dev(p3);
    				detach_dev(t11);
    				detach_dev(p4);
    				detach_dev(t13);
    				detach_dev(p5);
    				detach_dev(t15);
    				detach_dev(p6);
    				detach_dev(t17);
    				detach_dev(p7);
    				detach_dev(t19);
    				detach_dev(p8);
    				detach_dev(t21);
    				detach_dev(p9);
    				detach_dev(t23);
    				detach_dev(p10);
    				detach_dev(t25);
    				detach_dev(p11);
    				detach_dev(t27);
    				detach_dev(p12);
    				detach_dev(t29);
    				detach_dev(p13);
    				detach_dev(t31);
    				detach_dev(p14);
    				detach_dev(t33);
    				detach_dev(h21);
    				detach_dev(t35);
    				detach_dev(p15);
    				detach_dev(t38);
    				detach_dev(p16);
    				detach_dev(t41);
    				detach_dev(p17);
    				detach_dev(t44);
    				detach_dev(p18);
    				detach_dev(t47);
    				detach_dev(p19);
    				detach_dev(t50);
    				detach_dev(p20);
    				detach_dev(t53);
    				detach_dev(p21);
    				detach_dev(t55);
    				detach_dev(p22);
    				detach_dev(t58);
    				detach_dev(p23);
    				detach_dev(t61);
    				detach_dev(p24);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$s.name, type: "component", source: "", ctx });
    	return block;
    }

    class Makosguba extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$s, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Makosguba", options, id: create_fragment$s.name });
    	}
    }

    /* src/pages/central/HungarianPea.svelte generated by Svelte v3.12.1 */

    const file$t = "src/pages/central/HungarianPea.svelte";

    function create_fragment$t(ctx) {
    	var h1, t1, p0, t3, p1, t5, h20, strong0, t7, p2, strong1, t9, p3, t11, p4, t13, p5, t15, p6, t17, p7, t19, p8, t21, p9, t23, p10, t25, p11, t27, p12, t29, p13, t31, h21, t33, p14, strong2, t35, t36, p15, strong3, t38, t39, p16, strong4, t41, t42, p17, strong5, t44, t45, p18, strong6, t47, t48, p19, strong7, t50, t51, p20;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Hungarian Pea Soup";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "In the summer of 2019, my mother and I went on a trip together to Hungary. We\n  took a class called \"Easy Cooking Budapest\" and was led by a woman\n  called Cecilia Kertész. Between chopping vegetables and cooking meat, she\n  would tell us how times were tough and how under communist rule at least\n  everyone had what they needed. Below is her recipe for a traditional pea soup.";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "This is the vegetarian version, but it is great with chicken too.";
    			t5 = space();
    			h20 = element("h2");
    			strong0 = element("strong");
    			strong0.textContent = "Ingredients:";
    			t7 = space();
    			p2 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "For the soup";
    			t9 = space();
    			p3 = element("p");
    			p3.textContent = "3 tablespoons of cooking oil";
    			t11 = space();
    			p4 = element("p");
    			p4.textContent = "1 big onion";
    			t13 = space();
    			p5 = element("p");
    			p5.textContent = "18 oz (400 g) of green pea (fresh or frozen)";
    			t15 = space();
    			p6 = element("p");
    			p6.textContent = "1 tablespoon of tarragon";
    			t17 = space();
    			p7 = element("p");
    			p7.textContent = "3 carrots";
    			t19 = space();
    			p8 = element("p");
    			p8.textContent = "1 parsley root or turnip";
    			t21 = space();
    			p9 = element("p");
    			p9.textContent = "2 liters of vegetable broth";
    			t23 = space();
    			p10 = element("p");
    			p10.textContent = "1 teaspoon of salt";
    			t25 = space();
    			p11 = element("p");
    			p11.textContent = "1 coffee spoon of ground black pepper";
    			t27 = space();
    			p12 = element("p");
    			p12.textContent = "Parsley";
    			t29 = space();
    			p13 = element("p");
    			p13.textContent = "3 dl (10 oz) cooking cream";
    			t31 = space();
    			h21 = element("h2");
    			h21.textContent = "Instructions";
    			t33 = space();
    			p14 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Step 1:";
    			t35 = text(" Chop the onion into small pieces and fry it on hot oil,\n  until it is glassy.");
    			t36 = space();
    			p15 = element("p");
    			strong3 = element("strong");
    			strong3.textContent = "Step 2:";
    			t38 = text(" Add the tarragon, salt and pepper.");
    			t39 = space();
    			p16 = element("p");
    			strong4 = element("strong");
    			strong4.textContent = "Step 3:";
    			t41 = text(" Clean the vegetables and cut them into fine slices. Put\n  the vegetables together with the pea on the onion (if the pea is very tender, 7-8\n  minutes of cooking is enough, so add only 20 minutes later, otherwise it will get\n  hard and loose its colour).");
    			t42 = space();
    			p17 = element("p");
    			strong5 = element("strong");
    			strong5.textContent = "Step 4:";
    			t44 = text(" Fry the vegetables for 3-5 minutes, then pour the broth\n  on the mixture and cook ready for 30 minutes.");
    			t45 = space();
    			p18 = element("p");
    			strong6 = element("strong");
    			strong6.textContent = "Step 5:";
    			t47 = text(" Add hot broth to the cream to heat it up before you add\n  it to the soup, then slowly mix it into the soup.iKeep it on the fire until it\n  boils again (don’t cook any longer).");
    			t48 = space();
    			p19 = element("p");
    			strong7 = element("strong");
    			strong7.textContent = "Step 6:";
    			t50 = text(" Before serving, sprinkle some freshly chopped parsley\n  on top.");
    			t51 = space();
    			p20 = element("p");
    			p20.textContent = " ";
    			add_location(h1, file$t, 0, 0, 0);
    			add_location(p0, file$t, 1, 0, 28);
    			add_location(p1, file$t, 8, 0, 428);
    			add_location(strong0, file$t, 9, 4, 505);
    			add_location(h20, file$t, 9, 0, 501);
    			add_location(strong1, file$t, 10, 3, 543);
    			add_location(p2, file$t, 10, 0, 540);
    			add_location(p3, file$t, 11, 0, 577);
    			add_location(p4, file$t, 12, 0, 613);
    			add_location(p5, file$t, 13, 0, 632);
    			add_location(p6, file$t, 14, 0, 684);
    			add_location(p7, file$t, 15, 0, 716);
    			add_location(p8, file$t, 16, 0, 733);
    			add_location(p9, file$t, 17, 0, 765);
    			add_location(p10, file$t, 18, 0, 800);
    			add_location(p11, file$t, 19, 0, 826);
    			add_location(p12, file$t, 20, 0, 871);
    			add_location(p13, file$t, 21, 0, 886);
    			add_location(h21, file$t, 22, 0, 920);
    			add_location(strong2, file$t, 24, 2, 948);
    			add_location(p14, file$t, 23, 0, 942);
    			add_location(strong3, file$t, 27, 3, 1059);
    			add_location(p15, file$t, 27, 0, 1056);
    			add_location(strong4, file$t, 29, 2, 1129);
    			add_location(p16, file$t, 28, 0, 1123);
    			add_location(strong5, file$t, 35, 2, 1419);
    			add_location(p17, file$t, 34, 0, 1413);
    			add_location(strong6, file$t, 39, 2, 1559);
    			add_location(p18, file$t, 38, 0, 1553);
    			add_location(strong7, file$t, 44, 2, 1771);
    			add_location(p19, file$t, 43, 0, 1765);
    			add_location(p20, file$t, 47, 0, 1865);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, h20, anchor);
    			append_dev(h20, strong0);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p2, anchor);
    			append_dev(p2, strong1);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p3, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p5, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, p6, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, p7, anchor);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, p8, anchor);
    			insert_dev(target, t21, anchor);
    			insert_dev(target, p9, anchor);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, p10, anchor);
    			insert_dev(target, t25, anchor);
    			insert_dev(target, p11, anchor);
    			insert_dev(target, t27, anchor);
    			insert_dev(target, p12, anchor);
    			insert_dev(target, t29, anchor);
    			insert_dev(target, p13, anchor);
    			insert_dev(target, t31, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t33, anchor);
    			insert_dev(target, p14, anchor);
    			append_dev(p14, strong2);
    			append_dev(p14, t35);
    			insert_dev(target, t36, anchor);
    			insert_dev(target, p15, anchor);
    			append_dev(p15, strong3);
    			append_dev(p15, t38);
    			insert_dev(target, t39, anchor);
    			insert_dev(target, p16, anchor);
    			append_dev(p16, strong4);
    			append_dev(p16, t41);
    			insert_dev(target, t42, anchor);
    			insert_dev(target, p17, anchor);
    			append_dev(p17, strong5);
    			append_dev(p17, t44);
    			insert_dev(target, t45, anchor);
    			insert_dev(target, p18, anchor);
    			append_dev(p18, strong6);
    			append_dev(p18, t47);
    			insert_dev(target, t48, anchor);
    			insert_dev(target, p19, anchor);
    			append_dev(p19, strong7);
    			append_dev(p19, t50);
    			insert_dev(target, t51, anchor);
    			insert_dev(target, p20, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    				detach_dev(t1);
    				detach_dev(p0);
    				detach_dev(t3);
    				detach_dev(p1);
    				detach_dev(t5);
    				detach_dev(h20);
    				detach_dev(t7);
    				detach_dev(p2);
    				detach_dev(t9);
    				detach_dev(p3);
    				detach_dev(t11);
    				detach_dev(p4);
    				detach_dev(t13);
    				detach_dev(p5);
    				detach_dev(t15);
    				detach_dev(p6);
    				detach_dev(t17);
    				detach_dev(p7);
    				detach_dev(t19);
    				detach_dev(p8);
    				detach_dev(t21);
    				detach_dev(p9);
    				detach_dev(t23);
    				detach_dev(p10);
    				detach_dev(t25);
    				detach_dev(p11);
    				detach_dev(t27);
    				detach_dev(p12);
    				detach_dev(t29);
    				detach_dev(p13);
    				detach_dev(t31);
    				detach_dev(h21);
    				detach_dev(t33);
    				detach_dev(p14);
    				detach_dev(t36);
    				detach_dev(p15);
    				detach_dev(t39);
    				detach_dev(p16);
    				detach_dev(t42);
    				detach_dev(p17);
    				detach_dev(t45);
    				detach_dev(p18);
    				detach_dev(t48);
    				detach_dev(p19);
    				detach_dev(t51);
    				detach_dev(p20);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$t.name, type: "component", source: "", ctx });
    	return block;
    }

    class HungarianPea extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$t, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "HungarianPea", options, id: create_fragment$t.name });
    	}
    }

    /* src/pages/other/Rye.svelte generated by Svelte v3.12.1 */

    const file$u = "src/pages/other/Rye.svelte";

    function create_fragment$u(ctx) {
    	var h1, t1, p0, t3, p1, t5, h20, t7, p2, t9, p3, t11, p4, t13, p5, t15, p6, t17, p7, t19, h21, t21, p8, strong0, t23, t24, p9, strong1, t26, t27, p10, strong2, t29;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Hot Spring Bread";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "I remember watching a guide take us to the muddy shore of Lake Laugarvatn and\n  dig out a enamel pot. He told us that it had been baking there for the past 24\n  hours. You see, the Lake Laugarvatn rests on natural geothermal springs. And\n  if you find a spot of bubbling soil, that means the spring are hot enough to\n  bake bread.";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "We had our rye bread with smoked salmon. The guide gave us this recipe and\n  told us that if we didn't have a geothermal spring nearby we could use the\n  oven at 350 degrees for 1 hour.";
    			t5 = space();
    			h20 = element("h2");
    			h20.textContent = "Ingredients";
    			t7 = space();
    			p2 = element("p");
    			p2.textContent = "4 cups of rye flour";
    			t9 = space();
    			p3 = element("p");
    			p3.textContent = "2 cups of regular flour";
    			t11 = space();
    			p4 = element("p");
    			p4.textContent = "2 cups of sugar";
    			t13 = space();
    			p5 = element("p");
    			p5.textContent = "4 teaspoons baking powder";
    			t15 = space();
    			p6 = element("p");
    			p6.textContent = "1 teaspoon salt";
    			t17 = space();
    			p7 = element("p");
    			p7.textContent = "4.25 cups of milk";
    			t19 = space();
    			h21 = element("h2");
    			h21.textContent = "Instructions";
    			t21 = space();
    			p8 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Step 1:";
    			t23 = text(" Mix all the dry ingredients together and then add the\n  milk. Mix all the ingredients until a dough forms and then lightly knead.");
    			t24 = space();
    			p9 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Step 2:";
    			t26 = text(" Grease a deep dish and add the dough");
    			t27 = space();
    			p10 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Step 3:";
    			t29 = text(" Cook in a 375 degree oven for 1 hour");
    			add_location(h1, file$u, 0, 0, 0);
    			add_location(p0, file$u, 1, 0, 26);
    			add_location(p1, file$u, 8, 0, 368);
    			add_location(h20, file$u, 13, 0, 569);
    			add_location(p2, file$u, 14, 0, 590);
    			add_location(p3, file$u, 15, 0, 617);
    			add_location(p4, file$u, 16, 0, 648);
    			add_location(p5, file$u, 17, 0, 671);
    			add_location(p6, file$u, 18, 0, 704);
    			add_location(p7, file$u, 19, 0, 727);
    			add_location(h21, file$u, 20, 0, 752);
    			add_location(strong0, file$u, 22, 2, 780);
    			add_location(p8, file$u, 21, 0, 774);
    			add_location(strong1, file$u, 25, 3, 943);
    			add_location(p9, file$u, 25, 0, 940);
    			add_location(strong2, file$u, 26, 3, 1012);
    			add_location(p10, file$u, 26, 0, 1009);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, p2, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p3, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p5, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, p6, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, p7, anchor);
    			insert_dev(target, t19, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t21, anchor);
    			insert_dev(target, p8, anchor);
    			append_dev(p8, strong0);
    			append_dev(p8, t23);
    			insert_dev(target, t24, anchor);
    			insert_dev(target, p9, anchor);
    			append_dev(p9, strong1);
    			append_dev(p9, t26);
    			insert_dev(target, t27, anchor);
    			insert_dev(target, p10, anchor);
    			append_dev(p10, strong2);
    			append_dev(p10, t29);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(h1);
    				detach_dev(t1);
    				detach_dev(p0);
    				detach_dev(t3);
    				detach_dev(p1);
    				detach_dev(t5);
    				detach_dev(h20);
    				detach_dev(t7);
    				detach_dev(p2);
    				detach_dev(t9);
    				detach_dev(p3);
    				detach_dev(t11);
    				detach_dev(p4);
    				detach_dev(t13);
    				detach_dev(p5);
    				detach_dev(t15);
    				detach_dev(p6);
    				detach_dev(t17);
    				detach_dev(p7);
    				detach_dev(t19);
    				detach_dev(h21);
    				detach_dev(t21);
    				detach_dev(p8);
    				detach_dev(t24);
    				detach_dev(p9);
    				detach_dev(t27);
    				detach_dev(p10);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$u.name, type: "component", source: "", ctx });
    	return block;
    }

    class Rye extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$u, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Rye", options, id: create_fragment$u.name });
    	}
    }

    /* src/App.svelte generated by Svelte v3.12.1 */

    const file$v = "src/App.svelte";

    function create_fragment$v(ctx) {
    	var main, t, current_1;

    	var navbar = new Navbar({ $$inline: true });

    	var switch_value = ctx.current;

    	function switch_props(ctx) {
    		return { $$inline: true };
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			navbar.$$.fragment.c();
    			t = space();
    			if (switch_instance) switch_instance.$$.fragment.c();
    			attr_dev(main, "class", "svelte-4kvi3v");
    			add_location(main, file$v, 100, 0, 3909);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(navbar, main, null);
    			append_dev(main, t);

    			if (switch_instance) {
    				mount_component(switch_instance, main, null);
    			}

    			current_1 = true;
    		},

    		p: function update(changed, ctx) {
    			if (switch_value !== (switch_value = ctx.current)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;
    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});
    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());

    					switch_instance.$$.fragment.c();
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, main, null);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},

    		i: function intro(local) {
    			if (current_1) return;
    			transition_in(navbar.$$.fragment, local);

    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);

    			current_1 = true;
    		},

    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current_1 = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(main);
    			}

    			destroy_component(navbar);

    			if (switch_instance) destroy_component(switch_instance);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$v.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	// this function ensures that when some navigates to a new page,
      // the new page loads at the top -- otherwise the y position,
      // will be wherever the last y position was
      history.pushState = new Proxy(history.pushState, {
        apply(target, thisArg, argumentsList) {
          // scrollTo(0,0) <-- order of operation can mather (ty, @t-lock)
          Reflect.apply(target, thisArg, argumentsList);
          scrollTo(0, 0);
        },
      });

      // set default component
      let current = Home;

      // Map routes to page. If a route is hit the current
      // reference is set to the route's component
      page("/", () => ($$invalidate('current', current = Home)));
      page("/seasons", () => ($$invalidate('current', current = Seasons)));

      // family routes
      page("/braised_beef", () => ($$invalidate('current', current = BraisedBeef)));
      page("/chicken_pan", () => ($$invalidate('current', current = ChickenPan)));
      page("/sausage_balls", () => ($$invalidate('current', current = SausageBalls)));
      page("/sweet_rolls", () => ($$invalidate('current', current = SweetRolls)));
      page("/biscuits", () => ($$invalidate('current', current = Biscuits)));
      page("/grits", () => ($$invalidate('current', current = Grits)));
      page("/sweet_potato_soup", () => ($$invalidate('current', current = SweetPotatoSoup)));

      // french routes
      page("/roasted_carrots", () => ($$invalidate('current', current = RoastedCarrots)));
      page("/coq_au_vin", () => ($$invalidate('current', current = CoqAuVin)));
      page("/roasted_eggplant", () => ($$invalidate('current', current = Eggplant)));
      page("/beef_bourguignon", () => ($$invalidate('current', current = BeefBourguignon)));
      page("/baguette", () => ($$invalidate('current', current = Baguette)));
      page("/french_onion_soup", () => ($$invalidate('current', current = FrenchOnion)));
      page("/poulet_chasseur", () => ($$invalidate('current', current = PouletChasseur)));
      page("/cotelette_de_porc", () => ($$invalidate('current', current = CotelettedePorc)));

      // italian routes
      page("/homemade_pasta", () => ($$invalidate('current', current = HomemadePasta)));
      page("/cacio_pepe", () => ($$invalidate('current', current = CacioPepe)));
      page("/pesto", () => ($$invalidate('current', current = Pesto)));

      // central routes
      page("/chicken_paprika", () => ($$invalidate('current', current = Paprika)));
      page("/korozott", () => ($$invalidate('current', current = Korozott)));
      page("/makosguba", () => ($$invalidate('current', current = Makosguba)));
      page("/hungarian_pea", () => ($$invalidate('current', current = HungarianPea)));

      // other routes
      page("/rye_bread", () => ($$invalidate('current', current = Rye)));

      // activate router
      page.start();

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('current' in $$props) $$invalidate('current', current = $$props.current);
    	};

    	return { current };
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$v, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$v.name });
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
