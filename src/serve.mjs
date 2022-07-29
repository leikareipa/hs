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
        const matchingRouteKey = Object.keys(routes).find(key=>new RegExp(key, "i").test(request.url));
        await routes[matchingRouteKey](request, response)
    }
    catch (error) {
        console.error(error);
        response.statusCode = 500;
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.setHeader("Content-Security-Policy", "default-src 'self';");
        response.end(`The following error was encountered while processing your request: ${error}`);
    }

    return;
});

server.listen(process.env.PORT || process.argv[3] || 8777);
if (!server.listening) {
    throw new Error("Failed to start the server.");
}
console.log(`hs listening on port ${server.address().port}...`);
