const HTTP = require("http2");
const URL = require("url");
const path = require("path");
const fs = require("fs");
module.exports = class Application {
    constructor(server) {
        this.server = server;
        this.index = [];

    }

    createSecureServer(key, cert) {
        this.server = HTTP.createSecureServer({
            key: key,
            cert: cert
        }).on("stream", this.callback())
    }

    creatServer() {
        this.server = HTTP.createServer().on("stream", this.callback());
    }

    listen(port = 403) {
        const server = this.server || HTTP.createServer();
        server.on("error", err => {
            console.log(err);
        });
        return server.listen(port);
    }

    compose(middleware) {
        if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!');
        for (const fn of middleware) {
            if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!')
        }
        return function (context, next) {
            let index = -1;
            return dispatch(0);

            function dispatch(i) {
                if (i <= index) return Promise.reject(new Error('next() called multiple times'));
                index = i;
                let fn = middleware[i];
                if (i === middleware.length) fn = next;
                if (!fn) return Promise.resolve();
                try {
                    return Promise.resolve(fn(context, function next() {
                        return dispatch(i + 1)
                    }))
                } catch (err) {
                    return Promise.reject(err)
                }
            }
        }
    }
    respond(ctx) {
        if (false === ctx.respond) return;
        const res = ctx.res;
        let body = ctx.body;
        const code = ctx.status;
        if ('HEAD' === ctx.method) {
            if (!res.headersSent && this.isJSON(body)) {
                ctx.length = Buffer.byteLength(JSON.stringify(body));
            }
            return res.end();
        }
        if (null === body) {
            body = ctx.message || String(code);
            if (!res.headersSent) {
                ctx.type = 'text';
                ctx.length = Buffer.byteLength(body);
            }
            return res.end(body);
        }
        if (Buffer.isBuffer(body)) {
            return res.end(body);
        }
        if ("string" === typeof body) {
            res.respond({
                "content-type": "text/html"
            });
            return res.end(body);
        }
        if (body instanceof Stream) {
            return body.pipe(res);
        }
        body = JSON.stringify(body);
        if (!res.headersSent) {
            ctx.length = Buffer.byteLength(body);
        }
        res.end(body);
    }

    callback() {
        const fn = this.compose(this.index);
        return (stream, header) => {
            const ctx = this.createContext(stream, header);
            fn(ctx).then(() => this.respond(ctx));
        }
    }

    createContext(stream, header) {
        const context = Object;
        context.res = stream;
        context.on  = stream.on;
        context.res.respond = stream.respond;
        context.respond = stream.respond;
        context.body = "";
        context.querystring = this.querystring(header[":path"]);
        context.method = header[":method"];
        context.url = header[":path"];
        context.path = header[":path"];
        context.schema = header[":schema"];
        context.user_agent = header["user-agent"];
        context.accept = header["accept-agent"];
        return context;
    }

    querystring(url) {
        const query = URL.parse(url, true);
        return query.query;
    }

    onerror() {
        this.server.on("error", err => console.log(err))
    }

    isJSON(body) {
        if (!body) return false;
        if ('string' == typeof body) return false;
        if ('function' == typeof body.pipe) return false;
        if (Buffer.isBuffer(body)) return false;
        return true;
    }

    use(fn) {
        if (typeof fn !== "function") throw new TypeError("it's not a function");
        if (!this.isFunction(fn)) {
            return new TypeError("not a function")
        }
        this.index.push(fn);
        return this;
    }

    isFunction(fn) {
        let isFnRegex = /^\s*(?:function)?\*/;
        let toStr = Object.prototype.toString;
        let fnToStr = Function.prototype.toString;
        let hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';
        if (typeof fn !== 'function') {
            return false;
        }
        if (isFnRegex.test(fnToStr.call(fn))) {
            return true;
        }
        if (!hasToStringTag) {
            let str = toStr.call(fn);
            return str === '[object GeneratorFunction]';
        }
        return true;
    }
};
