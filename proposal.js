/////////////////////////////////////////////////////////////////
// FRAMEWORK
/////////////////////////////////////////////////////////////////
'use strict';

var B = typeof exports !== 'undefined' ? exports : {};

// prefix for internal property state
var __PROP__ = '__PROP__';

// default constructor used in setting up prototype chain
var ctor = function() {};
B.extend = function(__super__, proto) {
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
            var handler = this[key + 'Changed'];
            if (handler) handler(val, priorVal);
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

        // calling the explict setter allows you to pass additional options
        // such as quiet that will squelch change notifications
        setter.call(klass.prototype, proto[key], {quiet: true});
      })(key);
    }
  }

  // call extend from the class itself optionally
  klass.extend = function(proto) {return B.extend(klass, proto);};
  return klass;
};

// Base class everything is derived from that provides events for observing
// state changes from the outside
var Base = B.extend(function Base() {}, {

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
      callback = calls[i];
      if (callback.fn === fn) {
        list.splice(i, 1);
        i--;
      }
    }
  }
});

// function for creating a new class that inherits from the base
B.create = function(proto) {return B.extend(Base, proto);};


/////////////////////////////////////////////////////////////////
// EXAMPLE
/////////////////////////////////////////////////////////////////

var SomeObject = B.create({
  foo: 1,

  fooChanged: function(val, priorVal) {
    // Changed functions are called when your internal state changes
    console.log('some object foo changed', arguments);
  }

});

var InheritSomeObject = SomeObject.extend({

  foo: 1,

  bar: 1,

  fooChanged: function(val, priorVal) {
    // these can be inherited as well
    console.log('inherited object foo changed', arguments);
  }

});
var so = new InheritSomeObject();

var AnotherObject = B.create({

  baz: 1,

  constructor: function(opts) {
    var o = opts.exampleListeningObject
    // setting up a listener on an external object...could be done anywhere
    // not just in the constructor
    o.listen('changed', this.interestingObjectChanged, this);
  },

  // listening for a change on an external object and setting an internal prop
  interestingObjectChanged: function(changedProperties) {
    console.log('notified of external change', changedProperties);
    if (changedProperties.foo) {
      this.baz = changedProperties.foo.newVal;
    }
  },

  // listening for the internal change
  bazChanged: function(val, priorVal) {
    console.log('another object baz changed', arguments);
  }

});

// passing in an object to listen to. The method of listening is arbitrary and
// not necessarily part of the framework. This just demonstrates using events
// to listen to changes on external objects
var anotherObject = new AnotherObject({
  exampleListeningObject: someObject
});

// setting property foo of someObject triggers someObjects internal fooChanged
// handler as well as anotherObjects listener which in turn updates its internal
// state triggering its own internal state change handler
someObject.foo = 2;
