# twng
packge have one pem file and one test file;
---
test.js
```
const app = require("twng");
const fs = require("fs");
let server = new app();
server.createSecureServer(
    fs.readFileSync("./localhost-privkey.pem"),
    fs.readFileSync("./localhost-cert.pem"),
);

server.use(async (ctx, next) => {
    ctx.body ="123";
});
server.listen(443);
```
---
