(function () {

  var vm    = require('vm'),
    util    = require('util'),
    jshint  = require('jshint').JSHINT,
    _       = require('underscore'),
    db      = require('../conf/db.js'),
    env     = require('../conf/properties.js'),
    EventEmitter = require('events').EventEmitter,
    events  = new EventEmitter();

  // ========
  // ROUTES

  /**
   * Handle subroutine invocation via GET request
   */
  module.exports.get = function(req, res) {

    bindHttpResponseHandlers(req, res);

    db.getSubroutine(req.params.key).then(
      function(subroutine) {
        invokeSubroutine(
          subroutine[0],
          _(req.query).extend({ key: req.params.key })
        );
      },
      function(err) {
        res.json({
          error: util.format(env.strings.NotFoundErrorMsg, req.params.key)
        });
      });
  };

  /**
   * Handle subroutine update via PUT
   * TODO implement
   */
  module.exports.put = function(req, res) {
    res.json({ msg: 'not yet implemented' });
  };

  /**
   * Handle subroutine submission via POST
   */
  module.exports.post = function(req, res) {
    var js = '', jsWrapper;
    req.on('data', function(chunk) { js += chunk; });
    /**
     * check js syntax; reject if not valid js
     */
    req.on('end', function() {
      try {
        vm.createScript(buildJavascriptWrapper(js, { }));
        db.insertSubroutine(js).then(
          function(obj) {
            res.json({ key: db.encode(obj[0]) });
          },
          function(err) {
            res.json(err);
          });
      }
      catch (e) {
        /**
         * run through jshint for finer error resolution
         */
        var hints = jshint(js);
        res.json({
          error: env.strings.CompileErrorMsg,
          exception: e.message,
          jshint: jshint.errors
        });
      }
    });
  };

  // ========
  // SUBROUTINE HELPER FUNCTIONS

  /**
   * Executes a subroutine. URL Query String arguments are passed into the 
   * function as an object.
   *
   * @param {Object}  subroutine object from database
   * @param {Object}  query from url string
   * @returns result of function
   */
  function invokeSubroutine (subroutine, query) {
    var sandbox = buildSandbox(subroutine, query),
        jsWrapper = buildJavascriptWrapper(subroutine.js),
        t1, t2;

    bindSubroutineHandlers(subroutine, sandbox);

    process.once('uncaughtException', function(e) {
      sandbox.events.emit(env.events.SubroutineException, {
        error: env.strings.RuntimeErrorMsg,
        exception: e.message,
        sandbox: _(sandbox).omit([ '_', 'rest', 'events', 'startTime' ]),
        stack: trimStacktrace(e.stack.split('\n')),
        source: subroutine.js.split('\n')
      });
    });

    sandbox.startTime = new Date().valueOf();
    vm.runInNewContext(jsWrapper, sandbox);
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
  function buildJavascriptWrapper (js) {
    return "__result = "+ "(" + js + ")(query);";
  }

  /**
   * Construct the subroutine's context; the subroutine's 'this' will comprise
   * the returned object.
   * 
   * @param {Object}  subroutine object from database
   * @param {Object}  the parameter object passed in from the caller
   * @return {Object} subroutine sandbox
   */
  function buildSandbox (subroutine, query) {
    return {
      // basics
      runCount: subroutine.run_count + 1,
      lastRun: subroutine.last_run,
      query: query,

      // time the subroutine execution; temporary
      startTime: null,

      // include some basic functions
      setTimeout: setTimeout,

      // include some libraries
      _:    require('underscore'),
      rest: require('node-rest-client').Client,

      // setup handler to catch the 'subroutine:return' event
      events: new EventEmitter()
    };
  }

  /**
   * Bind event listeners to the subroutine's environment.
   */
  function bindSubroutineHandlers (subroutine, sandbox) {
    sandbox.events.once(
      env.events.SubroutineReturn,
      handleSubroutineReturn.bind(undefined, subroutine, sandbox)
    );
    sandbox.events.once(
      env.events.SubroutineException,
      handleSubroutineException.bind(undefined, subroutine, sandbox)
    );

  }

  /**
   * Handle the 'subroutine:return' event.
   */
  function handleSubroutineReturn (subroutine, sandbox, event) {
    db.updateSubroutineMetadata(subroutine.id);

    var endTime = new Date().valueOf();
    events.emit(env.events.RespondOk, _(event).extend({
      status: env.strings.SuccessMsg,
      runTime: endTime - sandbox.startTime,
      lastRun: sandbox.lastRun,
      query: sandbox.query
    }));
  }

  /**
   * Handle 'subroutine:exception' event.
   */
  function handleSubroutineException (subroutine, sandbox, event) {
    db.updateSubroutineMetadata(subroutine.id);

    var endTime = new Date().valueOf();
    events.emit(env.events.RespondError, _(event).extend({
      runTime: endTime - sandbox.startTime,
    }));
  }

  /**
   * Bind http response listeners.
   */
  function bindHttpResponseHandlers (req, res) {
    events.once(env.events.RespondOk, function (event) {
      res.json(event);
    });
    events.once(env.events.RespondError, function (event) {
      res.json(event);
    });
  }
})();
