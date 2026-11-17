class EventHandle {
	handler;
	name;
	callback;
	scope;
	_once;
	_removed = false;
	constructor(handler, name, callback, scope, once = false) {
		this.handler = handler;
		this.name = name;
		this.callback = callback;
		this.scope = scope;
		this._once = once;
	}
	off() {
		if (this._removed) return;
		this.handler.offByHandle(this);
	}
	on(name, callback, scope = this) {
		return this.handler._addCallback(name, callback, scope, false);
	}
	once(name, callback, scope = this) {
		return this.handler._addCallback(name, callback, scope, true);
	}
	set removed(value) {
		if (!value) return;
		this._removed = true;
	}
	get removed() {
		return this._removed;
	}
	// don't stringify EventHandle to JSON by JSON.stringify
	toJSON(key) {
		return void 0;
	}
}
export {
	EventHandle
};
