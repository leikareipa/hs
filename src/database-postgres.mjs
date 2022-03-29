/*
 * 2022 Tarpeeksi Hyvae Soft
 *
 * Software: hs
 * 
 */

"use strict";

import pg from "pg";
import util from "util";

const {Pool: PSQLPool} = pg;
const dbExecutor = postgresql_executor();

export async function get_saved_product_data({product, store})
{
    try {
        const db = product_in_database({store, productId: product.id});
        const productData = await db.get_data();
        productData.sort((a, b)=>(a.timestamp < b.timestamp? 1 : a.timestamp == b.timestamp? 0 : -1))
        return productData;
    }
    catch (error) {
        console.error(error);
        return [];
    }
}

export async function append_to_product_data({product, store, data})
{
    try {
        const db = product_in_database({store, productId: product.id});
        await db.update_data({data});
        return true;
    }
    catch (error) {
        console.error(error);
        return false;
    }
}

// Creates and returns an interface for accessing the JSON data of a given product in
// the database. The interface is intended for internal use by this module, not directly
// by external code.
function product_in_database({store, productId})
{
    console.assert(typeof store === "string");
    console.assert(typeof productId === "string");
    
    return {
        // Throws on failure.
        get_data: async function()
        {
            const jsonObject = await dbExecutor.get_column_value({
                columnName: "product_data",
                store,
                productId
            });

            return jsonObject;
        },
        // Throws on failure.
        update_data: async function({data})
        {
            console.assert(typeof data === "object");

            if (!(await dbExecutor.is_product_in_database({store, productId}))) {
                await dbExecutor.add_product({store, productId});
            }

            await dbExecutor.append_json_data({
                newData: JSON.stringify(data),
                columnName: "product_data",
                store,
                productId
            });
        },
    };
}

// Creates and returns an interface that allows executing PostgreSQL database queries.
// The interface is intended for internal use by this module, not directly by external
// code.
//
// The caller is responsible for argument validation.
function postgresql_executor()
{
    const connectionPool = new PSQLPool({
        connectionString: process.env.DATABASE_URL,
        ssl: {rejectUnauthorized: false}
    });

    /// TODO: Handle the error in some way, if pg has a way of doing it.
    connectionPool.on("error", (error)=>{
        console.error(error); 
    });
    
    return {
        // Throws on error; caller should catch.
        is_product_in_database: async function({store, productId})
        {
            console.assert(typeof store === "string");
            console.assert(typeof productId === "string");

            const response = await query({
                text: `SELECT COUNT(*) FROM hs WHERE store_id = $1 AND product_id = $2`,
                values: [store, productId],
            });

            return (response.rows[0].count != 0);
        },
        // Throws on error; caller should catch.
        add_product: async function({store, productId})
        {
            console.assert(typeof store === "string");
            console.assert(typeof productId === "string");

            await query({
                text: `INSERT into hs (store_id, product_id) VALUES ($1, $2)`,
                values: [store, productId],
            });
        },
        // Throws on error; caller should catch.
        get_column_value: async function({columnName, store, productId})
        {
            console.assert(typeof store === "string");
            console.assert(typeof productId === "string");
            console.assert(typeof columnName === "string");

            const response = await query({
                text: `SELECT ${columnName} FROM hs WHERE store_id = $1 AND product_id = $2`,
                values: [store, productId],
            });

            if ((response.rows.length != 1) || !response.rows[0].hasOwnProperty(columnName)) {
                throw new Error(
                    `Invalid database response to column query:
                        column="${columnName}"
                        response=${util.inspect(response)}`
                );
            }

            return response.rows[0][columnName];
        },
        // Throws on error; caller should catch.
        set_column_value: async function({newValue, columnName, store, productId})
        {
            console.assert(typeof newValue === "string");
            console.assert(typeof store === "string");
            console.assert(typeof productId === "string");
            console.assert(typeof columnName === "string");

            await query({
                text: `UPDATE hs SET ${columnName} = $3 WHERE store_id = $1 AND product_id = $2`,
                values: [store, productId, newValue],
            });
        },
        // Throws on error; caller should catch.
        append_json_data: async function({newData, columnName, store, productId})
        {
            console.assert(typeof newData === "string");
            console.assert(typeof store === "string");
            console.assert(typeof productId === "string");
            console.assert(typeof columnName === "string");

            await query({
                text: `UPDATE hs SET ${columnName} = ${columnName} || $3::jsonb WHERE store_id = $1 AND product_id = $2`,
                values: [store, productId, newData],
            });
        },
    };

    async function query({text = "", values = ""} = {})
    {
        console.assert((connectionPool instanceof PSQLPool), "Client not initialized.");

        let client;

        try {
            client = await connectionPool.connect();
            return await client.query(text, values);
        }
        finally {
            if ((typeof client === "object") && (typeof client.release === "function")) {
                client.release();
            }
        }
    }
}
