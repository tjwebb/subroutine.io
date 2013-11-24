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
    console.log('get');

    bindHttpResponseHandlers(req, res);

    db.getSubroutine(req.params.key).then(
      function(subroutine) {
        invokeSubroutine(subroutine[0], req.query);
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
    console.log('invokeSubroutine');
    var sandbox = buildSandbox(subroutine, query),
        jsWrapper = buildJavascriptWrapper(subroutine.js),
        t1, t2;

    bindSubroutineHandlers(subroutine, sandbox);

    sandbox.meta.startTime = new Date().valueOf();
    try {
      vm.runInNewContext(jsWrapper, sandbox);
    }
    catch (e) {
      sandbox.events.emit(env.events.EXCEPTION, {
        error: env.strings.RuntimeErrorMsg,
        exception: e.message,
        sandbox: _(sandbox).omit([ '_', 'rest', 'emit', 'meta' ]),
        stack: trimStacktrace(e.stack.split('\n')),
        source: lineMapSource(subroutine.js.split('\n'))
      });
    }
  }

  /**
   * Given an array of source code lines, create an object where line numbers
   * map to code lines.
   */
  function lineMapSource (lines) {
    return _.object(_.range(1, lines.length + 1), lines);
  }

  /**
   * Trims stacktrace to only return activation records 'above' the
   * invokeSubroutine function call.
   */
  function trimStacktrace (stack) {
    var trimmedStack = [ ];

    // XXX not sure why underscore functions don't seem to work with the 
    // stack trace. I think it's not a legit array. good 'ol for loop to the
    // rescue.
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
    return js + "\nmain(query);";
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
    var emitter = new EventEmitter();
    return {
      // basics
      meta: {
        runCount: subroutine.run_count + 1,
        lastRun: subroutine.last_run,
        // time the subroutine execution; temporary
        startTime: null
      },

      query: query,

      // include some basic functions
      setTimeout: setTimeout,

      // include some libraries
      _:    require('underscore'),
      rest: require('node-rest-client').Client,
      xml:  require('xml'),

      // setup handler to catch events fired from the subroutine
      events: emitter,
      emit: emitter.emit,
      RETURN:    env.events.RETURN,
      EXCEPTION: env.events.EXCEPTION
    };
  }

  /**
   * Bind event listeners to the subroutine's environment.
   */
  function bindSubroutineHandlers (subroutine, sandbox) {
    console.log('bindSubroutineHandlers');
    sandbox.events.once(
      env.events.RETURN,
      _.partial(handleSubroutineReturn, subroutine, sandbox)
    );
    sandbox.events.once(
      env.events.EXCEPTION,
      _.partial(handleSubroutineException, subroutine, sandbox)
    );
  }

  /**
   * Handle the 'subroutine:return' event.
   */
  function handleSubroutineReturn (subroutine, sandbox, result) {
    console.log('handleSubroutineReturn');
    console.log(result);
    db.updateSubroutineMetadata(subroutine.id);

    events.emit(env.events.http.OK, {
      status: env.strings.SuccessMsg,
      ms: new Date().valueOf() - sandbox.meta.startTime,
      lastRun: sandbox.lastRun,
      query: sandbox.query,
      result: result
    });
  }

  /**
   * Handle 'subroutine:exception' event.
   */
  function handleSubroutineException (subroutine, sandbox, error) {
    db.updateSubroutineMetadata(subroutine.id);

    events.emit(env.events.http.ERROR, {
      ms: new Date().valueOf() - sandbox.meta.startTime,
      error: error
    });
  }

  /**
   * Bind http response listeners.
   */
  function bindHttpResponseHandlers (req, res) {
    console.log('bindHttpResponseHandlers');
    events.once(env.events.http.OK, function (e) {
      res.json(_.extend({ code: 200 }, e));
    });
    events.once(env.events.http.ERROR, function (e) {
      res.json(_.extend({ code: 500 }, e));
    });
  }
})();
