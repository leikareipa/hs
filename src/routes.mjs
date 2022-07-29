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
    "^/robots.txt$": async function(request, response) {
        const text = htmlTemplate["robots.txt"]();
        
        response.statusCode = 200;
        response.setHeader("Content-Type", "text/plain; charset=utf-8");
        response.end(text);
    },

    "^/favicon.ico$": async function(request, response) {
        const iconData = htmlTemplate["favicon.ico"]();

        response.statusCode = 200;
        response.setHeader("Content-Type", "image/x-icon");
        response.setHeader("Content-Length", iconData.length);
        response.end(iconData);
    },

    "^/": async function(request, response) {
        const input = JSON.parse(fs.readFileSync(inputFileName, "utf8"));
        const io = (await import(`./database-${input.database.type}.mjs`));
        const options = {
            startTimestamp: 0,
            endTimestamp: Date.now(),
        };

        // Parse the user-submitted parameters, if any.
        const restParams = request.url.split("/").filter(e=>e.trim().length);
        while (restParams.length)
        {
            const param = restParams.shift();

            switch (param) {
                case "from": {
                    if (!restParams.length) {
                        throw "The parameter 'from' is missing data.";
                    }

                    const date = Date.parse(restParams.shift());
                    if (Number.isNaN(date)) {
                        throw "The parameter 'from' has invalid data.";
                    }

                    options.startTimestamp = date;
                    
                    break;
                }
                case "to": {
                    if (!restParams.length) {
                        throw "The parameter 'to' is missing data.";
                    }

                    const date = Date.parse(restParams.shift());
                    if (Number.isNaN(date)) {
                        throw "The parameter 'to' has invalid data.";
                    }

                    options.endTimestamp = date;

                    break;
                }
                default: throw "Malformed URL.";
            }
        }

        // Fetch the product data.
        const products = await Promise.all(input.products.map(async(product)=>{
            const allData = await io.get_saved_product_data({product, store: input.stores[0], input})
            return {
                ...product,
                data: allData.filter(d=>((d.timestamp >= (options.startTimestamp / 1000)) && (d.timestamp <= (options.endTimestamp / 1000)))),
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
};
