(function () {
  var vm    = require('vm'),
    util    = require('util'),
    jshint  = require('jshint').JSHINT,
    db      = require('../conf/db.js');

  module.exports.get = function(req, res) {
    db.getSubroutine(req.params.hash).then(
      function(subroutine) {
        res.json(invokeSubroutine(subroutine[0], req.query));
      },
      function(err) {
        res.json({
          error: 'could not find subroutine '+ req.params.hash
        });
      });
  };
  module.exports.put = function(req, res) {
    res.json('put');
  };
  module.exports.post = function(req, res) {
    var js = '', jsWrapper;
    req.on('data', function(chunk) { js += chunk; });
    req.on('end', function() {
      // check js syntax; reject if not valid js
      try {
          vm.createScript(buildJavascriptWrapper(js, { }));
      }
      catch (e) {
        // run through jshint for finer error resolution
        var hints = jshint(js);
        res.json({
          error: 'could not compile',
          exception: e.message,
          jshint: jshint.errors
        });
        return;
      }
      db.insertSubroutine(js).then(
        function(obj) {
          res.json({ key: db.encode(obj[0]) });
        },
        function(err) {
          res.json(err);
        });
    });
  };


  /**
   * invokeSubroutine
   *
   * Executes a subroutine. URL Query String arguments are passed into the 
   * function as an object.
   *
   * @param {Object}  subroutine object from database
   * @param {Object}  query from url string
   * @returns result of function
   */
  function invokeSubroutine (subroutine, query) {
    var sandbox = buildSandbox(subroutine, query);
    var jsWrapper = buildJavascriptWrapper(subroutine.js, query);

    try {
      vm.runInNewContext(jsWrapper, sandbox);
      db.updateSubroutineMetadata(subroutine.id);

      return sandbox.__result;
    }
    catch (e) {
      return {
        error: 'subroutine.io runtime error',
        exception: e.message,
        sandbox: sandbox,
        stack: trimStacktrace(e.stack.split('\n')),
        source: subroutine.js.split('\n')
      };
    }
  }

  /**
   * Trims stacktrace to only return activation records 'above' the
   * invokeSubroutine function call.
   */
  function trimStacktrace (stack) {
    var trimmedStack = [ ];

    // XXX not sure why underscore functions don't seem to work with the 
    // stack trace. good 'ol for loop to the rescue.
    for (var i = 0; i < stack.length; i++) {
      trimmedStack.push(stack[i]);
      if (stack[i].indexOf("invokeSubroutine") !== -1) break;
    }
    return trimmedStack;
  }

  /**
   * buildJavascriptWrapper
   *
   * Code that surrounds the subroutine. Invoked in the context of the sandbox.
   */
  function buildJavascriptWrapper (js, query) {
    return "__result = "+ "(" + js + ")(query);";
  }

  /**
   * buildSandbox
   *
   * @param {Object}  subroutine object from database
   * @param {Object}  the parameter object passed in from the caller
   * @return {Object} subroutine sandbox
   */
  function buildSandbox (subroutine, query) {
    return {
      // basics
      run_count: subroutine.run_count + 1,
      last_run: subroutine.last_run,
      query: query,

      // include some libraries
      _:      require('underscore'),
      client: require('node-rest-client').Client
    };
  }
})();
