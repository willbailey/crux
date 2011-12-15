'use strict';

// prefix for internal property state
var __PROP__ = '__PROP__';

// default constructor used in setting up prototype chain
var ctor = function() {};
var extend = function(__super__, proto) {
  var klass;

  if (proto.hasOwnProperty('constructor')) {
    klass = proto.constructor;
  } else {
    // automatically invoke the super constructor if the constructor is not
    // defined
    klass = function() {
      __super__.apply(this, arguments);
    };
  }

  // setup the prototype chain
  ctor.prototype = __super__.prototype;
  klass.prototype = new ctor();

  // fix the prototype.constructor
  klass.prototype.constructor = klass;

  // reference to super
  klass.__super__ = __super__.prototype;

  // add prototype members
  for (var key in proto) {
    if (proto.hasOwnProperty(key)) {
      (function(key) {

        // setter provides automatic invocation of [prop]Changed if defined
        // for handling internal state changes and triggers a changed event
        // for notifying external objects that may be interested in change
        // events
        var setter = function(val, opts) {
          opts = opts || {};
          var priorVal = this[__PROP__ + key];
          if (priorVal !== val) {
            this[__PROP__ + key] = val;
            // defer handlers
            var handler = this[key + 'Changed'];
            if (handler) handler.call(this, val, priorVal);
            if (this.trigger && !opts.quiet) {
              var changedProperties = {};
              changedProperties[key] = {newVal: val, priorVal: priorVal};
              this.trigger(this.events.CHANGED, changedProperties);
            }
          }
        };

        var getter = function() {
          return this[__PROP__ + key];
        };

        // all non-function properties can be observed
        if (typeof key !== 'function') {
          Object.defineProperty(klass.prototype, key, {
            set: setter, get: getter, enumerable: true, configurable: false
          });
        }

        // uppercase property key
        var base = key[0].toUpperCase() + key.split('').slice(1);

        // provide set[Property] get[Property] in addition to built in setter
        klass.prototype['set' + base] = setter;
        klass.prototype['get' + base] = getter;

        klass.prototype[__PROP__ + key] = proto[key];
      })(key);
    }
  }

  // call extend from the class itself optionally
  klass.extend = function(proto) {return crux.extend(klass, proto);};
  return klass;
};

// Base class everything is derived from that provides events for observing
// state changes from the outside
var CX = extend(function Base() {}, {

  // list of events the base class provides
  events: {
    CHANGED: 'changed'
  },

  // trigger an event
  trigger: function(evt) {
    var calls = this.callbacks || (this.callbacks = {});
    var list = calls[evt] || (calls[evt] = []);
    for (var i = 0, l = list.length, callback, args; i < l; i++) {
      callback = list[i];
      args = Array.prototype.slice.call(arguments);
      callback.fn.apply(callback.context, args.slice(1));
    }
  },

  // listen for an event
  listen: function(evt, fn, context) {
    var calls = this.callbacks || (this.callbacks = {});
    var list = calls[evt] || (calls[evt] = []);
    list.push({fn: fn, context: context || this});
  },

  // remove a listener
  removeListener: function(evt, fn) {
    if (!fn && !evt) {
      this.callbacks = {};
      return;
    }
    if (!evt) {
      throw 'Cannot remove a listener without an event';
      return;
    }
    var calls = this.callbacks || (this.callbacks = {});
    var list = calls[evt] || (calls[evt] = []);
    if (!fn) {
      list = [];
      return;
    }
    for (var i = 0, l = list.length, callback; i < l; i++) {
      callback = list[i];
      if (callback.fn === fn) {
        list.splice(i, 1);
      }
    }
  },

  bind: function(obj) {
    var tuples = Array.prototype.slice.call(arguments, 1);
    var _this = this;
    obj.listen('changed', function(changedProps) {
      for (var i = 0, len = tuples.length; i < len; i++) {
        var tuple = tuples[i];
        var iProp = tuple[0];
        var bProp = tuple[1];
        if (changedProps[bProp]) {
          _this[iProp] = changedProps[bProp].newVal;
        }
      }
    });
    for (var i2 = 0, len2 = tuples.length; i2 < len2; i2++) {
      var tuple = tuples[i2];
      var iProp = tuple[0];
      var bProp = tuple[1];
      this[iProp] = obj[bProp];
    }
  }
});
