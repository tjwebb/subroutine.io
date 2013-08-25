subroutine.io
========

**POST a self-executing javascript function. GET the result.**

### Dependencies ###
- node 0.10.x
- npm 1.3.x

### Local Development ###
1. `npm install`. 
2. `nodemon web.js`

#### Examples ####
You can import subroutine.io examples into Postman: http://www.getpostman.com/

1. Get the Postman config: https://www.getpostman.com/collections/ef6d0847f12cbb1ad3f3
2. Import and check out the examples.

### Usage ###
1. Create new subroutine:
- Request: `POST api.subroutine.io`
- Body: <pre>
    (function() {
        var message = ["hello", "world", "!!!"];
        return message.join(" ");
    })();
</pre>
- Response: <pre>
  {
    hash: "RhBMiz7iKekh"
  }
</pre>

2. Invoke existing subroutine:
- Request: `GET api.subroutine.io/RhBMiz7iKekh`
- Response: <pre>
  {
    run_count: 15,
    result: "hello world !!!"
  }
</pre>
