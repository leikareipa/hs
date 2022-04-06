/*
 * 2022 Tarpeeksi Hyvae Soft
 *
 * Software: hs
 * 
 */

import {randomBytes} from "crypto";

function generate_csp_nonces() {
    return {
        inlineStyle: randomBytes(16).toString("hex"),
        inlineScript: randomBytes(16).toString("hex"),
    };
}

export function csp() {
    const nonces = generate_csp_nonces();

    return {
        cspNonces: nonces,
        cspString: (
            "default-src 'self';"+
            "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com;"+
            "img-src 'self' https://public.keskofiles.com/f/k-ruoka/product/;"+
            "script-src 'self' 'nonce-"+nonces.inlineScript+"';"+
            "style-src 'self' 'nonce-"+nonces.inlineStyle+"' https://fonts.googleapis.com;"+
            "base-uri 'none';"
        )
    };
}
