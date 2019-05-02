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
        }).on("stream", this.callback());
    }

    creatServer() {
        this.server = HTTP.createServer().on("stream", this.callback());
    }

    listen(port = 403) {
        const server = this.server || HTTP.createServer();
        this.server.on("error", err => {
            console.log(err);
        });
        return server.listen(port);
    }

    compose(index) {
        for (let fn of index) {
            if (typeof fn !== "function") throw  new TypeError("it's not a function")
        }
        return function (context, next) {
            // last called middleware #
            let tindex = -1;
            return dispatch(0);

            function dispatch(i) {
                if (i <= tindex) return Promise.reject(new Error('next() called multiple times'));
                tindex = i;
                let fn = index[i];
                if (i === index.length) fn = next;
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
        const res = ctx.res; //server
        // if (!ctx.writable) return;
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
            // console.log(1);
            // res.respond({
            //     "content-type":"image/jpeg"
            // });
            // res.respond();
            return res.end(body);
        }
        if ("string" === typeof body) {
            res.respond({
                "content-type":"text/html"
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
            // console.log(header.statusCode);
            // stream.statusCode = 404;
            const ctx = this.createContext(stream, header);
            // const onerror = err => ctx.onerror(err);
            fn(ctx).then(() => this.respond(ctx));
        }
    }

    createContext(stream, header) {
        const context = Object;
        console.log(stream);
        context.res = stream;
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

    onerror(err) {
        console.log(err);
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
        // this.server.on("stream", fn);
        this.index.push(fn);
        return this;
    }
};
