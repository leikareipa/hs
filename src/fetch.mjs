/*
 * 2022 Tarpeeksi Hyvae Soft
 *
 * Software: hs
 * 
 */

import * as process from "process";
import * as fs from "fs";
import puppeteer from "puppeteer-extra";
import puppeteerStealth from "puppeteer-extra-plugin-stealth";
import puppeteerResourceBlocker from "puppeteer-extra-plugin-block-resources";

puppeteer.use(puppeteerStealth());
puppeteer.use(puppeteerResourceBlocker({blockedTypes: new Set(["image", "stylesheet", "media", "font"])}));

const inputFileName = (process.argv[2] || "./hs.json");

(async()=>{
    const input = JSON.parse(fs.readFileSync(inputFileName, "utf8"));
    const io = (await import(`./database-${input.database.type}.mjs`));

    for (const store of input.stores)
    {
        for (const product of input.products)
        {
            const newData = {
                ...await fetch_price(product, store),
                date: new Date().toISOString().slice(0, "yyyy-mm-dd".length),
                timestamp: Math.floor(Date.now() / 1000),
            };

            await io.append_to_product_data({data: newData, product, store, input});
        }
    }

    process.exit();
})();

// Throws on failure.
async function fetch_price(product, store, cooldown = 3000)
{
    const browser = await puppeteer.launch({
        args: [
            ((process.env.PLATFORM === "heroku")? "--no-sandbox" : "")
        ]
    });

    const page = await browser.newPage();
    await page.waitForTimeout(cooldown + (Math.random() * 2000));
    await page.goto(`https://www.k-ruoka.fi/kauppa/tuote/${product.id}?kauppa=${store}`, {waitUntil: "networkidle2"});
    const domPrice = await page.evaluate(()=>document.querySelector(".price-additional-info .reference").textContent);

    if (typeof domPrice != "string") {
        throw new TypeError(`Expected the DOM price to be of type "string" but got "${typeof domPrice}"`);
    }

    let [price, unit] = domPrice.split("/");

    if ((typeof price == "undefined") || (typeof unit == "undefined")) {
        throw new Error("Received the price in an unexpected format");
    }

    price = Number(price.replace(",", "."));

    if (isNaN(price)) {
        throw new TypeError(`Expected the price value to be of type "number".`);
    }

    await browser.close();
    
    return {
        price,
        unit,
        currency: "EUR",
    };
}
