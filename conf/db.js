var util  = require('util'),
  color = require('cli-color'),
  Hashids = require('hashids'),
  crypto  = require('crypto'),
  Knex  = require('knex'),
  props = require('../conf/properties.js');

module.exports = (function() {
  var store, hashids;

  function createTableIfNotExists() {
    store.Schema.hasTable('subroutine').then(
      function(exists) {
        if (exists) {
          util.log(color.cyan('[db] subroutine table already exists'));
          return;
        }
        store.Schema.createTable('subroutine', function(table) {
          table.increments('id').primary().index();
          table.text('js');
          table.integer('run_count').defaultTo(0);
          table.timestamp('created');
          table.timestamp('last_run');
        }).then(
          function() {
            util.log(color.cyan('[db] Created subroutine table.'));
          },
          function(err) {
            util.log(color.red('[db] Could not create subroutine table: '+ err.stack));
          }
        );
      },
      function(err) {
        util.log(color.red('[db] Could not check subroutine table: '+ err.stack));
      }
    );
  }
  return {
    encode: function(id) {
      return hashids.encrypt(id);
    },
    decode: function(hash) {
      return hashids.decrypt(hash)[0];
    },
    getSubroutine: function(hash) {
      return store('subroutine')
        .where('id', this.decode(hash))
        .returning('id', 'js', 'run_count');
    },
    incrementSubroutineRunCount: function(id) {
      return store('subroutine')
        .where('id', id)
        .increment('run_count', 1)
        .exec();
    },
    insertSubroutine: function(js) {
      var now = new Date();
      return store('subroutine').insert({
        js: js,
        created: now,
        last_run: now
      }, 'id');
    },
    init: function() {
      hashids = new Hashids(props.salt, props.hashLength);
      store = new Knex.Initialize({
        client: 'pg',
        //debug: true,
        connection: {
          host: process.env.SUBROUTINE_PG_HOST,
          port: process.env.SUBROUTINE_PG_PORT,
          user: process.env.SUBROUTINE_PG_USER,
          password: process.env.SUBROUTINE_PG_PASS,
          database: process.env.SUBROUTINE_PG_DB,
          charset: 'utf8',
          ssl: true
        }
      });
      util.log(color.cyan('[db] Initialized Datastore with Knex.'));
      createTableIfNotExists();
    }
  };
})();
