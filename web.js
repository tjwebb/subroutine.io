var util      = require('util'),
  express     = require('express'),
  subroutine  = require('./routes/subroutine.js'),
  cors        = require('cors'),
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
app.use(cors());

app.post('/',     subroutine.post);
app.post('/:key', subroutine.post);
app.get ('/:key', subroutine.get);
app.put ('/:key', subroutine.put);

// enable cors
app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log('Listening on port ' + port);
});
