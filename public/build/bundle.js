
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
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
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
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
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
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
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
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
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
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
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
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
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.48.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\components\Hero.svelte generated by Svelte v3.48.0 */

    const file$9 = "src\\components\\Hero.svelte";

    function create_fragment$9(ctx) {
    	let div5;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div4;
    	let nav;
    	let div0;
    	let a0;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let div3;
    	let ul1;
    	let li0;
    	let a1;
    	let t3;
    	let li1;
    	let a2;
    	let t5;
    	let li2;
    	let a3;
    	let t7;
    	let div2;
    	let a4;
    	let t8;
    	let div1;
    	let ul0;
    	let li3;
    	let a5;
    	let t10;
    	let li4;
    	let t11;
    	let li5;
    	let a6;
    	let t13;
    	let li6;
    	let t14;
    	let li7;
    	let a7;

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			img0 = element("img");
    			t0 = space();
    			div4 = element("div");
    			nav = element("nav");
    			div0 = element("div");
    			a0 = element("a");
    			img1 = element("img");
    			t1 = space();
    			div3 = element("div");
    			ul1 = element("ul");
    			li0 = element("li");
    			a1 = element("a");
    			a1.textContent = "About";
    			t3 = space();
    			li1 = element("li");
    			a2 = element("a");
    			a2.textContent = "Descover";
    			t5 = space();
    			li2 = element("li");
    			a3 = element("a");
    			a3.textContent = "Get Started";
    			t7 = space();
    			div2 = element("div");
    			a4 = element("a");
    			t8 = space();
    			div1 = element("div");
    			ul0 = element("ul");
    			li3 = element("li");
    			a5 = element("a");
    			a5.textContent = "About";
    			t10 = space();
    			li4 = element("li");
    			t11 = space();
    			li5 = element("li");
    			a6 = element("a");
    			a6.textContent = "Descover";
    			t13 = space();
    			li6 = element("li");
    			t14 = space();
    			li7 = element("li");
    			a7 = element("a");
    			a7.textContent = "Get Started";
    			if (!src_url_equal(img0.src, img0_src_value = "../images/image-hero-desktop.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "hero-img");
    			add_location(img0, file$9, 6, 4, 94);
    			if (!src_url_equal(img1.src, img1_src_value = "../images/logo.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "logo");
    			add_location(img1, file$9, 10, 60, 367);
    			attr_dev(a0, "class", "uk-navbar-item uk-logo");
    			attr_dev(a0, "href", "#");
    			add_location(a0, file$9, 10, 17, 324);
    			attr_dev(div0, "class", "uk-navbar-left");
    			add_location(div0, file$9, 9, 12, 277);
    			attr_dev(a1, "href", "https://www.frontendmentor.io/challenges");
    			attr_dev(a1, "class", "svelte-8y6kqk");
    			add_location(a1, file$9, 14, 49, 570);
    			attr_dev(li0, "class", "max-screen-items svelte-8y6kqk");
    			add_location(li0, file$9, 14, 20, 541);
    			attr_dev(a2, "href", "https://www.frontendmentor.io/challenges");
    			attr_dev(a2, "class", "svelte-8y6kqk");
    			add_location(a2, file$9, 15, 49, 686);
    			attr_dev(li1, "class", "max-screen-items svelte-8y6kqk");
    			add_location(li1, file$9, 15, 20, 657);
    			attr_dev(a3, "href", "https://www.frontendmentor.io/challenges");
    			attr_dev(a3, "class", "svelte-8y6kqk");
    			add_location(a3, file$9, 16, 49, 805);
    			attr_dev(li2, "class", "max-screen-items svelte-8y6kqk");
    			add_location(li2, file$9, 16, 20, 776);
    			attr_dev(a4, "class", "uk-navbar-toggle svelte-8y6kqk");
    			attr_dev(a4, "uk-navbar-toggle-icon", "");
    			attr_dev(a4, "href", "#");
    			add_location(a4, file$9, 18, 24, 948);
    			attr_dev(a5, "href", "#");
    			attr_dev(a5, "class", "svelte-8y6kqk");
    			add_location(a5, file$9, 21, 36, 1231);
    			attr_dev(li3, "class", "svelte-8y6kqk");
    			add_location(li3, file$9, 21, 32, 1227);
    			attr_dev(li4, "class", "uk-nav-divider");
    			add_location(li4, file$9, 22, 32, 1291);
    			attr_dev(a6, "href", "#");
    			attr_dev(a6, "class", "svelte-8y6kqk");
    			add_location(a6, file$9, 23, 36, 1361);
    			attr_dev(li5, "class", "svelte-8y6kqk");
    			add_location(li5, file$9, 23, 32, 1357);
    			attr_dev(li6, "class", "uk-nav-divider");
    			add_location(li6, file$9, 24, 32, 1424);
    			attr_dev(a7, "href", "#");
    			attr_dev(a7, "class", "svelte-8y6kqk");
    			add_location(a7, file$9, 25, 36, 1494);
    			attr_dev(li7, "class", "svelte-8y6kqk");
    			add_location(li7, file$9, 25, 32, 1490);
    			attr_dev(ul0, "class", "uk-nav uk-dropdown-nav svelte-8y6kqk");
    			add_location(ul0, file$9, 20, 28, 1158);
    			attr_dev(div1, "class", "dropdown svelte-8y6kqk");
    			attr_dev(div1, "uk-dropdown", "animation: uk-animation-slide-top-small; duration: 800");
    			add_location(div1, file$9, 19, 24, 1037);
    			attr_dev(div2, "class", "responsive svelte-8y6kqk");
    			add_location(div2, file$9, 17, 20, 898);
    			attr_dev(ul1, "class", "uk-navbar-nav svelte-8y6kqk");
    			add_location(ul1, file$9, 13, 16, 493);
    			attr_dev(div3, "class", "uk-navbar-right");
    			add_location(div3, file$9, 12, 12, 446);
    			attr_dev(nav, "class", "uk-navbar-container uk-navbar-transparent svelte-8y6kqk");
    			attr_dev(nav, "uk-navbar", "");
    			add_location(nav, file$9, 8, 8, 198);
    			attr_dev(div4, "class", "uk-position-top");
    			add_location(div4, file$9, 7, 4, 159);
    			attr_dev(div5, "class", "uk-position-relative");
    			add_location(div5, file$9, 5, 0, 54);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, img0);
    			append_dev(div5, t0);
    			append_dev(div5, div4);
    			append_dev(div4, nav);
    			append_dev(nav, div0);
    			append_dev(div0, a0);
    			append_dev(a0, img1);
    			append_dev(nav, t1);
    			append_dev(nav, div3);
    			append_dev(div3, ul1);
    			append_dev(ul1, li0);
    			append_dev(li0, a1);
    			append_dev(ul1, t3);
    			append_dev(ul1, li1);
    			append_dev(li1, a2);
    			append_dev(ul1, t5);
    			append_dev(ul1, li2);
    			append_dev(li2, a3);
    			append_dev(ul1, t7);
    			append_dev(ul1, div2);
    			append_dev(div2, a4);
    			append_dev(div2, t8);
    			append_dev(div2, div1);
    			append_dev(div1, ul0);
    			append_dev(ul0, li3);
    			append_dev(li3, a5);
    			append_dev(ul0, t10);
    			append_dev(ul0, li4);
    			append_dev(ul0, t11);
    			append_dev(ul0, li5);
    			append_dev(li5, a6);
    			append_dev(ul0, t13);
    			append_dev(ul0, li6);
    			append_dev(ul0, t14);
    			append_dev(ul0, li7);
    			append_dev(li7, a7);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Hero', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Hero> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Hero extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Hero",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src\shared\Cards.svelte generated by Svelte v3.48.0 */

    const file$8 = "src\\shared\\Cards.svelte";

    function create_fragment$8(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "card svelte-97y9s8");
    			add_location(div, file$8, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[0],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Cards', slots, ['default']);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Cards> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Cards extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Cards",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src\components\BackProject.svelte generated by Svelte v3.48.0 */
    const file$7 = "src\\components\\BackProject.svelte";

    // (29:6) {:else}
    function create_else_block$1(ctx) {
    	let button;
    	let img;
    	let img_src_value;
    	let span;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			img = element("img");
    			span = element("span");
    			span.textContent = `${/*notBookmark*/ ctx[1]}`;
    			if (!src_url_equal(img.src, img_src_value = "../images/icon-bookmark.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "icon");
    			add_location(img, file$7, 29, 62, 857);
    			attr_dev(span, "class", "svelte-1nlb2kc");
    			add_location(span, file$7, 29, 111, 906);
    			attr_dev(button, "class", "bookmark-btn svelte-1nlb2kc");
    			add_location(button, file$7, 29, 7, 802);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, img);
    			append_dev(button, span);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*handleBookmark*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(29:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (27:6) {#if bookmarkChecked}
    function create_if_block$1(ctx) {
    	let button;
    	let img;
    	let img_src_value;
    	let span;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			img = element("img");
    			span = element("span");
    			span.textContent = `${/*notBookmark*/ ctx[1]}`;
    			if (!src_url_equal(img.src, img_src_value = "../images/icon-bookmarked.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "icon");
    			add_location(img, file$7, 27, 97, 691);
    			attr_dev(span, "class", "svelte-1nlb2kc");
    			add_location(span, file$7, 27, 148, 742);
    			attr_dev(button, "class", "bookmark-btn svelte-1nlb2kc");
    			toggle_class(button, "bookmarked", /*bookmarkChecked*/ ctx[0]);
    			add_location(button, file$7, 27, 7, 601);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, img);
    			append_dev(button, span);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*handleBookmark*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*bookmarkChecked*/ 1) {
    				toggle_class(button, "bookmarked", /*bookmarkChecked*/ ctx[0]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(27:6) {#if bookmarkChecked}",
    		ctx
    	});

    	return block;
    }

    // (19:0) <Card>
    function create_default_slot$2(ctx) {
    	let div2;
    	let h1;
    	let t1;
    	let p;
    	let t3;
    	let div1;
    	let button;
    	let t5;
    	let div0;

    	function select_block_type(ctx, dirty) {
    		if (/*bookmarkChecked*/ ctx[0]) return create_if_block$1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Mastercraft Bamboo Monitor Riser";
    			t1 = space();
    			p = element("p");
    			p.textContent = "A beautiful and handcrafted monitor stand to reduce neck and eye strain";
    			t3 = space();
    			div1 = element("div");
    			button = element("button");
    			button.textContent = "Back this project";
    			t5 = space();
    			div0 = element("div");
    			if_block.c();
    			attr_dev(h1, "class", "svelte-1nlb2kc");
    			add_location(h1, file$7, 20, 3, 313);
    			attr_dev(p, "class", "svelte-1nlb2kc");
    			add_location(p, file$7, 21, 3, 359);
    			attr_dev(button, "class", "back-project-btn svelte-1nlb2kc");
    			add_location(button, file$7, 23, 4, 470);
    			attr_dev(div0, "class", "bookmark");
    			add_location(div0, file$7, 25, 4, 541);
    			attr_dev(div1, "class", "top-btns svelte-1nlb2kc");
    			add_location(div1, file$7, 22, 3, 442);
    			attr_dev(div2, "class", "top-info svelte-1nlb2kc");
    			add_location(div2, file$7, 19, 1, 286);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h1);
    			append_dev(div2, t1);
    			append_dev(div2, p);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, button);
    			append_dev(div1, t5);
    			append_dev(div1, div0);
    			if_block.m(div0, null);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(19:0) <Card>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let card;
    	let current;

    	card = new Cards({
    			props: {
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(card.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(card, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const card_changes = {};

    			if (dirty & /*$$scope, bookmarkChecked*/ 17) {
    				card_changes.$$scope = { dirty, ctx };
    			}

    			card.$set(card_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(card, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('BackProject', slots, []);
    	let bookmarkChecked = false;
    	let notBookmark = "Bookmarked";
    	let isBookMark = "Bookmarked";

    	const handleBookmark = () => {
    		$$invalidate(0, bookmarkChecked = !bookmarkChecked);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<BackProject> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Card: Cards,
    		bookmarkChecked,
    		notBookmark,
    		isBookMark,
    		handleBookmark
    	});

    	$$self.$inject_state = $$props => {
    		if ('bookmarkChecked' in $$props) $$invalidate(0, bookmarkChecked = $$props.bookmarkChecked);
    		if ('notBookmark' in $$props) $$invalidate(1, notBookmark = $$props.notBookmark);
    		if ('isBookMark' in $$props) isBookMark = $$props.isBookMark;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [bookmarkChecked, notBookmark, handleBookmark];
    }

    class BackProject extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "BackProject",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src\components\Projects.svelte generated by Svelte v3.48.0 */
    const file$6 = "src\\components\\Projects.svelte";

    function create_fragment$6(ctx) {
    	let div;
    	let h3;
    	let t1;
    	let p0;
    	let t3;
    	let p1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			h3.textContent = "About this project";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "The Mastercraft Bamboo Monitor Riser is a sturdy and stylish platform that elevates your screen \r\n  \t\tto a more comfortable viewing height. Placing your monitor at eye level has the potential to improve \r\n\t\tyour posture and make you more comfortable while at work, helping you stay focused on the task at hand.";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "Featuring artisan craftsmanship, the simplicity of design creates extra desk space below your computer \r\n\t\tto allow notepads, pens, and USB sticks to be stored under the stand.";
    			attr_dev(h3, "class", "svelte-xz7ngo");
    			add_location(h3, file$6, 14, 2, 735);
    			attr_dev(p0, "class", "svelte-xz7ngo");
    			add_location(p0, file$6, 15, 2, 766);
    			attr_dev(p1, "class", "svelte-xz7ngo");
    			add_location(p1, file$6, 19, 2, 1089);
    			attr_dev(div, "class", "projects svelte-xz7ngo");
    			add_location(div, file$6, 13, 1, 709);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    			append_dev(div, t1);
    			append_dev(div, p0);
    			append_dev(div, t3);
    			append_dev(div, p1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Projects', slots, []);
    	let bambooDescription = " You get an ergonomic stand made of natural bamboo. You've helped us launch our promotional campaign,and you’ll be added to a special Backer member list.";
    	let bambooAmount = 25;
    	let blackStandDescription = "You get a Black Special Edition computer stand and a personal thank you. You’ll be added to our Backer member list. Shipping is included.";
    	let blackAmount = 75;
    	let mahoganyStandEdition = "You get two Special Edition Mahogany stands, a Backer T-Shirt, and a personal thank you. You’ll be added to our Backer member list. Shipping is included.";
    	let mahoganyAmount = 200;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Projects> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Card: Cards,
    		bambooDescription,
    		bambooAmount,
    		blackStandDescription,
    		blackAmount,
    		mahoganyStandEdition,
    		mahoganyAmount
    	});

    	$$self.$inject_state = $$props => {
    		if ('bambooDescription' in $$props) bambooDescription = $$props.bambooDescription;
    		if ('bambooAmount' in $$props) bambooAmount = $$props.bambooAmount;
    		if ('blackStandDescription' in $$props) blackStandDescription = $$props.blackStandDescription;
    		if ('blackAmount' in $$props) blackAmount = $$props.blackAmount;
    		if ('mahoganyStandEdition' in $$props) mahoganyStandEdition = $$props.mahoganyStandEdition;
    		if ('mahoganyAmount' in $$props) mahoganyAmount = $$props.mahoganyAmount;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [];
    }

    class Projects extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Projects",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src\shared\ProjectCard.svelte generated by Svelte v3.48.0 */

    const file$5 = "src\\shared\\ProjectCard.svelte";

    function create_fragment$5(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "card svelte-1ukwnja");
    			add_location(div, file$5, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[0],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ProjectCard', slots, ['default']);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ProjectCard> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class ProjectCard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProjectCard",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\shared\CompleteModal.svelte generated by Svelte v3.48.0 */

    const file$4 = "src\\shared\\CompleteModal.svelte";

    function create_fragment$4(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let h2;
    	let t2;
    	let p;
    	let t4;
    	let button;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			h2 = element("h2");
    			h2.textContent = "Thanks for your support!";
    			t2 = space();
    			p = element("p");
    			p.textContent = "Your pledge brings us one stap closer to sharing Mastercraft Bamboo\r\n\t\t\tMonitor Riser worldwide. You will get an email once our campaign in completed.";
    			t4 = space();
    			button = element("button");
    			button.textContent = "Got it!";
    			if (!src_url_equal(img.src, img_src_value = "../../images/icon-check.svg")) attr_dev(img, "src", img_src_value);
    			add_location(img, file$4, 3, 3, 142);
    			attr_dev(h2, "class", "svelte-1wuyjhc");
    			add_location(h2, file$4, 4, 3, 186);
    			attr_dev(p, "class", "svelte-1wuyjhc");
    			add_location(p, file$4, 5, 3, 224);
    			attr_dev(button, "class", "got-it uk-modal-close svelte-1wuyjhc");
    			attr_dev(button, "type", "button");
    			add_location(button, file$4, 7, 3, 386);
    			attr_dev(div0, "class", "modal-info svelte-1wuyjhc");
    			add_location(div0, file$4, 2, 2, 113);
    			attr_dev(div1, "class", "uk-modal-dialog uk-modal-body uk-margin-auto-vertical svelte-1wuyjhc");
    			add_location(div1, file$4, 1, 1, 42);
    			attr_dev(div2, "id", "modal-close-default");
    			attr_dev(div2, "uk-modal", "");
    			add_location(div2, file$4, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, img);
    			append_dev(div0, t0);
    			append_dev(div0, h2);
    			append_dev(div0, t2);
    			append_dev(div0, p);
    			append_dev(div0, t4);
    			append_dev(div0, button);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('CompleteModal', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CompleteModal> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class CompleteModal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CompleteModal",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\shared\Stands.svelte generated by Svelte v3.48.0 */
    const file$3 = "src\\shared\\Stands.svelte";

    // (52:3) {:else}
    function create_else_block_1(ctx) {
    	let button;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Out Of Stock";
    			attr_dev(button, "class", "pledge-btn svelte-v3w869");
    			button.disabled = true;
    			add_location(button, file$3, 52, 4, 1042);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(52:3) {:else}",
    		ctx
    	});

    	return block;
    }

    // (50:3) {#if !outOfStock}
    function create_if_block_2(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Pledge";
    			attr_dev(button, "class", "pledge-btn svelte-v3w869");
    			add_location(button, file$3, 50, 4, 963);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*toggle*/ ctx[7], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(50:3) {#if !outOfStock}",
    		ctx
    	});

    	return block;
    }

    // (57:2) {#if pledgeToggle}
    function create_if_block(ctx) {
    	let div1;
    	let p;
    	let t1;
    	let div0;
    	let input;
    	let t2;
    	let t3;
    	let completemodal;
    	let current;
    	let mounted;
    	let dispose;

    	function select_block_type_1(ctx, dirty) {
    		if (!/*outOfStock*/ ctx[5]) return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);
    	completemodal = new CompleteModal({ $$inline: true });

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			p = element("p");
    			p.textContent = "Enter your pledge";
    			t1 = space();
    			div0 = element("div");
    			input = element("input");
    			t2 = space();
    			if_block.c();
    			t3 = space();
    			create_component(completemodal.$$.fragment);
    			attr_dev(p, "class", "svelte-v3w869");
    			add_location(p, file$3, 58, 5, 1211);
    			attr_dev(input, "type", "number");
    			attr_dev(input, "class", "amount uk-input svelte-v3w869");
    			attr_dev(input, "placeholder", "$");
    			add_location(input, file$3, 60, 6, 1277);
    			attr_dev(div0, "class", "amount-pledge");
    			add_location(div0, file$3, 59, 5, 1242);
    			attr_dev(div1, "class", "pledge-area uk-animation-slide-top-medium svelte-v3w869");
    			add_location(div1, file$3, 57, 4, 1149);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, p);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, input);
    			set_input_value(input, /*amount*/ ctx[0]);
    			append_dev(div0, t2);
    			if_block.m(div0, null);
    			append_dev(div0, t3);
    			mount_component(completemodal, div0, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler*/ ctx[9]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*amount*/ 1 && to_number(input.value) !== /*amount*/ ctx[0]) {
    				set_input_value(input, /*amount*/ ctx[0]);
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div0, t3);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(completemodal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(completemodal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if_block.d();
    			destroy_component(completemodal);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(57:2) {#if pledgeToggle}",
    		ctx
    	});

    	return block;
    }

    // (64:6) {:else}
    function create_else_block(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "button");
    			input.value = "Continue";
    			attr_dev(input, "class", "continue-btn svelte-v3w869");
    			input.disabled = true;
    			add_location(input, file$3, 64, 7, 1539);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			if (!mounted) {
    				dispose = listen_dev(input, "click", /*handleAdd*/ ctx[8], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(64:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (62:6) {#if !outOfStock}
    function create_if_block_1(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "button");
    			input.value = "Continue";
    			attr_dev(input, "class", "continue-btn svelte-v3w869");
    			attr_dev(input, "uk-toggle", "target: #modal-close-default");
    			add_location(input, file$3, 62, 7, 1392);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);

    			if (!mounted) {
    				dispose = listen_dev(input, "click", /*handleAdd*/ ctx[8], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(62:6) {#if !outOfStock}",
    		ctx
    	});

    	return block;
    }

    // (39:0) <ProjectCard >
    function create_default_slot$1(ctx) {
    	let div3;
    	let div0;
    	let h4;
    	let t0;
    	let t1;
    	let p0;
    	let t2;
    	let t3;
    	let div1;
    	let p1;
    	let t4;
    	let t5;
    	let div2;
    	let h2;
    	let t6;
    	let span;
    	let t8;
    	let t9;
    	let current;

    	function select_block_type(ctx, dirty) {
    		if (!/*outOfStock*/ ctx[5]) return create_if_block_2;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*pledgeToggle*/ ctx[6] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			h4 = element("h4");
    			t0 = text(/*standType*/ ctx[2]);
    			t1 = space();
    			p0 = element("p");
    			t2 = text(/*pledge*/ ctx[3]);
    			t3 = space();
    			div1 = element("div");
    			p1 = element("p");
    			t4 = text(/*description*/ ctx[4]);
    			t5 = space();
    			div2 = element("div");
    			h2 = element("h2");
    			t6 = text(/*left*/ ctx[1]);
    			span = element("span");
    			span.textContent = "left";
    			t8 = space();
    			if_block0.c();
    			t9 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(h4, "class", "svelte-v3w869");
    			add_location(h4, file$3, 41, 3, 765);
    			attr_dev(p0, "class", "svelte-v3w869");
    			add_location(p0, file$3, 42, 3, 790);
    			attr_dev(div0, "class", "top svelte-v3w869");
    			add_location(div0, file$3, 40, 2, 743);
    			attr_dev(p1, "class", "svelte-v3w869");
    			add_location(p1, file$3, 45, 3, 844);
    			attr_dev(div1, "class", "middle");
    			add_location(div1, file$3, 44, 2, 819);
    			attr_dev(span, "class", "svelte-v3w869");
    			add_location(span, file$3, 48, 13, 913);
    			attr_dev(h2, "class", "svelte-v3w869");
    			add_location(h2, file$3, 48, 3, 903);
    			attr_dev(div2, "class", "bottom svelte-v3w869");
    			add_location(div2, file$3, 47, 2, 878);
    			attr_dev(div3, "class", "svelte-v3w869");
    			toggle_class(div3, "out-stock", /*outOfStock*/ ctx[5]);
    			add_location(div3, file$3, 39, 1, 705);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, h4);
    			append_dev(h4, t0);
    			append_dev(div0, t1);
    			append_dev(div0, p0);
    			append_dev(p0, t2);
    			append_dev(div3, t3);
    			append_dev(div3, div1);
    			append_dev(div1, p1);
    			append_dev(p1, t4);
    			append_dev(div3, t5);
    			append_dev(div3, div2);
    			append_dev(div2, h2);
    			append_dev(h2, t6);
    			append_dev(h2, span);
    			append_dev(div2, t8);
    			if_block0.m(div2, null);
    			append_dev(div3, t9);
    			if (if_block1) if_block1.m(div3, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*standType*/ 4) set_data_dev(t0, /*standType*/ ctx[2]);
    			if (!current || dirty & /*pledge*/ 8) set_data_dev(t2, /*pledge*/ ctx[3]);
    			if (!current || dirty & /*description*/ 16) set_data_dev(t4, /*description*/ ctx[4]);
    			if (!current || dirty & /*left*/ 2) set_data_dev(t6, /*left*/ ctx[1]);

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div2, null);
    				}
    			}

    			if (/*pledgeToggle*/ ctx[6]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*pledgeToggle*/ 64) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div3, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*outOfStock*/ 32) {
    				toggle_class(div3, "out-stock", /*outOfStock*/ ctx[5]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(39:0) <ProjectCard >",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let projectcard;
    	let current;

    	projectcard = new ProjectCard({
    			props: {
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(projectcard.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(projectcard, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const projectcard_changes = {};

    			if (dirty & /*$$scope, outOfStock, amount, pledgeToggle, left, description, pledge, standType*/ 2175) {
    				projectcard_changes.$$scope = { dirty, ctx };
    			}

    			projectcard.$set(projectcard_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(projectcard.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(projectcard.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(projectcard, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Stands', slots, []);
    	let dispatch = createEventDispatcher();
    	let { standType = "" } = $$props;
    	let { pledge = "" } = $$props;
    	let { description = "" } = $$props;
    	let { amount } = $$props;
    	let { left = 0 } = $$props;
    	let outOfStock = false;
    	let pledgeToggle = false;

    	const toggle = () => {
    		$$invalidate(6, pledgeToggle = !pledgeToggle);
    	};

    	const handleAdd = () => {
    		let totalAmount = amount;
    		$$invalidate(1, left -= 1);

    		if (left === 0) {
    			$$invalidate(5, outOfStock = true);
    			$$invalidate(6, pledgeToggle = false);
    		}

    		dispatch('addAmount', totalAmount);
    	};

    	const writable_props = ['standType', 'pledge', 'description', 'amount', 'left'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Stands> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		amount = to_number(this.value);
    		$$invalidate(0, amount);
    	}

    	$$self.$$set = $$props => {
    		if ('standType' in $$props) $$invalidate(2, standType = $$props.standType);
    		if ('pledge' in $$props) $$invalidate(3, pledge = $$props.pledge);
    		if ('description' in $$props) $$invalidate(4, description = $$props.description);
    		if ('amount' in $$props) $$invalidate(0, amount = $$props.amount);
    		if ('left' in $$props) $$invalidate(1, left = $$props.left);
    	};

    	$$self.$capture_state = () => ({
    		ProjectCard,
    		CompleteModal,
    		createEventDispatcher,
    		dispatch,
    		standType,
    		pledge,
    		description,
    		amount,
    		left,
    		outOfStock,
    		pledgeToggle,
    		toggle,
    		handleAdd
    	});

    	$$self.$inject_state = $$props => {
    		if ('dispatch' in $$props) dispatch = $$props.dispatch;
    		if ('standType' in $$props) $$invalidate(2, standType = $$props.standType);
    		if ('pledge' in $$props) $$invalidate(3, pledge = $$props.pledge);
    		if ('description' in $$props) $$invalidate(4, description = $$props.description);
    		if ('amount' in $$props) $$invalidate(0, amount = $$props.amount);
    		if ('left' in $$props) $$invalidate(1, left = $$props.left);
    		if ('outOfStock' in $$props) $$invalidate(5, outOfStock = $$props.outOfStock);
    		if ('pledgeToggle' in $$props) $$invalidate(6, pledgeToggle = $$props.pledgeToggle);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		amount,
    		left,
    		standType,
    		pledge,
    		description,
    		outOfStock,
    		pledgeToggle,
    		toggle,
    		handleAdd,
    		input_input_handler
    	];
    }

    class Stands extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			standType: 2,
    			pledge: 3,
    			description: 4,
    			amount: 0,
    			left: 1
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Stands",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*amount*/ ctx[0] === undefined && !('amount' in props)) {
    			console.warn("<Stands> was created without expected prop 'amount'");
    		}
    	}

    	get standType() {
    		throw new Error("<Stands>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set standType(value) {
    		throw new Error("<Stands>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pledge() {
    		throw new Error("<Stands>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pledge(value) {
    		throw new Error("<Stands>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get description() {
    		throw new Error("<Stands>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set description(value) {
    		throw new Error("<Stands>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get amount() {
    		throw new Error("<Stands>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set amount(value) {
    		throw new Error("<Stands>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get left() {
    		throw new Error("<Stands>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set left(value) {
    		throw new Error("<Stands>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Progress.svelte generated by Svelte v3.48.0 */
    const file$2 = "src\\components\\Progress.svelte";

    // (28:0) <Card>
    function create_default_slot(ctx) {
    	let div5;
    	let div3;
    	let div0;
    	let h30;
    	let t0;
    	let t1;
    	let t2;
    	let p0;
    	let t4;
    	let hr0;
    	let t5;
    	let div1;
    	let h31;
    	let t6;
    	let t7;
    	let p1;
    	let t9;
    	let hr1;
    	let t10;
    	let div2;
    	let h32;
    	let t12;
    	let p2;
    	let t14;
    	let div4;
    	let progress;
    	let t15;
    	let project;
    	let t16;
    	let div6;
    	let stands0;
    	let t17;
    	let stands1;
    	let t18;
    	let stands2;
    	let current;
    	project = new Projects({ $$inline: true });

    	stands0 = new Stands({
    			props: {
    				standType: "Bamboo Stand",
    				pledge: "Pledge $25 or more",
    				description: /*bambooDescription*/ ctx[2],
    				amount: /*bambooAmount*/ ctx[3],
    				left: 45
    			},
    			$$inline: true
    		});

    	stands0.$on("addAmount", /*addAmount*/ ctx[8]);

    	stands1 = new Stands({
    			props: {
    				standType: "Black Edition Stand",
    				pledge: "Pledge $75 or more",
    				description: /*blackStandDescription*/ ctx[4],
    				amount: /*blackAmount*/ ctx[5],
    				left: 50
    			},
    			$$inline: true
    		});

    	stands1.$on("addAmount", /*addAmount*/ ctx[8]);

    	stands2 = new Stands({
    			props: {
    				standType: "Mahogany Special Edition",
    				pledge: "Pledge $200 or more",
    				description: /*mahoganyStandEdition*/ ctx[6],
    				amount: /*mahoganyAmount*/ ctx[7],
    				left: 10
    			},
    			$$inline: true
    		});

    	stands2.$on("addAmount", /*addAmount*/ ctx[8]);

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			h30 = element("h3");
    			t0 = text("$");
    			t1 = text(/*totalAmount*/ ctx[0]);
    			t2 = space();
    			p0 = element("p");
    			p0.textContent = "of $10000 backed";
    			t4 = space();
    			hr0 = element("hr");
    			t5 = space();
    			div1 = element("div");
    			h31 = element("h3");
    			t6 = text(/*totalBackers*/ ctx[1]);
    			t7 = space();
    			p1 = element("p");
    			p1.textContent = "Total backers";
    			t9 = space();
    			hr1 = element("hr");
    			t10 = space();
    			div2 = element("div");
    			h32 = element("h3");
    			h32.textContent = "25";
    			t12 = space();
    			p2 = element("p");
    			p2.textContent = "days left";
    			t14 = space();
    			div4 = element("div");
    			progress = element("progress");
    			t15 = space();
    			create_component(project.$$.fragment);
    			t16 = space();
    			div6 = element("div");
    			create_component(stands0.$$.fragment);
    			t17 = space();
    			create_component(stands1.$$.fragment);
    			t18 = space();
    			create_component(stands2.$$.fragment);
    			attr_dev(h30, "class", "svelte-1ra97dn");
    			add_location(h30, file$2, 31, 4, 1044);
    			attr_dev(p0, "class", "svelte-1ra97dn");
    			add_location(p0, file$2, 32, 4, 1073);
    			attr_dev(div0, "class", "total-amount");
    			add_location(div0, file$2, 30, 3, 1012);
    			attr_dev(hr0, "class", "uk-divider-vertical");
    			add_location(hr0, file$2, 34, 3, 1112);
    			attr_dev(h31, "class", "svelte-1ra97dn");
    			add_location(h31, file$2, 36, 4, 1176);
    			attr_dev(p1, "class", "svelte-1ra97dn");
    			add_location(p1, file$2, 37, 4, 1205);
    			attr_dev(div1, "class", "backers");
    			add_location(div1, file$2, 35, 3, 1149);
    			attr_dev(hr1, "class", "uk-divider-vertical");
    			add_location(hr1, file$2, 39, 3, 1241);
    			attr_dev(h32, "class", "svelte-1ra97dn");
    			add_location(h32, file$2, 41, 4, 1302);
    			attr_dev(p2, "class", "svelte-1ra97dn");
    			add_location(p2, file$2, 42, 4, 1319);
    			attr_dev(div2, "class", "days");
    			add_location(div2, file$2, 40, 3, 1278);
    			attr_dev(div3, "class", "top svelte-1ra97dn");
    			add_location(div3, file$2, 29, 2, 990);
    			attr_dev(progress, "id", "js-progressbar");
    			attr_dev(progress, "class", "uk-progress svelte-1ra97dn");
    			progress.value = /*totalAmount*/ ctx[0];
    			attr_dev(progress, "max", 10000);
    			add_location(progress, file$2, 46, 3, 1385);
    			attr_dev(div4, "class", "bottom svelte-1ra97dn");
    			add_location(div4, file$2, 45, 2, 1360);
    			attr_dev(div5, "class", "progress");
    			add_location(div5, file$2, 28, 1, 964);
    			attr_dev(div6, "class", "projects-area svelte-1ra97dn");
    			add_location(div6, file$2, 50, 1, 1516);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div3);
    			append_dev(div3, div0);
    			append_dev(div0, h30);
    			append_dev(h30, t0);
    			append_dev(h30, t1);
    			append_dev(div0, t2);
    			append_dev(div0, p0);
    			append_dev(div3, t4);
    			append_dev(div3, hr0);
    			append_dev(div3, t5);
    			append_dev(div3, div1);
    			append_dev(div1, h31);
    			append_dev(h31, t6);
    			append_dev(div1, t7);
    			append_dev(div1, p1);
    			append_dev(div3, t9);
    			append_dev(div3, hr1);
    			append_dev(div3, t10);
    			append_dev(div3, div2);
    			append_dev(div2, h32);
    			append_dev(div2, t12);
    			append_dev(div2, p2);
    			append_dev(div5, t14);
    			append_dev(div5, div4);
    			append_dev(div4, progress);
    			insert_dev(target, t15, anchor);
    			mount_component(project, target, anchor);
    			insert_dev(target, t16, anchor);
    			insert_dev(target, div6, anchor);
    			mount_component(stands0, div6, null);
    			append_dev(div6, t17);
    			mount_component(stands1, div6, null);
    			append_dev(div6, t18);
    			mount_component(stands2, div6, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*totalAmount*/ 1) set_data_dev(t1, /*totalAmount*/ ctx[0]);
    			if (!current || dirty & /*totalBackers*/ 2) set_data_dev(t6, /*totalBackers*/ ctx[1]);

    			if (!current || dirty & /*totalAmount*/ 1) {
    				prop_dev(progress, "value", /*totalAmount*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(project.$$.fragment, local);
    			transition_in(stands0.$$.fragment, local);
    			transition_in(stands1.$$.fragment, local);
    			transition_in(stands2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(project.$$.fragment, local);
    			transition_out(stands0.$$.fragment, local);
    			transition_out(stands1.$$.fragment, local);
    			transition_out(stands2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			if (detaching) detach_dev(t15);
    			destroy_component(project, detaching);
    			if (detaching) detach_dev(t16);
    			if (detaching) detach_dev(div6);
    			destroy_component(stands0);
    			destroy_component(stands1);
    			destroy_component(stands2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(28:0) <Card>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let card;
    	let current;

    	card = new Cards({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(card.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(card, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const card_changes = {};

    			if (dirty & /*$$scope, totalAmount, totalBackers*/ 515) {
    				card_changes.$$scope = { dirty, ctx };
    			}

    			card.$set(card_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(card, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Progress', slots, []);
    	let bambooDescription = " You get an ergonomic stand made of natural bamboo. You've helped us launch our promotional campaign,and you’ll be added to a special Backer member list.";
    	let bambooAmount = 25;
    	let blackStandDescription = "You get a Black Special Edition computer stand and a personal thank you. You’ll be added to our Backer member list. Shipping is included.";
    	let blackAmount = 75;
    	let mahoganyStandEdition = "You get two Special Edition Mahogany stands, a Backer T-Shirt, and a personal thank you. You’ll be added to our Backer member list. Shipping is included.";
    	let mahoganyAmount = 200;
    	let totalAmount = 0;
    	let totalBackers = 0;

    	const addAmount = e => {
    		const Amount = e.detail;
    		$$invalidate(0, totalAmount += Amount);
    		$$invalidate(1, totalBackers += 1);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Progress> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Card: Cards,
    		Project: Projects,
    		Stands,
    		bambooDescription,
    		bambooAmount,
    		blackStandDescription,
    		blackAmount,
    		mahoganyStandEdition,
    		mahoganyAmount,
    		totalAmount,
    		totalBackers,
    		addAmount
    	});

    	$$self.$inject_state = $$props => {
    		if ('bambooDescription' in $$props) $$invalidate(2, bambooDescription = $$props.bambooDescription);
    		if ('bambooAmount' in $$props) $$invalidate(3, bambooAmount = $$props.bambooAmount);
    		if ('blackStandDescription' in $$props) $$invalidate(4, blackStandDescription = $$props.blackStandDescription);
    		if ('blackAmount' in $$props) $$invalidate(5, blackAmount = $$props.blackAmount);
    		if ('mahoganyStandEdition' in $$props) $$invalidate(6, mahoganyStandEdition = $$props.mahoganyStandEdition);
    		if ('mahoganyAmount' in $$props) $$invalidate(7, mahoganyAmount = $$props.mahoganyAmount);
    		if ('totalAmount' in $$props) $$invalidate(0, totalAmount = $$props.totalAmount);
    		if ('totalBackers' in $$props) $$invalidate(1, totalBackers = $$props.totalBackers);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		totalAmount,
    		totalBackers,
    		bambooDescription,
    		bambooAmount,
    		blackStandDescription,
    		blackAmount,
    		mahoganyStandEdition,
    		mahoganyAmount,
    		addAmount
    	];
    }

    class Progress extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Progress",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\components\MainContainer.svelte generated by Svelte v3.48.0 */
    const file$1 = "src\\components\\MainContainer.svelte";

    function create_fragment$1(ctx) {
    	let main;
    	let img;
    	let img_src_value;
    	let t0;
    	let backproject;
    	let t1;
    	let progress;
    	let current;
    	backproject = new BackProject({ $$inline: true });
    	progress = new Progress({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			img = element("img");
    			t0 = space();
    			create_component(backproject.$$.fragment);
    			t1 = space();
    			create_component(progress.$$.fragment);
    			attr_dev(img, "class", "logo svelte-1wetv7w");
    			if (!src_url_equal(img.src, img_src_value = "../images/logo-mastercraft.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "logo-mastercraft");
    			add_location(img, file$1, 11, 1, 158);
    			attr_dev(main, "class", "svelte-1wetv7w");
    			add_location(main, file$1, 10, 0, 149);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, img);
    			append_dev(main, t0);
    			mount_component(backproject, main, null);
    			append_dev(main, t1);
    			mount_component(progress, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(backproject.$$.fragment, local);
    			transition_in(progress.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(backproject.$$.fragment, local);
    			transition_out(progress.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(backproject);
    			destroy_component(progress);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('MainContainer', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<MainContainer> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ BackProject, Progress });
    	return [];
    }

    class MainContainer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MainContainer",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.48.0 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let hero;
    	let t;
    	let div;
    	let maincontainer;
    	let current;
    	hero = new Hero({ $$inline: true });
    	maincontainer = new MainContainer({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(hero.$$.fragment);
    			t = space();
    			div = element("div");
    			create_component(maincontainer.$$.fragment);
    			attr_dev(div, "class", "content svelte-qw3f9p");
    			add_location(div, file, 8, 1, 147);
    			attr_dev(main, "class", "svelte-qw3f9p");
    			add_location(main, file, 5, 0, 128);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(hero, main, null);
    			append_dev(main, t);
    			append_dev(main, div);
    			mount_component(maincontainer, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(hero.$$.fragment, local);
    			transition_in(maincontainer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(hero.$$.fragment, local);
    			transition_out(maincontainer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(hero);
    			destroy_component(maincontainer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Hero, MainContainer });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
