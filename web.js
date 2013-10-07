var util      = require('util'),
  express     = require('express'),
  subroutine  = require('./routes/subroutine.js'),
  color       = require('cli-color'),
  db          = require('./conf/db.js');

process.on('uncaughtException', function(err) {
  util.log(color.red('[main] uncaught exception: '+ err.stack));
});

db.init();

var app = express();
app.use(express.logger());
app.use(express.bodyParser());
app.use(express.methodOverride());

app.post('/', subroutine.post);
app.get ('/:key', subroutine.get);
app.put ('/:key', subroutine.put);

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log('Listening on port ' + port);
});
