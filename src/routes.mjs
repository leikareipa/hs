/*
 * 2022 Tarpeeksi Hyvae Soft
 *
 * Software: hs
 * 
 */

import * as fs from "fs";
import {templates as htmlTemplate} from "./templates.mjs";
import {csp} from "./csp.mjs";

const inputFileName = (process.argv[2] || "./hs.json");

export const routes = {
    "/robots.txt": async function(request, response) {
        const text = htmlTemplate["robots.txt"]();

        response.statusCode = 200;
        response.setHeader("Content-Type", "text/plain; charset=utf-8");
        response.end(text);
    },
    "/favicon.ico": async function(request, response) {
        const iconData = htmlTemplate["favicon.ico"]();

        response.statusCode = 200;
        response.setHeader("Content-Type", "image/x-icon");
        response.setHeader("Content-Length", iconData.length);
        response.end(iconData);
    },
    "/": async function(request, response) {
        const input = JSON.parse(fs.readFileSync(inputFileName, "utf8"));
        const io = (await import(`./database-${input.database.type}.mjs`));
        const store = input.stores[0];
        const products = await Promise.all(input.products.map(async(product)=>{
            return {
                ...product,
                data: await io.get_saved_product_data({product, store, input}),
            }
        }));

        const {cspNonces, cspString} = csp();

        const html = htmlTemplate["index.html"]({
            products,
            nonces: cspNonces,
            description: (input.description || "No description"),
        });

        response.statusCode = 200;
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.setHeader("Content-Security-Policy", cspString);
        response.end(html);
    },
    default: function(request, response) {
        response.statusCode = 404;
        response.end();
    },
};
