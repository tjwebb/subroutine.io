## POST a javascript function. GET the result. ##
- <a style='font-size: 1.25em; font-family: Monaco, Monospace;' href='http://www.subroutine.io'>www.subroutine.io</a>
- <a style='font-size: 1.25em; font-family: Monaco, Monospace;'  href='http://api.subroutine.io'>api.subroutine.io</a>

## Dependencies ##
- node 0.10.x
- npm 1.3.x

## Local Development ##
1. `npm install`. 
2. `nodemon web.js`

### Examples ###
You can import subroutine.io examples into Postman: http://www.getpostman.com/

1. Get the [subroutine.io Postman config.](https://www.getpostman.com/collections/ef6d0847f12cbb1ad3f3)
2. Import and check out the examples.

## Usage ##
1. Create new subroutine:
    - Request: `POST api.subroutine.io`
    - POST Body: <pre>
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
    - [Run this function!](http://api.subroutine.io/RhBMiz7iKekh)
