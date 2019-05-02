const app = require("./application");
const fs = require("fs");
let server = new app();
server.createSecureServer(
    fs.readFileSync("./localhost-privkey.pem"),
    fs.readFileSync("./localhost-cert.pem"),
);

let f = 0.0;
server.use(async (ctx, next) => {
    ctx.body ="123";
});
server.listen(443);