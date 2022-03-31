/*
 * 2022 Tarpeeksi Hyvae Soft
 *
 * Software: hs
 * 
 */

import {readFileSync} from "fs";

export const templates = {
    "index.html": function({products, description, nonces}) {
        console.assert(typeof nonces === "object");
        console.assert(typeof nonces.inlineStyle === "string");
        console.assert(typeof nonces.inlineScript === "string");

        const combinedCards = products.reduce((html, product)=>{
            return html + templates["product-card.html"]({product});
        }, "");

        return readFileSync("./src/templates/index.template.html", "utf8")
            .replaceAll(
                "{{ PRODUCT_CARDS }}",
                combinedCards
            )
            .replaceAll(
                "{{ HEADER_TEXT }}",
                description
            )
            .replaceAll(
                "{{ INLINE_JAVASCRIPT }}",
                `<script nonce="${nonces.inlineStyle}">${templates["script.js"]().replace(/\s+/g, " ")}</script>`
            )
            .replace(
                "{{ INLINE_CSS }}",
                `<style nonce="${nonces.inlineStyle}">${templates["index.css"]().replace(/\s+/g, " ")}</style>`
            );
    },
    "script.js": function() {
        return readFileSync("./src/templates/script.template.js", "utf8");
    },
    "index.css": function() {
        return readFileSync("./src/templates/index.template.css", "utf8");
    },
    "fa-arrow-up.html": function() {
        return readFileSync("./src/templates/fa-arrow-up.template.html", "utf8");
    },
    "fa-arrow-down.html": function() {
        return readFileSync("./src/templates/fa-arrow-down.template.html", "utf8");
    },
    "product-thumbnail.html": function({product}) {
        return readFileSync("./src/templates/product-thumbnail.template.html", "utf8")
            .replaceAll(
                "{{ PRODUCT_ID }}",
                product.id
            ).replaceAll(
                "{{ PRODUCT_NAME }}",
                product.name
            );
    },
    "graph.html": function({product}) {
        const minTimestamp = product.data.reduce((min, cur)=>(cur.timestamp < min? cur.timestamp : min), Infinity);
        const maxTimestamp = product.data.reduce((max, cur)=>(cur.timestamp > max? cur.timestamp : max), -Infinity);

        const minPrice = product.data.reduce((min, cur)=>(cur.price < min? cur.price : min), Infinity);
        const maxPrice = product.data.reduce((max, cur)=>(cur.price > max? cur.price : max), -Infinity);

        const polylinePoints = (product.data.length == 1)
            ? `0,0 100,0`
            : product.data.reduce((points, datum)=>{
                return (`${relative_time_stamp(datum.timestamp)},${relative_price(datum.price)} ` + points);
            }, "");
            
        return readFileSync("./src/templates/graph.template.html", "utf8")
            .replaceAll(
                "{{ GRAPH_VIEWBOX }}",
                `0 -5 100 110`
            )
            .replaceAll(
                "{{ GRAPH_POINTS }}",
                polylinePoints
            );

            // The price as a percentage in the range [0,100], relative to the minimum and
            // maximum prices in the dataset.
            function relative_price(price)
            {
                if (minPrice == maxPrice) {
                    return 0;
                }

                return Math.round(100 * ((price - minPrice) / (maxPrice - minPrice)));
            }

            function relative_time_stamp(absoluteTimestamp)
            {
                return Math.round(100 * ((absoluteTimestamp - minTimestamp) / (maxTimestamp - minTimestamp)));
            }
    },
    "product-card-placeholder.html": function({product} = {}) {
        return readFileSync("./src/templates/product-card-placeholder.template.html", "utf8")
            .replaceAll(
                "{{ PRODUCT_NAME }}",
                product.name
            )
            .replaceAll(
                "{{ PRODUCT_THUMBNAIL }}",
                templates["product-thumbnail.html"]({product})
            );
    },
    "product-card.html": function({product}) {
        if (!Array.isArray(product?.data) || !product.data.length) {
            return templates["product-card-placeholder.html"]({product});
        }

        const oldestDataElement = (product.data? product.data.at(-1) : undefined);
        const latestDataElement = (product.data? product.data.at(0) : undefined);
        const currentPrice = product.data
            ? `${product.data.at(-1).price} ${product.data.at(-1).currency || "EUR"}/${product.data.at(-1).unit}`
            : 0;
        const priceDiff = product.data.length
            ? (100 * (product.data.at(0).price - product.data.at(-1).price) / product.data.at(-1).price)
            : 0;
        const hasPriceChanged = (Math.abs(priceDiff));

        // E.g. 4.009 => "00", 78.09 => "09".
        function first_two_digits_of_fractional_part(value) {
            return String(Math.floor((value - Math.floor(value)) * 100)).padStart(2, "0");
        }

        function date_string(timestampMs) {
            const date = new Date(timestampMs);
            return (
                String(date.getDate())+"."+
                String(date.getMonth() + 1)+"."+
                String(date.getFullYear()).substr(-2, 2)
            );
        }

        return readFileSync("./src/templates/product-card.template.html", "utf8")
            .replaceAll(
                "{{ PRODUCT_NAME }}",
                product.name
            )
            .replaceAll(
                "{{ PRODUCT_ID }}",
                product.id
            )
            .replaceAll(
                "{{ PRODUCT_PRICE }}",
                currentPrice
            )
            .replaceAll(
                "{{ PRODUCT_CURRENT_PRICE_VALUE_INTEGER }}",
                Math.floor(latestDataElement.price)
            )
            .replaceAll(
                "{{ PRODUCT_CURRENT_PRICE_VALUE_FRACTIONAL }}",
                first_two_digits_of_fractional_part(latestDataElement.price)
            )
            .replaceAll(
                "{{ PRODUCT_CURRENT_PRICE_UNIT }}",
                latestDataElement.unit
            )
            .replaceAll(
                "{{ PRODUCT_INITIAL_PRICE_VALUE_INTEGER }}",
                Math.floor(oldestDataElement.price)
            )
            .replaceAll(
                "{{ PRODUCT_INITIAL_PRICE_VALUE_FRACTIONAL }}",
                first_two_digits_of_fractional_part(oldestDataElement.price)
            )
            .replaceAll(
                "{{ PRODUCT_INITIAL_PRICE_UNIT }}",
                oldestDataElement.unit
            )
            .replaceAll(
                "{{ PRODUCT_PRICE_CURRENCY }}",
                (latestDataElement.currency || "EUR")
            )
            .replaceAll(
                "{{ PRODUCT_THUMBNAIL }}",
                templates["product-thumbnail.html"]({product})
            )
            .replaceAll(
                "{{ PRODUCT_RELATIVE_PRICE_CHANGE }}",
                `${hasPriceChanged? Math.round(priceDiff) : "0"}%`
            )
            .replaceAll(
                "{{ PRODUCT_PRICE_TENDENCY_CLASS_NAME }}",
                `${product.data? "" : "no-data"} ${(priceDiff > 0)? "up" : (priceDiff < 0)? "down" : "stable"}`.trim()
            )
            .replaceAll(
                "{{ PRODUCT_PRICE_TENDENCY_SYMBOL }}",
                (priceDiff > 0)? templates["fa-arrow-up.html"] : (priceDiff < 0)? templates["fa-arrow-down.html"] : ""
            )
            .replaceAll(
                "{{ PRODUCT_PRICE_GRAPH }}",
                templates["graph.html"]({product})
            )
            .replaceAll(
                "{{ PRODUCT_DATA_START_DATE }}",
                date_string(oldestDataElement.timestamp * 1000)
            )
            .replaceAll(
                "{{ PRODUCT_DATA_END_DATE }}",
                date_string(latestDataElement.timestamp * 1000)
            );
    },
};
