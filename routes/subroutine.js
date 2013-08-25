var vm    = require('vm'),
  util    = require('util'),
  jshint  = require('jshint').JSHINT,
  db      = require('../conf/db.js');

exports.get = function(req, res) {
  function invokeSubroutine(subroutine) {
    var sandbox = {
      run_count: subroutine.run_count + 1,
      //last_run: subroutine.last_run
    };
    vm.runInNewContext('result = '+ subroutine.js, sandbox);
    db.incrementSubroutineRunCount(subroutine.id);
    return sandbox;
  }
  db.getSubroutine(req.params.hash).then(
    function(subroutine) {
      res.json(invokeSubroutine(subroutine[0]));
    },
    function(err) {
      res.json({
        error: 'could not find subroutine '+ req.params.hash
      });
    });
};
exports.put = function(req, res) {
  res.json('put');
};
exports.post = function(req, res) {
  var js = '';
  req.on('data', function(chunk) { js += chunk; });
  req.on('end', function() {
    // check js syntax; reject if not valid js
    try {
        vm.createScript(js);
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
        res.json({ hash: db.encode(obj[0]) });
      },
      function(err) {
        res.json(err);
      });
  });
};
