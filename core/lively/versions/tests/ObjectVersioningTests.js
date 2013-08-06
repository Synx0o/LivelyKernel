module('lively.versions.tests.ObjectVersioningTests').
requires('lively.TestFramework', 'lively.versions.ObjectVersioning').
toRun(function() {
    
TestCase.subclass('lively.versions.tests.TestCase', 
'versioning shortcuts', {
    proxyFor: function(target) {
        return lively.versions.ObjectVersioning.proxy(target);
    },
    isProxy: function(obj) {
        return lively.versions.ObjectVersioning.isProxy(obj);
    },
    objectForProxy: function(proxy) {
        return lively.versions.ObjectVersioning.getObjectForProxy(proxy);
    },
    commitVersion: function() {
        return lively.versions.ObjectVersioning.commitVersion();
    },
    undo: function() {
        lively.versions.ObjectVersioning.undo();
    },
    redo: function() {
        lively.versions.ObjectVersioning.redo();
    },
    transform: function(source) {
        return lively.versions.ObjectVersioning.transformSource(source);
    },
}, 
'testing', {
    assertInVersion: function(func, version) {
        var a, b,
            previousVersion = lively.CurrentObjectTable;
        
        lively.CurrentObjectTable = version;
        
        this.assert(func.apply());
        
        lively.CurrentObjectTable = previousVersion;
    },
});

lively.versions.tests.TestCase.subclass(
'lively.versions.tests.ObjectVersioningTests.ProxyObjectTests',
'testing', {
    setUp: function() {
        // reset global object table on each test (for now)
        lively.versions.ObjectVersioning.init();
    },
    test01ProxyCreation: function() {
        var proxy = this.proxyFor({});
        
        this.assert(this.isProxy(proxy));
    },
    test02ProxyResolvesToObjectViaObjectTable: function() {
        var object = {},
            proxy = this.proxyFor(object);
        
        this.assertEquals(this.objectForProxy(proxy), object);
    },
    test02ProxyRetrievesPrimitiveProperty: function() {
        var obj = {},
            proxy = this.proxyFor(obj);
            
        obj.age = 24;
        
        this.assertEquals(proxy.age, 24);
    },
    test03ProxyCanWritePrimitiveProperty: function() {
        var obj = {},
            proxy = this.proxyFor(obj);
            
        proxy.age = 24;
        
        this.assertEquals(obj.age, 24);
    },
    test04ProxyRetrievesNonPrimitiveProperty: function() {
        var personProxy = this.proxyFor({age : 24}),
            address = {
                street: 'Friedrichstraße', 
                number: '112b'
            },
            addressProxy = this.proxyFor(address);
            
        personProxy.address = addressProxy;
        
        this.assert(this.isProxy(personProxy.address));
        this.assertEquals(this.objectForProxy(personProxy.address), address);
    },
    test05ProxiesGetPassedByReference: function() {
        var person = this.proxyFor({}),
            roomMate = this.proxyFor({});
        
        person.address = this.proxyFor({
                street: 'Wrangelstraße', 
                number: '24'
            });
        
        roomMate.address = person.address;
        
        this.assertIdentity(person.address, roomMate.address);
    },
    test06ProxiesReturnUndefinedForNotDefinedProperties: function() {
        var place = this.proxyFor({});
        
        this.assert(place.coordinates === undefined);
    },
    test07FunctionsCanBeProxied: function() {
        var func = this.proxyFor(function(a) {
            return 1;
        });
    
        this.assert(this.isProxy(func));
    },
    test08ArraysCanBeProxied: function() {
        var arr = this.proxyFor([]);
        
        arr[0] = this.proxyFor({});
        
        this.assert(this.isProxy(arr));
        this.assert(this.isProxy(arr[0]));
    },
    test09ProxiedMethodCanBeApplied: function() {
        var obj = this.proxyFor({prop: 24});

        obj.method = this.proxyFor(function(a) {
            return this.prop;
        });
        
        this.assert(obj.method(), 24);
    },
    test10ProxiedAnonymousFunctionCanBeApplied: function() {
        var func = this.proxyFor(function() {return 123});
        
        this.assertEquals(func(), 123);
    },
    test10ProtoLookupWorksOnProxies: function() {
        var proto = this.proxyFor({}),
            descendant = this.proxyFor(Object.create(proto));
        proto.prop = 15;
        
        this.assertEquals(descendant.prop, 15);
    },
    test11MethodFromPrototypeIsAppliedCorrectly: function() {
        var proto = this.proxyFor({}),
            descendant = this.proxyFor(Object.create(proto));
        
        proto.prop = 1;
        proto.method = this.proxyFor(function(a) {
            return this.prop;
        });
        
        this.assert(descendant.method(), 1);
        
        descendant.prop = 2;
        this.assert(descendant.method(), 2);
    },
    test12ProxyReturnsProxiedObjects: function() {
        var obj = {prop: {}},
            proxy = this.proxyFor(obj);
            
        this.assert(this.isProxy(proxy.prop));
    },
    test13MethodInvokationOnProxyReturnsProxy: function() {
        var ProxiedObject = this.proxyFor(Object),
            newObject = ProxiedObject.create({});
                        
        this.assert(this.isProxy(newObject));
    },
    test14ProxyHasCorrectProperties: function() {
        var obj = this.proxyFor({});
        obj.firstProperty = 'ein merkmal';
        
        this.assert('firstProperty' in obj);
        this.assertEquals(('undefinedProperty' in obj), false);
    },
    test15ProxyHasCorrectOwnProperties: function() {
        var proto = this.proxyFor({}),
            descendant = this.proxyFor(Object.create(proto));
            
        proto.protoProp = 12;
        descendant.ownProp = 24;
        
        this.assert(descendant.hasOwnProperty('ownProp'));
        this.assertEquals(descendant.hasOwnProperty('protoProp'), false);
    },
    test16GetOwnPropertyNames: function() {
        var person = this.proxyFor({}),
            student = this.proxyFor(Object.create(person));
            
        person.age = 21;
        student.averageGrade = 2;
        student.currentSemester = 3;
        
        this.assert(Object.getOwnPropertyNames(student).include('averageGrade'));
        this.assert(Object.getOwnPropertyNames(student).include('currentSemester'));
        this.assertEquals(Object.getOwnPropertyNames(student).include('age'), false);
    },
    test17ProxiedObjectsCanBeFrozen: function() {
        var obj = {},
            proxy = this.proxyFor(obj);
            
        this.assertEquals(Object.isFrozen(proxy), false);
                
        Object.freeze(proxy);
        
        this.assert(Object.isFrozen(proxy));
        this.assert(Object.isFrozen(obj));
    },
    test18ProxiedObjectsCanBeSealed: function() {
        var obj = {},
            proxy = this.proxyFor(obj);
            
        this.assertEquals(Object.isSealed(proxy), false);
            
        Object.seal(proxy);
        
        this.assert(Object.isSealed(proxy));
        this.assert(Object.isSealed(obj));
    },
    test19ExtensionsToProxiedObjectsCanBePrevented: function() {
        var obj = {},
            proxy = this.proxyFor(obj);
            
        this.assert(Object.isExtensible(proxy));
            
        Object.preventExtensions(proxy);
        
        this.assertEquals(Object.isExtensible(proxy), false);
        this.assertEquals(Object.isExtensible(obj), false);
    },
    test20GetPrototypeOfProxy: function() {
        var proto = this.proxyFor({}),
            descendant = this.proxyFor(Object.create(proto));
            
        this.assertEquals(Object.getPrototypeOf(descendant), proto);
    },
    test21ProxiedConstructorReturnsProxiedInstance: function() {
        var PersonType = function (name, age) {
                this.name = name;
                this.age = age;
            },
            ProxiedConstructor = this.proxyFor(PersonType),
            aPerson = new ProxiedConstructor('Joe', '19');
                
        this.assert(this.isProxy(aPerson));
        this.assertEquals(aPerson.name, 'Joe');
        this.assertEquals(aPerson.age, 19);
    },
    test22MethodCanBeAddedToPrototypeOfConstructor: function() {
        var instance,
            NewType = this.proxyFor(function() {
                this.prop = 12;
            });
        
        NewType.prototype.getProp = this.proxyFor(function() {
            return this.prop;
        });
        
        instance = new NewType();
        
            
        this.assert(this.isProxy(instance.getProp));
        this.assertEquals(instance.getProp(), 12);
    },
    
    // === PENDING ===
    // 
    // TODO: __proto__ slot is not working with proxies correctly
    //       see the following broken test case for details
    // 
    // test17ProxiesCanBePrototypes: function() {
    //     var proto = {a:3},
    //         protoProxy = this.proxyFor({a:3}),
    //         descendantObj = Object.create(proto);
    //     
    //     this.assertEquals(descendantObj.__proto__ === proto);
    //     this.assertEquals(descendantObj.__proto__ === protoProxy);
    //     this.assert(this.isProxy(descendantObj.__proto__));
    //     
    //     // all of the above assertions currently fail, however, the following doesn't fail:
    //     this.assertEquals(descendantObj.a, 3);
    //     
    //     // while __proto__ doesn't return the correct object it appears 
    //     // proto lookup still works correctly... :-/
    //     
    //     // // normally, without proxies, the example would look like this
    //     proto = {a:3};
    //     descendantObj = Object.create(proto);
    //     this.assertEquals(descendantObj.__proto__, proto); // correct assertion
    // },
    // test17PrototypeOfProxyCanBeChanged: function() {
    //     var originalPrototype = this.proxyFor({}),
    //         otherPrototype = this.proxyFor({}),
    //         descendant = this.proxyFor(Object.create(originalPrototype));
    //     
    //     originalPrototype.method = this.proxyFor(function() {return 1});
    //     otherPrototype.method = this.proxyFor(function() {return 2});
    //                             
    //     descendant.__proto__ = otherPrototype;
    //     
    //     // this.assertEquals(Object.getPrototypeOf(descendant), otherPrototype);
    //     this.assertEquals(descendant.method(), 2);
    // },
});
    
lively.versions.tests.TestCase.subclass(
'lively.versions.tests.ObjectVersioningTests.VersionsTests',
'testing', {
    setUp: function() {
        // global reset on each test (for now)
        lively.versions.ObjectVersioning.init();
    },
    test01CommitedVersion: function() {
        var person, versionBefore;
        
        person = this.proxyFor({});
        person.age = 23;
        
        versionBefore = this.commitVersion();
        
        person.age = 24;
        person.age = 25;
        
        // in the previous version:
        this.assertInVersion(function() {return person.age === 23}, versionBefore);
        // currently:
        this.assertInVersion(function() {return person.age === 25}, lively.CurrentObjectTable);
    },
    test02VersionsOfAnArray: function() {
        var arr, versionBefore;
        
        arr = this.proxyFor([]);
        
        arr[0] = 1;
        
        versionBefore = this.commitVersion();
        
        arr[0] = 2;
        arr[1] = 2;
                
        // in the previous version:
        this.assertInVersion(function() {return arr[0] === 1}, versionBefore);
        this.assertInVersion(function() {return arr[1] === undefined}, versionBefore);
        // currently:
        this.assertInVersion(function() {return arr[0] === 2}, lively.CurrentObjectTable);
        this.assertInVersion(function() {return arr[1] === 2}, lively.CurrentObjectTable);
    },
    test03ChangesAfterCommitCanBeUndone: function() {
        var app = this.proxyFor({});
        app.counter = 1;
        
        this.commitVersion();
        
        app.counter = 2;
        
        this.undo();
        
        this.assertEquals(app.counter, 1);
    },
    test04ChangesToCompoundPropertyCanBeUndone: function() {
        var app = this.proxyFor({});
        app.view = this.proxyFor({});
        app.view.color = 'red';
        
        this.commitVersion();
        
        app.view.color = 'green';
        
        this.undo();
        
        this.assertEquals(app.view.color, 'red');
    },
    test05PropertyCreationCanBeUndone: function() {
        var obj = this.proxyFor({});
        
        this.commitVersion();
        
        obj.isPropertyDefined = true;
        
        this.undo();
        
        this.assert(obj.isPropertyDefined === undefined);
    },
    test06UndoneChangesCanBeRedone: function() {
        var address = this.proxyFor({});
        address.street = 'Meanstreet';
        address.city = 'Chicago';
        
        this.commitVersion();
        
        this.undo();
        this.redo();
        
        this.assertEquals(address.city, 'Chicago');
    },
    test07UndonePropertyAdditionCanBeRedone: function() {
        var address = this.proxyFor({});
        this.commitVersion();
        address.street = 'Meanstreet';
        this.commitVersion();
        address.city = 'Chicago';
        
        this.undo();
        this.undo();
        this.redo();
        
        this.assertEquals(address.street, 'Meanstreet');
        this.assert(address.city === undefined);
    },
    
    // === PENDING ===
    // 
    // TODO: first fix the pending __proto__ test cases of ProxyTests
    //
    // test07ChangingPrototypeUndone: function() {
    //     var originalPrototype = this.proxyFor({}),
    //         otherPrototype = this.proxyFor({}),
    //         descendant = this.proxyFor(Object.create(originalPrototype));
    //     
    //     this.commitVersion();
    //     
    //     descendant.__proto__ = otherPrototype;
    //     
    //     this.undo();
    //     
    //     this.assertEquals(Object.getPrototypeOf(descendant), originalPrototype);
    // },
    // test08UndoingPrototypeChangeIsEffective: function() {
    //     var originalPrototype = this.proxyFor({}),
    //         otherPrototype = this.proxyFor({}),
    //         descendant = this.proxyFor(Object.create(originalPrototype));
    //     
    //     originalPrototype.method = this.proxyFor(function() {return 1});
    //     otherPrototype.method = this.proxyFor(function() {return 2});
    //     
    //     this.commitVersion();
    //     
    //     descendant.__proto__ = otherPrototype;
    //             
    //     this.undo();
    //     
    //     this.assertEquals(descendant.method(), 1);
    // },
});

lively.versions.tests.TestCase.subclass(
'lively.versions.tests.ObjectVersioningTests.SourceTransformationTests',
'testing',{
   test01ObjectLiterals: function() {
        var input = 'var obj = {}',
            expectedOutput = 'var obj = lively.versions.ObjectVersioning.proxy({})';
        
        this.assertEquals(this.transform(input), expectedOutput);
   },
   test02ArrayLiterals: function() {
       var input = 'var arr = []',
            expectedOutput = 'var arr = lively.versions.ObjectVersioning.proxy([])';
        
        this.assertEquals(this.transform(input), expectedOutput);
   },
   test03FunctionLiteral: function() {
       var input = 'var func = function() {\nreturn 12;\n}',
            expectedOutput = 'var func = lively.versions.ObjectVersioning.proxy(function() {\nreturn 12\n})';
                
        this.assertEquals(this.transform(input), expectedOutput);
   },
   test04IndicatesFailureOnSyntaxError: function() {
       var incorrectInput = '{ problem: "object misses a comma" before: "second property"';
       
       this.assertRaises((function() {
           this.transform(incorrectInput);
        }).bind(this));
   },
   test05BiggerExample: function() {
       var input = 
"var joe = {    \
    name: 'Joe', \
    age: 25, \
    address: { \
        street: 'Mainstr. 20', \
        zipCode: '12125' \
    }, \
    friends: [], \
    becomeFriendsWith: function(otherPerson) { \
        this.friends.push(otherPerson.name); \
    }, \
    isFriendOf: function(otherPerson) { \
        return this.friends.include(otherPerson.name); \
    } \
}";
    var expectedOutput = 'var joe = lively.versions.ObjectVersioning.proxy({"name": "Joe","age": 25,"address": lively.versions.ObjectVersioning.proxy({"street": "Mainstr. 20","zipCode": "12125"}),"friends": lively.versions.ObjectVersioning.proxy([]),"becomeFriendsWith": lively.versions.ObjectVersioning.proxy(function(otherPerson) {\n\
this["friends"]["push"](otherPerson["name"])\n\
}),"isFriendOf": lively.versions.ObjectVersioning.proxy(function(otherPerson) {\n\
return this["friends"]["include"](otherPerson["name"])\n\
})})'

    this.assertEquals(this.transform(input), expectedOutput);
   }
});

});
