var app=function(){"use strict";function t(){}function e(t){return t()}function n(){return Object.create(null)}function r(t){t.forEach(e)}function i(t){return"function"==typeof t}function o(t,e){return t!=t?e==e:t!==e||t&&"object"==typeof t||"function"==typeof t}function a(t,e){t.appendChild(e)}function s(t,e,n){t.insertBefore(e,n||null)}function c(t){t.parentNode.removeChild(t)}function h(t){return document.createElement(t)}function p(t){return document.createTextNode(t)}function u(){return p(" ")}let f;function d(t){f=t}const l=[],g=[],m=[],v=[],w=Promise.resolve();let y=!1;function _(t){m.push(t)}function b(){const t=new Set;do{for(;l.length;){const t=l.shift();d(t),x(t.$$)}for(;g.length;)g.pop()();for(let e=0;e<m.length;e+=1){const n=m[e];t.has(n)||(n(),t.add(n))}m.length=0}while(l.length);for(;v.length;)v.pop()();y=!1}function x(t){t.fragment&&(t.update(t.dirty),r(t.before_update),t.fragment.p(t.dirty,t.ctx),t.dirty=null,t.after_update.forEach(_))}const $=new Set;let E;function k(t,e){t&&t.i&&($.delete(t),t.i(e))}function R(t,e,n,r){if(t&&t.o){if($.has(t))return;$.add(t),E.c.push((()=>{$.delete(t),r&&(n&&t.d(1),r())})),t.o(e)}}function L(t,n,o){const{fragment:a,on_mount:s,on_destroy:c,after_update:h}=t.$$;a.m(n,o),_((()=>{const n=s.map(e).filter(i);c?c.push(...n):r(n),t.$$.on_mount=[]})),h.forEach(_)}function C(t,e){t.$$.fragment&&(r(t.$$.on_destroy),t.$$.fragment.d(e),t.$$.on_destroy=t.$$.fragment=null,t.$$.ctx={})}function U(t,e){t.$$.dirty||(l.push(t),y||(y=!0,w.then(b)),t.$$.dirty=n()),t.$$.dirty[e]=!0}function O(e,i,o,a,s,c){const h=f;d(e);const p=i.props||{},u=e.$$={fragment:null,ctx:null,props:c,update:t,not_equal:s,bound:n(),on_mount:[],on_destroy:[],before_update:[],after_update:[],context:new Map(h?h.$$.context:[]),callbacks:n(),dirty:null};let l=!1;u.ctx=o?o(e,p,((t,n,r=n)=>(u.ctx&&s(u.ctx[t],u.ctx[t]=r)&&(u.bound[t]&&u.bound[t](r),l&&U(e,t)),n))):p,u.update(),l=!0,r(u.before_update),u.fragment=a(u.ctx),i.target&&(i.hydrate?u.fragment.l(function(t){return Array.from(t.childNodes)}(i.target)):u.fragment.c(),i.intro&&k(e.$$.fragment),L(e,i.target,i.anchor),b()),d(h)}class T{$destroy(){C(this,1),this.$destroy=t}$on(t,e){const n=this.$$.callbacks[t]||(this.$$.callbacks[t]=[]);return n.push(e),()=>{const t=n.indexOf(e);-1!==t&&n.splice(t,1)}}$set(){}}"undefined"!=typeof globalThis?globalThis:"undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self&&self;var P,A=(function(t,e){t.exports=function(){var t=Array.isArray||function(t){return"[object Array]"==Object.prototype.toString.call(t)},e=w,n=s,r=c,i=h,o=v,a=new RegExp(["(\\\\.)","([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^()])+)\\))?|\\(((?:\\\\.|[^()])+)\\))([+*?])?|(\\*))"].join("|"),"g");function s(t){for(var e,n=[],r=0,i=0,o="";null!=(e=a.exec(t));){var s=e[0],c=e[1],h=e.index;if(o+=t.slice(i,h),i=h+s.length,c)o+=c[1];else{o&&(n.push(o),o="");var p=e[2],f=e[3],d=e[4],l=e[5],g=e[6],m=e[7],v="+"===g||"*"===g,w="?"===g||"*"===g,y=p||"/",_=d||l||(m?".*":"[^"+y+"]+?");n.push({name:f||r++,prefix:p||"",delimiter:y,optional:w,repeat:v,pattern:u(_)})}}return i<t.length&&(o+=t.substr(i)),o&&n.push(o),n}function c(t){return h(s(t))}function h(e){for(var n=new Array(e.length),r=0;r<e.length;r++)"object"==typeof e[r]&&(n[r]=new RegExp("^"+e[r].pattern+"$"));return function(r){for(var i="",o=r||{},a=0;a<e.length;a++){var s=e[a];if("string"!=typeof s){var c,h=o[s.name];if(null==h){if(s.optional)continue;throw new TypeError('Expected "'+s.name+'" to be defined')}if(t(h)){if(!s.repeat)throw new TypeError('Expected "'+s.name+'" to not repeat, but received "'+h+'"');if(0===h.length){if(s.optional)continue;throw new TypeError('Expected "'+s.name+'" to not be empty')}for(var p=0;p<h.length;p++){if(c=encodeURIComponent(h[p]),!n[a].test(c))throw new TypeError('Expected all "'+s.name+'" to match "'+s.pattern+'", but received "'+c+'"');i+=(0===p?s.prefix:s.delimiter)+c}}else{if(c=encodeURIComponent(h),!n[a].test(c))throw new TypeError('Expected "'+s.name+'" to match "'+s.pattern+'", but received "'+c+'"');i+=s.prefix+c}}else i+=s}return i}}function p(t){return t.replace(/([.+*?=^!:${}()[\]|\/])/g,"\\$1")}function u(t){return t.replace(/([=!:$\/()])/g,"\\$1")}function f(t,e){return t.keys=e,t}function d(t){return t.sensitive?"":"i"}function l(t,e){var n=t.source.match(/\((?!\?)/g);if(n)for(var r=0;r<n.length;r++)e.push({name:r,prefix:null,delimiter:null,optional:!1,repeat:!1,pattern:null});return f(t,e)}function g(t,e,n){for(var r=[],i=0;i<t.length;i++)r.push(w(t[i],e,n).source);return f(new RegExp("(?:"+r.join("|")+")",d(n)),e)}function m(t,e,n){for(var r=s(t),i=v(r,n),o=0;o<r.length;o++)"string"!=typeof r[o]&&e.push(r[o]);return f(i,e)}function v(t,e){for(var n=(e=e||{}).strict,r=!1!==e.end,i="",o=t[t.length-1],a="string"==typeof o&&/\/$/.test(o),s=0;s<t.length;s++){var c=t[s];if("string"==typeof c)i+=p(c);else{var h=p(c.prefix),u=c.pattern;c.repeat&&(u+="(?:"+h+u+")*"),i+=u=c.optional?h?"(?:"+h+"("+u+"))?":"("+u+")?":h+"("+u+")"}}return n||(i=(a?i.slice(0,-2):i)+"(?:\\/(?=$))?"),i+=r?"$":n&&a?"":"(?=\\/|$)",new RegExp("^"+i,d(e))}function w(e,n,r){return t(n=n||[])?r||(r={}):(r=n,n=[]),e instanceof RegExp?l(e,n):t(e)?g(e,n,r):m(e,n,r)}e.parse=n,e.compile=r,e.tokensToFunction=i,e.tokensToRegExp=o;var y,_="undefined"!=typeof document,b="undefined"!=typeof window,x="undefined"!=typeof history,$="undefined"!=typeof process,E=_&&document.ontouchstart?"touchstart":"click",k=b&&!(!window.history.location&&!window.location);function R(){this.callbacks=[],this.exits=[],this.current="",this.len=0,this._decodeURLComponents=!0,this._base="",this._strict=!1,this._running=!1,this._hashbang=!1,this.clickHandler=this.clickHandler.bind(this),this._onpopstate=this._onpopstate.bind(this)}function L(){var t=new R;function e(){return C.apply(t,arguments)}return e.callbacks=t.callbacks,e.exits=t.exits,e.base=t.base.bind(t),e.strict=t.strict.bind(t),e.start=t.start.bind(t),e.stop=t.stop.bind(t),e.show=t.show.bind(t),e.back=t.back.bind(t),e.redirect=t.redirect.bind(t),e.replace=t.replace.bind(t),e.dispatch=t.dispatch.bind(t),e.exit=t.exit.bind(t),e.configure=t.configure.bind(t),e.sameOrigin=t.sameOrigin.bind(t),e.clickHandler=t.clickHandler.bind(t),e.create=L,Object.defineProperty(e,"len",{get:function(){return t.len},set:function(e){t.len=e}}),Object.defineProperty(e,"current",{get:function(){return t.current},set:function(e){t.current=e}}),e.Context=T,e.Route=P,e}function C(t,e){if("function"==typeof t)return C.call(this,"*",t);if("function"==typeof e)for(var n=new P(t,null,this),r=1;r<arguments.length;++r)this.callbacks.push(n.middleware(arguments[r]));else"string"==typeof t?this["string"==typeof e?"redirect":"show"](t,e):this.start(t)}function U(t){if(!t.handled){var e=this,n=e._window;(e._hashbang?k&&this._getBase()+n.location.hash.replace("#!",""):k&&n.location.pathname+n.location.search)!==t.canonicalPath&&(e.stop(),t.handled=!1,k&&(n.location.href=t.canonicalPath))}}function O(t){return t.replace(/([.+*?=^!:${}()[\]|/\\])/g,"\\$1")}function T(t,e,n){var r=this.page=n||C,i=r._window,o=r._hashbang,a=r._getBase();"/"===t[0]&&0!==t.indexOf(a)&&(t=a+(o?"#!":"")+t);var s=t.indexOf("?");this.canonicalPath=t;var c=new RegExp("^"+O(a));if(this.path=t.replace(c,"")||"/",o&&(this.path=this.path.replace("#!","")||"/"),this.title=_&&i.document.title,this.state=e||{},this.state.path=t,this.querystring=~s?r._decodeURLEncodedURIComponent(t.slice(s+1)):"",this.pathname=r._decodeURLEncodedURIComponent(~s?t.slice(0,s):t),this.params={},this.hash="",!o){if(!~this.path.indexOf("#"))return;var h=this.path.split("#");this.path=this.pathname=h[0],this.hash=r._decodeURLEncodedURIComponent(h[1])||"",this.querystring=this.querystring.split("#")[0]}}function P(t,n,r){var i=this.page=r||A,o=n||{};o.strict=o.strict||i._strict,this.path="*"===t?"(.*)":t,this.method="GET",this.regexp=e(this.path,this.keys=[],o)}R.prototype.configure=function(t){var e=t||{};this._window=e.window||b&&window,this._decodeURLComponents=!1!==e.decodeURLComponents,this._popstate=!1!==e.popstate&&b,this._click=!1!==e.click&&_,this._hashbang=!!e.hashbang;var n=this._window;this._popstate?n.addEventListener("popstate",this._onpopstate,!1):b&&n.removeEventListener("popstate",this._onpopstate,!1),this._click?n.document.addEventListener(E,this.clickHandler,!1):_&&n.document.removeEventListener(E,this.clickHandler,!1),this._hashbang&&b&&!x?n.addEventListener("hashchange",this._onpopstate,!1):b&&n.removeEventListener("hashchange",this._onpopstate,!1)},R.prototype.base=function(t){if(0===arguments.length)return this._base;this._base=t},R.prototype._getBase=function(){var t=this._base;if(t)return t;var e=b&&this._window&&this._window.location;return b&&this._hashbang&&e&&"file:"===e.protocol&&(t=e.pathname),t},R.prototype.strict=function(t){if(0===arguments.length)return this._strict;this._strict=t},R.prototype.start=function(t){var e=t||{};if(this.configure(e),!1!==e.dispatch){var n;if(this._running=!0,k){var r=this._window.location;n=this._hashbang&&~r.hash.indexOf("#!")?r.hash.substr(2)+r.search:this._hashbang?r.search+r.hash:r.pathname+r.search+r.hash}this.replace(n,null,!0,e.dispatch)}},R.prototype.stop=function(){if(this._running){this.current="",this.len=0,this._running=!1;var t=this._window;this._click&&t.document.removeEventListener(E,this.clickHandler,!1),b&&t.removeEventListener("popstate",this._onpopstate,!1),b&&t.removeEventListener("hashchange",this._onpopstate,!1)}},R.prototype.show=function(t,e,n,r){var i=new T(t,e,this),o=this.prevContext;return this.prevContext=i,this.current=i.path,!1!==n&&this.dispatch(i,o),!1!==i.handled&&!1!==r&&i.pushState(),i},R.prototype.back=function(t,e){var n=this;if(this.len>0){var r=this._window;x&&r.history.back(),this.len--}else t?setTimeout((function(){n.show(t,e)})):setTimeout((function(){n.show(n._getBase(),e)}))},R.prototype.redirect=function(t,e){var n=this;"string"==typeof t&&"string"==typeof e&&C.call(this,t,(function(t){setTimeout((function(){n.replace(e)}),0)})),"string"==typeof t&&void 0===e&&setTimeout((function(){n.replace(t)}),0)},R.prototype.replace=function(t,e,n,r){var i=new T(t,e,this),o=this.prevContext;return this.prevContext=i,this.current=i.path,i.init=n,i.save(),!1!==r&&this.dispatch(i,o),i},R.prototype.dispatch=function(t,e){var n=0,r=0,i=this;function o(){var t=i.exits[r++];if(!t)return a();t(e,o)}function a(){var e=i.callbacks[n++];if(t.path===i.current)return e?void e(t,a):U.call(i,t);t.handled=!1}e?o():a()},R.prototype.exit=function(t,e){if("function"==typeof t)return this.exit("*",t);for(var n=new P(t,null,this),r=1;r<arguments.length;++r)this.exits.push(n.middleware(arguments[r]))},R.prototype.clickHandler=function(t){if(1===this._which(t)&&!(t.metaKey||t.ctrlKey||t.shiftKey||t.defaultPrevented)){var e=t.target,n=t.path||(t.composedPath?t.composedPath():null);if(n)for(var r=0;r<n.length;r++)if(n[r].nodeName&&"A"===n[r].nodeName.toUpperCase()&&n[r].href){e=n[r];break}for(;e&&"A"!==e.nodeName.toUpperCase();)e=e.parentNode;if(e&&"A"===e.nodeName.toUpperCase()){var i="object"==typeof e.href&&"SVGAnimatedString"===e.href.constructor.name;if(!e.hasAttribute("download")&&"external"!==e.getAttribute("rel")){var o=e.getAttribute("href");if((this._hashbang||!this._samePath(e)||!e.hash&&"#"!==o)&&!(o&&o.indexOf("mailto:")>-1)&&!(i?e.target.baseVal:e.target)&&(i||this.sameOrigin(e.href))){var a=i?e.href.baseVal:e.pathname+e.search+(e.hash||"");a="/"!==a[0]?"/"+a:a,$&&a.match(/^\/[a-zA-Z]:\//)&&(a=a.replace(/^\/[a-zA-Z]:\//,"/"));var s=a,c=this._getBase();0===a.indexOf(c)&&(a=a.substr(c.length)),this._hashbang&&(a=a.replace("#!","")),(!c||s!==a||k&&"file:"===this._window.location.protocol)&&(t.preventDefault(),this.show(s))}}}}},R.prototype._onpopstate=(y=!1,b?(_&&"complete"===document.readyState?y=!0:window.addEventListener("load",(function(){setTimeout((function(){y=!0}),0)})),function(t){if(y){var e=this;if(t.state){var n=t.state.path;e.replace(n,t.state)}else if(k){var r=e._window.location;e.show(r.pathname+r.search+r.hash,void 0,void 0,!1)}}}):function(){}),R.prototype._which=function(t){return null==(t=t||b&&this._window.event).which?t.button:t.which},R.prototype._toURL=function(t){var e=this._window;if("function"==typeof URL&&k)return new URL(t,e.location.toString());if(_){var n=e.document.createElement("a");return n.href=t,n}},R.prototype.sameOrigin=function(t){if(!t||!k)return!1;var e=this._toURL(t),n=this._window.location;return n.protocol===e.protocol&&n.hostname===e.hostname&&(n.port===e.port||""===n.port&&(80==e.port||443==e.port))},R.prototype._samePath=function(t){if(!k)return!1;var e=this._window.location;return t.pathname===e.pathname&&t.search===e.search},R.prototype._decodeURLEncodedURIComponent=function(t){return"string"!=typeof t?t:this._decodeURLComponents?decodeURIComponent(t.replace(/\+/g," ")):t},T.prototype.pushState=function(){var t=this.page,e=t._window,n=t._hashbang;t.len++,x&&e.history.pushState(this.state,this.title,n&&"/"!==this.path?"#!"+this.path:this.canonicalPath)},T.prototype.save=function(){var t=this.page;x&&t._window.history.replaceState(this.state,this.title,t._hashbang&&"/"!==this.path?"#!"+this.path:this.canonicalPath)},P.prototype.middleware=function(t){var e=this;return function(n,r){if(e.match(n.path,n.params))return n.routePath=e.path,t(n,r);r()}},P.prototype.match=function(t,e){var n=this.keys,r=t.indexOf("?"),i=~r?t.slice(0,r):t,o=this.regexp.exec(decodeURIComponent(i));if(!o)return!1;delete e[0];for(var a=1,s=o.length;a<s;++a){var c=n[a-1],h=this.page._decodeURLEncodedURIComponent(o[a]);void 0===h&&hasOwnProperty.call(e,c.name)||(e[c.name]=h)}return!0};var A=L(),S=A,j=A;return S.default=j,S}()}(P={exports:{}},P.exports),P.exports);function S(e){var n,r,i,o,f,d,l;return{c(){var t,a,s,c;n=h("h1"),r=p("Your number is "),i=p(e.rand),o=p("!"),f=u(),(d=h("button")).textContent="Get a random number",t=d,a="click",s=e.getRand,t.addEventListener(a,s,c),l=()=>t.removeEventListener(a,s,c)},m(t,e){s(t,n,e),a(n,r),a(n,i),a(n,o),s(t,f,e),s(t,d,e)},p(t,e){t.rand&&function(t,e){e=""+e,t.data!==e&&(t.data=e)}(i,e.rand)},i:t,o:t,d(t){t&&(c(n),c(f),c(d)),l()}}}function j(t,e,n){let r=-1;return{rand:r,getRand:function(){fetch("./rand").then((t=>t.text())).then((t=>n("rand",r=t)))}}}class H extends T{constructor(t){super(),O(this,t,j,S,o,[])}}function I(e){var n;return{c(){(n=h("h2")).textContent="Second page"},m(t,e){s(t,n,e)},p:t,i:t,o:t,d(t){t&&c(n)}}}class N extends T{constructor(t){super(),O(this,t,null,I,o,[])}}function B(t){var e,n,i,o,p=t.current;if(p)var f=new p({});return{c(){e=h("main"),(n=h("nav")).innerHTML='<a href="/">home</a> <a href="/about">about</a>',i=u(),f&&f.$$.fragment.c()},m(t,r){s(t,e,r),a(e,n),a(e,i),f&&L(f,e,null),o=!0},p(t,n){if(p!==(p=n.current)){if(f){E={r:0,c:[],p:E};const t=f;R(t.$$.fragment,1,0,(()=>{C(t,1)})),E.r||r(E.c),E=E.p}p?((f=new p({})).$$.fragment.c(),k(f.$$.fragment,1),L(f,e,null)):f=null}},i(t){o||(f&&k(f.$$.fragment,t),o=!0)},o(t){f&&R(f.$$.fragment,t),o=!1},d(t){t&&c(e),f&&C(f)}}}function q(t,e,n){let r=H;return A("/",(()=>n("current",r=H))),A("/about",(()=>n("current",r=N))),A.start(),{current:r}}return new class extends T{constructor(t){super(),O(this,t,q,B,o,[])}}({target:document.body,props:{name:"world"}})}();
//# sourceMappingURL=bundle.js.map
