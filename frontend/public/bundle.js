
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
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

    /* src/pages/Home.svelte generated by Svelte v3.12.1 */

    const file = "src/pages/Home.svelte";

    function create_fragment(ctx) {
    	var p0, t1, div, p1, t3, ul, li0, a0, t5, li1, a1, t7, li2, a2, t9, li3, a3;

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			p0.textContent = "Welcome to the cleanest recipe website on the web. No life story, just what\n  you need and how to prepare it.";
    			t1 = space();
    			div = element("div");
    			p1 = element("p");
    			p1.textContent = "Mains";
    			t3 = space();
    			ul = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "Braised Beef with Sunday Gravy";
    			t5 = space();
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "Seared Chicken with White Wine Pan Sauce";
    			t7 = space();
    			li2 = element("li");
    			a2 = element("a");
    			a2.textContent = "Beef Tagine with Moroccan Spices";
    			t9 = space();
    			li3 = element("li");
    			a3 = element("a");
    			a3.textContent = "Homemade Pasta with Pesto and Walnuts";
    			add_location(p0, file, 3, 0, 20);
    			add_location(p1, file, 8, 2, 163);
    			attr_dev(a0, "href", "/braised_beef");
    			add_location(a0, file, 10, 8, 191);
    			add_location(li0, file, 10, 4, 187);
    			attr_dev(a1, "href", "/chicken_pan");
    			add_location(a1, file, 11, 8, 263);
    			add_location(li1, file, 11, 4, 259);
    			attr_dev(a2, "href", "/beef_tagine");
    			add_location(a2, file, 12, 8, 344);
    			add_location(li2, file, 12, 4, 340);
    			attr_dev(a3, "href", "/homemade_pasta");
    			add_location(a3, file, 13, 8, 417);
    			add_location(li3, file, 13, 4, 413);
    			add_location(ul, file, 9, 2, 178);
    			attr_dev(div, "class", "mains");
    			add_location(div, file, 7, 0, 141);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, p1);
    			append_dev(div, t3);
    			append_dev(div, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a0);
    			append_dev(ul, t5);
    			append_dev(ul, li1);
    			append_dev(li1, a1);
    			append_dev(ul, t7);
    			append_dev(ul, li2);
    			append_dev(li2, a2);
    			append_dev(ul, t9);
    			append_dev(ul, li3);
    			append_dev(li3, a3);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p0);
    				detach_dev(t1);
    				detach_dev(div);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Home", options, id: create_fragment.name });
    	}
    }

    /* src/pages/mains/BraisedBeef.svelte generated by Svelte v3.12.1 */

    const file$1 = "src/pages/mains/BraisedBeef.svelte";

    function create_fragment$1(ctx) {
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
    			add_location(h1, file$1, 0, 0, 0);
    			add_location(p0, file$1, 1, 0, 40);
    			add_location(h20, file$1, 8, 0, 385);
    			add_location(p1, file$1, 9, 0, 406);
    			add_location(p2, file$1, 10, 0, 441);
    			add_location(p3, file$1, 11, 0, 470);
    			add_location(p4, file$1, 12, 0, 502);
    			add_location(p5, file$1, 13, 0, 533);
    			add_location(p6, file$1, 14, 0, 564);
    			add_location(p7, file$1, 15, 0, 578);
    			add_location(p8, file$1, 16, 0, 596);
    			add_location(p9, file$1, 17, 0, 614);
    			add_location(h21, file$1, 18, 0, 632);
    			add_location(strong0, file$1, 20, 2, 660);
    			add_location(p10, file$1, 19, 0, 654);
    			add_location(strong1, file$1, 24, 2, 788);
    			add_location(p11, file$1, 23, 0, 782);
    			add_location(strong2, file$1, 27, 3, 887);
    			add_location(p12, file$1, 27, 0, 884);
    			add_location(strong3, file$1, 28, 3, 936);
    			add_location(p13, file$1, 28, 0, 933);
    			add_location(strong4, file$1, 30, 2, 1008);
    			add_location(p14, file$1, 29, 0, 1002);
    			add_location(strong5, file$1, 35, 2, 1250);
    			add_location(p15, file$1, 34, 0, 1244);
    			add_location(strong6, file$1, 41, 2, 1557);
    			add_location(p16, file$1, 40, 0, 1551);
    			add_location(strong7, file$1, 45, 2, 1714);
    			add_location(p17, file$1, 44, 0, 1708);
    			add_location(strong8, file$1, 49, 2, 1851);
    			add_location(p18, file$1, 48, 0, 1845);
    			add_location(strong9, file$1, 54, 2, 2041);
    			add_location(p19, file$1, 53, 0, 2035);
    			add_location(strong10, file$1, 59, 2, 2291);
    			add_location(p20, file$1, 58, 0, 2285);
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    class BraisedBeef extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$1, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "BraisedBeef", options, id: create_fragment$1.name });
    	}
    }

    /* src/pages/mains/ChickenPan.svelte generated by Svelte v3.12.1 */

    const file$2 = "src/pages/mains/ChickenPan.svelte";

    function create_fragment$2(ctx) {
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
    			add_location(h1, file$2, 0, 0, 0);
    			add_location(p0, file$2, 1, 0, 32);
    			add_location(p1, file$2, 8, 0, 409);
    			add_location(h20, file$2, 12, 0, 556);
    			add_location(p2, file$2, 13, 0, 577);
    			add_location(p3, file$2, 16, 0, 664);
    			add_location(p4, file$2, 17, 0, 681);
    			add_location(p5, file$2, 18, 0, 706);
    			add_location(p6, file$2, 19, 0, 727);
    			add_location(p7, file$2, 20, 0, 741);
    			add_location(p8, file$2, 21, 0, 766);
    			add_location(h21, file$2, 22, 0, 794);
    			add_location(strong0, file$2, 24, 2, 822);
    			add_location(p9, file$2, 23, 0, 816);
    			add_location(strong1, file$2, 30, 2, 1127);
    			add_location(p10, file$2, 29, 0, 1121);
    			add_location(strong2, file$2, 34, 2, 1251);
    			add_location(p11, file$2, 33, 0, 1245);
    			add_location(strong3, file$2, 39, 2, 1431);
    			add_location(p12, file$2, 38, 0, 1425);
    			add_location(strong4, file$2, 43, 2, 1607);
    			add_location(p13, file$2, 42, 0, 1601);
    			add_location(strong5, file$2, 47, 2, 1769);
    			add_location(p14, file$2, 46, 0, 1763);
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$2.name, type: "component", source: "", ctx });
    	return block;
    }

    class ChickenPan extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$2, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "ChickenPan", options, id: create_fragment$2.name });
    	}
    }

    /* src/pages/mains/BeefTagine.svelte generated by Svelte v3.12.1 */

    const file$3 = "src/pages/mains/BeefTagine.svelte";

    function create_fragment$3(ctx) {
    	var h1, t1, p0, t3, p1, t5, blockquote, p2, t7, p3, t9, p4, t11, h20, t13, p5, strong0, t15, p6, t17, p7, t19, p8, t21, p9, t23, p10, t25, p11, t27, p12, t29, p13, strong1, t31, p14, t33, p15, strong2, t35, p16, t37, p17, t39, p18, t41, p19, t43, p20, strong3, t45, p21, t47, p22, t49, p23, t51, p24, t53, h21, t55, p25, strong4, t57, t58, p26, strong5, t60, t61, p27, strong6, t63, t64, p28, strong7, t66, t67, p29, strong8, t69, em, t71, t72, p30, strong9, t74, t75, p31, strong10, t77, t78, p32, strong11, t80, t81, p33, strong12, t83, t84, p34;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Beef Tajine";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Tajine is a traditional Moroccan dish named after the earthenware pot in which\n  its cooked. The pot itself is distinctive for its conical lid, which traps the\n  moisture in the dish. However, for our meal, any old pot and lid will work.";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "Our Tajine will be comprised of beef, potatoes, peas, and carrots. It is\n  wonderful on a cold day or a day when you just need some comfort food. For\n  desert, I would recommend greek yogurt with honey. If you are wondering what a\n  Tajine is:";
    			t5 = space();
    			blockquote = element("blockquote");
    			p2 = element("p");
    			p2.textContent = "The distinctive shape of the tagine is not only decorative but has an\n    important function. Indeed, in an arid region like the Maghreb, it meets a\n    local need to cook food without a lot of water. It also allows to cook\n    without much fat, which keeps most of the natural flavor of food.";
    			t7 = space();
    			p3 = element("p");
    			p3.textContent = "-- 196flavors.com";
    			t9 = space();
    			p4 = element("p");
    			p4.textContent = "This is very easy to cook and comes together in under 45 minutes. Creates\n  around 4 meals.";
    			t11 = space();
    			h20 = element("h2");
    			h20.textContent = "Ingredients";
    			t13 = space();
    			p5 = element("p");
    			strong0 = element("strong");
    			strong0.textContent = "Spices";
    			t15 = space();
    			p6 = element("p");
    			p6.textContent = "2 teaspoons paprika";
    			t17 = space();
    			p7 = element("p");
    			p7.textContent = "2 teaspoons cumin";
    			t19 = space();
    			p8 = element("p");
    			p8.textContent = "1/4 teaspoon cayenne pepper";
    			t21 = space();
    			p9 = element("p");
    			p9.textContent = "1 teaspoon ground ginger";
    			t23 = space();
    			p10 = element("p");
    			p10.textContent = "1 teaspoon ground coriander";
    			t25 = space();
    			p11 = element("p");
    			p11.textContent = "1 teaspoon cinnamon";
    			t27 = space();
    			p12 = element("p");
    			p12.textContent = "1/2 teaspoon nutmeg";
    			t29 = space();
    			p13 = element("p");
    			strong1 = element("strong");
    			strong1.textContent = "Meat";
    			t31 = space();
    			p14 = element("p");
    			p14.textContent = "Beef cut into chunks";
    			t33 = space();
    			p15 = element("p");
    			strong2 = element("strong");
    			strong2.textContent = "Veggies";
    			t35 = space();
    			p16 = element("p");
    			p16.textContent = "1 yellow onion cut into slices";
    			t37 = space();
    			p17 = element("p");
    			p17.textContent = "2 potatoes cut into cubes";
    			t39 = space();
    			p18 = element("p");
    			p18.textContent = "2 large carrots cut into circles";
    			t41 = space();
    			p19 = element("p");
    			p19.textContent = "1 can of peas";
    			t43 = space();
    			p20 = element("p");
    			strong3 = element("strong");
    			strong3.textContent = "Other";
    			t45 = space();
    			p21 = element("p");
    			p21.textContent = "Cilantro";
    			t47 = space();
    			p22 = element("p");
    			p22.textContent = "Honey";
    			t49 = space();
    			p23 = element("p");
    			p23.textContent = "1 3/4 Cups of Beef Stock";
    			t51 = space();
    			p24 = element("p");
    			p24.textContent = "Minced Garlic";
    			t53 = space();
    			h21 = element("h2");
    			h21.textContent = "Instructions";
    			t55 = space();
    			p25 = element("p");
    			strong4 = element("strong");
    			strong4.textContent = "Step 1:";
    			t57 = text(" Combine all the spices into a mix in a little mixing bowl");
    			t58 = space();
    			p26 = element("p");
    			strong5 = element("strong");
    			strong5.textContent = "Step 2:";
    			t60 = text(" Cut the vegetables. Cubes for the potatoes and circles\n  for the carrots.");
    			t61 = space();
    			p27 = element("p");
    			strong6 = element("strong");
    			strong6.textContent = "Step 3:";
    			t63 = text(" Cook beef in large pan. You are just going to brown the\n  beef rather than cook into completely through. Just sear it. It will spend around\n  20 mins in the stew.");
    			t64 = space();
    			p28 = element("p");
    			strong7 = element("strong");
    			strong7.textContent = "Step 4:";
    			t66 = text(" Cook onions in the same pan. Take out the beef and cook\n  onions in the fat left from the beef.");
    			t67 = space();
    			p29 = element("p");
    			strong8 = element("strong");
    			strong8.textContent = "Step 5:";
    			t69 = text(" Add ");
    			em = element("em");
    			em.textContent = "half";
    			t71 = text(" the spices in with the onion. It should\n  form a bit of a sludge with the onions. Add in the garlic as well.");
    			t72 = space();
    			p30 = element("p");
    			strong9 = element("strong");
    			strong9.textContent = "Step 6:";
    			t74 = text(" Add beef stock, beef, and cut vegetables");
    			t75 = space();
    			p31 = element("p");
    			strong10 = element("strong");
    			strong10.textContent = "Step 7:";
    			t77 = text(" Add the other half of the spices and pour in about 2 teaspoons\n  of honey");
    			t78 = space();
    			p32 = element("p");
    			strong11 = element("strong");
    			strong11.textContent = "Step 8:";
    			t80 = text(" On medium/high heat, cover the pan, and let the vegetables\n  steam and become soft. This will take around 20 mins");
    			t81 = space();
    			p33 = element("p");
    			strong12 = element("strong");
    			strong12.textContent = "Step 9:";
    			t83 = text(" Garnish with cut cilantro");
    			t84 = space();
    			p34 = element("p");
    			p34.textContent = " ";
    			add_location(h1, file$3, 0, 0, 0);
    			add_location(p0, file$3, 1, 0, 21);
    			add_location(p1, file$3, 6, 0, 270);
    			add_location(p2, file$3, 13, 2, 540);
    			add_location(p3, file$3, 19, 2, 851);
    			add_location(blockquote, file$3, 12, 0, 525);
    			add_location(p4, file$3, 21, 0, 890);
    			add_location(h20, file$3, 25, 0, 993);
    			add_location(strong0, file$3, 26, 3, 1017);
    			add_location(p5, file$3, 26, 0, 1014);
    			add_location(p6, file$3, 27, 0, 1045);
    			add_location(p7, file$3, 28, 0, 1072);
    			add_location(p8, file$3, 29, 0, 1097);
    			add_location(p9, file$3, 30, 0, 1132);
    			add_location(p10, file$3, 31, 0, 1164);
    			add_location(p11, file$3, 32, 0, 1199);
    			add_location(p12, file$3, 33, 0, 1226);
    			add_location(strong1, file$3, 34, 3, 1256);
    			add_location(p13, file$3, 34, 0, 1253);
    			add_location(p14, file$3, 35, 0, 1282);
    			add_location(strong2, file$3, 36, 3, 1313);
    			add_location(p15, file$3, 36, 0, 1310);
    			add_location(p16, file$3, 37, 0, 1342);
    			add_location(p17, file$3, 38, 0, 1380);
    			add_location(p18, file$3, 39, 0, 1413);
    			add_location(p19, file$3, 40, 0, 1453);
    			add_location(strong3, file$3, 41, 3, 1477);
    			add_location(p20, file$3, 41, 0, 1474);
    			add_location(p21, file$3, 42, 0, 1504);
    			add_location(p22, file$3, 43, 0, 1520);
    			add_location(p23, file$3, 44, 0, 1533);
    			add_location(p24, file$3, 45, 0, 1565);
    			add_location(h21, file$3, 46, 0, 1586);
    			add_location(strong4, file$3, 48, 2, 1614);
    			add_location(p25, file$3, 47, 0, 1608);
    			add_location(strong5, file$3, 51, 2, 1708);
    			add_location(p26, file$3, 50, 0, 1702);
    			add_location(strong6, file$3, 55, 2, 1818);
    			add_location(p27, file$3, 54, 0, 1812);
    			add_location(strong7, file$3, 60, 2, 2018);
    			add_location(p28, file$3, 59, 0, 2012);
    			add_location(strong8, file$3, 64, 2, 2150);
    			add_location(em, file$3, 64, 31, 2179);
    			add_location(p29, file$3, 63, 0, 2144);
    			add_location(strong9, file$3, 67, 3, 2310);
    			add_location(p30, file$3, 67, 0, 2307);
    			add_location(strong10, file$3, 69, 2, 2386);
    			add_location(p31, file$3, 68, 0, 2380);
    			add_location(strong11, file$3, 73, 2, 2496);
    			add_location(p32, file$3, 72, 0, 2490);
    			add_location(strong12, file$3, 76, 3, 2643);
    			add_location(p33, file$3, 76, 0, 2640);
    			add_location(p34, file$3, 77, 0, 2698);
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
    			insert_dev(target, blockquote, anchor);
    			append_dev(blockquote, p2);
    			append_dev(blockquote, t7);
    			append_dev(blockquote, p3);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p4, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, p5, anchor);
    			append_dev(p5, strong0);
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
    			append_dev(p13, strong1);
    			insert_dev(target, t31, anchor);
    			insert_dev(target, p14, anchor);
    			insert_dev(target, t33, anchor);
    			insert_dev(target, p15, anchor);
    			append_dev(p15, strong2);
    			insert_dev(target, t35, anchor);
    			insert_dev(target, p16, anchor);
    			insert_dev(target, t37, anchor);
    			insert_dev(target, p17, anchor);
    			insert_dev(target, t39, anchor);
    			insert_dev(target, p18, anchor);
    			insert_dev(target, t41, anchor);
    			insert_dev(target, p19, anchor);
    			insert_dev(target, t43, anchor);
    			insert_dev(target, p20, anchor);
    			append_dev(p20, strong3);
    			insert_dev(target, t45, anchor);
    			insert_dev(target, p21, anchor);
    			insert_dev(target, t47, anchor);
    			insert_dev(target, p22, anchor);
    			insert_dev(target, t49, anchor);
    			insert_dev(target, p23, anchor);
    			insert_dev(target, t51, anchor);
    			insert_dev(target, p24, anchor);
    			insert_dev(target, t53, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t55, anchor);
    			insert_dev(target, p25, anchor);
    			append_dev(p25, strong4);
    			append_dev(p25, t57);
    			insert_dev(target, t58, anchor);
    			insert_dev(target, p26, anchor);
    			append_dev(p26, strong5);
    			append_dev(p26, t60);
    			insert_dev(target, t61, anchor);
    			insert_dev(target, p27, anchor);
    			append_dev(p27, strong6);
    			append_dev(p27, t63);
    			insert_dev(target, t64, anchor);
    			insert_dev(target, p28, anchor);
    			append_dev(p28, strong7);
    			append_dev(p28, t66);
    			insert_dev(target, t67, anchor);
    			insert_dev(target, p29, anchor);
    			append_dev(p29, strong8);
    			append_dev(p29, t69);
    			append_dev(p29, em);
    			append_dev(p29, t71);
    			insert_dev(target, t72, anchor);
    			insert_dev(target, p30, anchor);
    			append_dev(p30, strong9);
    			append_dev(p30, t74);
    			insert_dev(target, t75, anchor);
    			insert_dev(target, p31, anchor);
    			append_dev(p31, strong10);
    			append_dev(p31, t77);
    			insert_dev(target, t78, anchor);
    			insert_dev(target, p32, anchor);
    			append_dev(p32, strong11);
    			append_dev(p32, t80);
    			insert_dev(target, t81, anchor);
    			insert_dev(target, p33, anchor);
    			append_dev(p33, strong12);
    			append_dev(p33, t83);
    			insert_dev(target, t84, anchor);
    			insert_dev(target, p34, anchor);
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
    				detach_dev(blockquote);
    				detach_dev(t9);
    				detach_dev(p4);
    				detach_dev(t11);
    				detach_dev(h20);
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
    				detach_dev(t37);
    				detach_dev(p17);
    				detach_dev(t39);
    				detach_dev(p18);
    				detach_dev(t41);
    				detach_dev(p19);
    				detach_dev(t43);
    				detach_dev(p20);
    				detach_dev(t45);
    				detach_dev(p21);
    				detach_dev(t47);
    				detach_dev(p22);
    				detach_dev(t49);
    				detach_dev(p23);
    				detach_dev(t51);
    				detach_dev(p24);
    				detach_dev(t53);
    				detach_dev(h21);
    				detach_dev(t55);
    				detach_dev(p25);
    				detach_dev(t58);
    				detach_dev(p26);
    				detach_dev(t61);
    				detach_dev(p27);
    				detach_dev(t64);
    				detach_dev(p28);
    				detach_dev(t67);
    				detach_dev(p29);
    				detach_dev(t72);
    				detach_dev(p30);
    				detach_dev(t75);
    				detach_dev(p31);
    				detach_dev(t78);
    				detach_dev(p32);
    				detach_dev(t81);
    				detach_dev(p33);
    				detach_dev(t84);
    				detach_dev(p34);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$3.name, type: "component", source: "", ctx });
    	return block;
    }

    class BeefTagine extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$3, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "BeefTagine", options, id: create_fragment$3.name });
    	}
    }

    /* src/pages/mains/HomemadePasta.svelte generated by Svelte v3.12.1 */

    const file$4 = "src/pages/mains/HomemadePasta.svelte";

    function create_fragment$4(ctx) {
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
    			add_location(h1, file$4, 0, 0, 0);
    			add_location(p0, file$4, 1, 0, 24);
    			add_location(p1, file$4, 8, 0, 380);
    			add_location(p2, file$4, 13, 0, 609);
    			add_location(h20, file$4, 14, 0, 678);
    			add_location(strong0, file$4, 15, 3, 702);
    			add_location(p3, file$4, 15, 0, 699);
    			add_location(p4, file$4, 16, 0, 729);
    			add_location(p5, file$4, 17, 0, 752);
    			add_location(strong1, file$4, 18, 3, 769);
    			add_location(p6, file$4, 18, 0, 766);
    			add_location(p7, file$4, 19, 0, 796);
    			add_location(p8, file$4, 20, 0, 822);
    			add_location(p9, file$4, 21, 0, 845);
    			add_location(p10, file$4, 22, 0, 860);
    			add_location(strong2, file$4, 23, 3, 879);
    			add_location(p11, file$4, 23, 0, 876);
    			add_location(p12, file$4, 24, 0, 918);
    			add_location(p13, file$4, 25, 0, 937);
    			add_location(h21, file$4, 26, 0, 957);
    			add_location(strong3, file$4, 28, 2, 985);
    			add_location(p14, file$4, 27, 0, 979);
    			add_location(strong4, file$4, 32, 2, 1144);
    			add_location(p15, file$4, 31, 0, 1138);
    			add_location(strong5, file$4, 37, 2, 1384);
    			add_location(p16, file$4, 36, 0, 1378);
    			add_location(strong6, file$4, 43, 2, 1689);
    			add_location(p17, file$4, 42, 0, 1683);
    			add_location(strong7, file$4, 48, 2, 1878);
    			add_location(p18, file$4, 47, 0, 1872);
    			add_location(strong8, file$4, 53, 2, 2065);
    			add_location(p19, file$4, 52, 0, 2059);
    			add_location(strong9, file$4, 58, 2, 2287);
    			add_location(p20, file$4, 57, 0, 2281);
    			add_location(strong10, file$4, 63, 2, 2530);
    			add_location(p21, file$4, 62, 0, 2524);
    			add_location(strong11, file$4, 68, 2, 2773);
    			add_location(p22, file$4, 67, 0, 2767);
    			add_location(strong12, file$4, 72, 2, 2939);
    			add_location(p23, file$4, 71, 0, 2933);
    			add_location(p24, file$4, 75, 0, 3058);
    			add_location(p25, file$4, 76, 0, 3072);
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
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$4.name, type: "component", source: "", ctx });
    	return block;
    }

    class HomemadePasta extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$4, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "HomemadePasta", options, id: create_fragment$4.name });
    	}
    }

    /* src/App.svelte generated by Svelte v3.12.1 */

    const file$5 = "src/App.svelte";

    function create_fragment$5(ctx) {
    	var main, nav, a, t_1, current_1;

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
    			nav = element("nav");
    			a = element("a");
    			a.textContent = "Home";
    			t_1 = space();
    			if (switch_instance) switch_instance.$$.fragment.c();
    			attr_dev(a, "href", "/");
    			add_location(a, file$5, 26, 4, 809);
    			add_location(nav, file$5, 25, 2, 799);
    			add_location(main, file$5, 24, 0, 790);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, nav);
    			append_dev(nav, a);
    			append_dev(main, t_1);

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
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);

    			current_1 = true;
    		},

    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current_1 = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(main);
    			}

    			if (switch_instance) destroy_component(switch_instance);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$5.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	

      // set default component
      let current = Home;

      // Map routes to page. If a route is hit the current
      // reference is set to the route's component
      page("/", () => ($$invalidate('current', current = Home)));
      page("/braised_beef", () => ($$invalidate('current', current = BraisedBeef)));
      page("/chicken_pan", () => ($$invalidate('current', current = ChickenPan)));
      page("/beef_tagine", () => ($$invalidate('current', current = BeefTagine)));
      page("/homemade_pasta", () => ($$invalidate('current', current = HomemadePasta)));

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
    		init(this, options, instance, create_fragment$5, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$5.name });
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
