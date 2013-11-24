module.exports = {
	salt: process.env.SUBROUTINE_SALT,
	keyLength: 12,

  constants: {
    subroutineTimeout: 20000
  },

  strings: {
    SuccessMsg: 'subroutine ran successfully',
    RuntimeErrorMsg: 'subroutine.io runtime error',
    CompileErrorMsg: 'subroutine.io compile error',
    NotFoundErrorMsg: 'subroutine [%s] not found'
  },

  events: {
    RETURN:     'subroutine:return',
    EXCEPTION:  'subroutine:exception',
    http: {
      OK:         'respond:200',
      ERROR:      'respond:500',
      NOTFOUND:   'respond:404'
    }
  },

  datasource: {
    development: {
      host:     'localhost',
      port:     5432,
      database: 'subroutine',
      user:     'subroutine',
      password: 'io'
    },
    production: {
      host:     process.env.SUBROUTINE_PG_HOST,
      port:     process.env.SUBROUTINE_PG_PORT,
      database: process.env.SUBROUTINE_PG_DB,
      user:     process.env.SUBROUTINE_PG_USER,
      password: process.env.SUBROUTINE_PG_PASS
    }
  }
};
