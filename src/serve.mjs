/*
 * 2022 Tarpeeksi Hyvae Soft
 *
 * Software: hs
 * 
 */

import * as http from "http";
import * as process from "process";
import {routes} from "./routes.mjs";

const server = http.createServer(async function(request, response) {
    try {
        await (routes[request.url] || routes["default"])(request, response);
    }
    catch (error) {
        console.error(error);
        response.statusCode = 500;
        response.setHeader("Content-Type", "text/plain; charset=utf-8");
        response.setHeader("Content-Security-Policy", "default-src 'self';");
        response.end("Something went wrong while processing your request.");
    }

    return;
});

server.listen(process.env.PORT || process.argv[3] || 8777);
if (!server.listening) {
    throw new Error("Failed to start the server.");
}
console.log(`hs listening on port ${server.address().port}...`);
