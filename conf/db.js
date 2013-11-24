var util  = require('util'),
  color = require('cli-color'),
  _ = require('underscore'),
  Hashids = require('hashids'),
  crypto  = require('crypto'),
  Knex  = require('knex'),
  env = require('../conf/properties.js');

module.exports = (function() {
  var store, hashids;

  /**
   * Initialize the subroutine table
   */
  function createTableIfNotExists() {
    store.schema.hasTable('subroutine').then(
      function(exists) {
        if (exists) {
          util.log(color.green('[db] subroutine table already exists'));
          return;
        }
        store.schema.createTable('subroutine', function(table) {
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
    decode: function(key) {
      return hashids.decrypt(key)[0];
    },
    getSubroutine: function(key) {
      return store('subroutine')
        .where('id', this.decode(key))
        .returning('id');
    },
    
    /**
     * After a subroutine is invoked, update its statistics
     */
    updateSubroutineMetadata: function(id) {
      store('subroutine')
        .where('id', id)
        .update({ 'last_run': new Date() })
        .then();

      store('subroutine')
        .where('id', id)
        .increment('run_count', 1)
        .then();
    },

    /**
     * Persist a new subroutine.
     */
    insertSubroutine: function(js) {
      var now = new Date();
      return store('subroutine').insert({
        js: js,
        created: now,
        last_run: now
      }, 'id');
    },
    init: function() {
      hashids = new Hashids(env.salt, env.keyLength);
      store = new Knex.initialize({
        client: 'pg',
        debug: false,
        connection: _.extend({
          charset: 'utf8',
          ssl: true
        }, env.datasource[process.env.NODE_ENV])
      });
      util.log(color.cyan('[db] Initialized Datastore with Knex.'));
      createTableIfNotExists();
    }
  };
})();
