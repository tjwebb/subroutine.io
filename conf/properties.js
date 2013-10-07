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
    SubroutineReturn:     'subroutine:return',
    SubroutineException:  'subroutine:exception',
    RespondOk:            'respond:200',
    RespondError:         'respond:500',
    RespondNotFound:      'respond:404'
  }
};
