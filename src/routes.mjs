/*
 * 2022 Tarpeeksi Hyvae Soft
 *
 * Software: hs
 * 
 */

import * as fs from "fs";
import {randomBytes} from "crypto";
import {templates as htmlTemplate} from "./templates.mjs";

const inputFileName = (process.argv[2] || "./hs.json");

export const routes = {
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

        const nonces = {
            inlineStyle: randomBytes(16).toString("hex"),
            inlineScript: randomBytes(16).toString("hex"),
        };
        const html = htmlTemplate["index.html"]({
            products,
            nonces,
            description: (input.description || "No description"),
        });

        response.statusCode = 200;
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.setHeader("Content-Security-Policy",
            "default-src 'self';"+
            "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com;"+
            "img-src 'self' https://public.keskofiles.com/f/k-ruoka/product/;"+
            "script-src 'self' 'nonce-"+nonces.inlineStyle+"';"+
            "style-src 'self' 'nonce-"+nonces.inlineStyle+"' https://fonts.googleapis.com;"+
            "base-uri 'none';"
        );
        response.end(html);
    },
    default: function(request, response) {
        response.statusCode = 404;
        response.end();
    },
};
