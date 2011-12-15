document.addEventListener('DOMContentLoaded', function() {

  test('extend', function() {
    var Parent = function Parent(){};
    var Child = B.extend(Parent, {});
    var child = new Child();
    ok(child instanceof Parent);

    var AnotherChild = Child.extend({});
    var anotherChild = new AnotherChild();
    ok(anotherChild instanceof Parent);

    ok(Base);
    ok(Base.prototype.trigger);
    ok(Base.prototype.listen);
    ok(Base.prototype.removeListener);
  });

  test('setters', function() {
    var Class = Base.extend({
      foo: 0,
      bar: 1,
      baz: 2,
      fooChanged: function() {
        this.bar++;
      },
      barChanged: function() {
        this.baz++;
      },
    });
    var obj = new Class();
    obj.foo++;
    equal(obj.foo, 1);
    equal(obj.bar, 2);
    equal(obj.baz, 3);
  });

  test('events', function() {
    var Class = Base.extend({
      foo: 1,
      bar: 2,
      baz: 3
    });
    var obj = new Class();

    var handler = function(changedProps) {
      ok(changedProps.foo);
      equal(changedProps.foo.newVal, 2);
      equal(changedProps.foo.priorVal, 1);
    };
    obj.listen('changed', handler);
    equal(obj.callbacks.changed.length, 1);
    obj.foo++;

    obj.removeListener('changed', handler);
    equal(obj.callbacks.changed.length, 0);
  });

  test('binding', function() {
    var SomeClass = Base.extend({foo: 1});
    var AnotherClass = Base.extend({bar: 2});
    var obj = new SomeClass();
    var obj2 = new AnotherClass();
    obj.bind(obj2, ['foo', 'bar'] /* ... */);
    equal(obj.foo, 2);
    obj2.bar = 3;
    equal(obj.foo, 3);
  });
});
