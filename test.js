const app = require("./application");
const fs = require("fs");
let server = new app();
server.createSecureServer(
    fs.readFileSync("./localhost.key"),
    fs.readFileSync("./localhost.crt"),
);

server.use(async (ctx, next) => {
    // console.log(ctx.formData);
    ctx.res.on("data", chunk => console.log(chunk.toString()));
    ctx.body = "123";
});
server.listen(443);
