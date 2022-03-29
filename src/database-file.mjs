/*
 * 2022 Tarpeeksi Hyvae Soft
 *
 * Software: hs
 * 
 */

import * as fs from "fs";

// Returns the product's data from its log file.
export function get_saved_product_data({product, store, input})
{
    console.assert(typeof product == "object");
    console.assert(typeof store == "string");
    console.assert(typeof input == "object");

    const rootDir = `${input.database.baseDirectory}/${store}`;
    const files = fs.readdirSync(rootDir);
    const productFilename = files.find(filename=>filename.endsWith(`-${product.id}.json`));

    if (productFilename === undefined) {
        return [];
    }
    else {
        const data = (JSON.parse(fs.readFileSync(`${rootDir}/${productFilename}`, "utf8")).data || []);
        data.sort((a, b)=>(a.timestamp < b.timestamp? 1 : a.timestamp == b.timestamp? 0 : -1))
        return data;
    }
}

export function append_to_product_data({product, store, data, input})
{
    console.assert(typeof product == "object");
    console.assert(typeof store == "string");
    console.assert(typeof data == "object");
    console.assert(typeof input == "object");

    const outputDirName = `${input.database.baseDirectory}/${store}`;

    if (!fs.existsSync(outputDirName)) {
        fs.mkdirSync(outputDirName, {recursive: true});
    }

    try {
        product.data = [data, ...get_saved_product_data({product, store, input})];

        const existingFileName = fs.readdirSync(outputDirName).find(filename=>filename.endsWith(`-${product.id}.json`));
        const absoluteExistingFilePath = `${outputDirName}/${existingFileName}`;

        /// FIXME: This would allow some invalid characters from the product name into the output filename.
        const absoluteOutputPath = `${outputDirName}/${product.name.replace(/[\s,\/]/g, "-").toLowerCase()}-${product.id}.json`;

        if (existingFileName) {
            fs.renameSync(absoluteExistingFilePath, absoluteOutputPath);
        }

        fs.writeFileSync(absoluteOutputPath, JSON.stringify(product, null, 4));
    }
    catch (error) {
        console.error(error);
    }

    return;
}
