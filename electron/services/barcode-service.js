const bwipjs = require('bwip-js');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const logger = require('../logger');

/**
 * Generate a Code128 barcode image for a member.
 * @param {string} memberCode 
 * @returns {Promise<string>} The relative path to the saved barcode image.
 */
async function generateBarcode(code, subfolder = 'member-codes') {
    return new Promise((resolve, reject) => {
        const userDataPath = app.getPath('userData');
        const assetsDir = path.join(userDataPath, 'assets', subfolder);

        // Ensure directory exists
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }

        const fileName = `${code}.png`;
        const filePath = path.join(assetsDir, fileName);

        bwipjs.toBuffer({
            bcid: 'code128',       // Barcode type
            text: code,      // Text to encode
            scale: 3,              // 3x scaling factor
            height: 10,            // Bar height, in millimeters
            includetext: true,     // Show human-readable text
            textxalign: 'center',  // Always good to set this
        }, function (err, png) {
            if (err) {
                logger.error(`Barcode generation failed for ${code}:`, err);
                reject(err);
            } else {
                fs.writeFile(filePath, png, (fsErr) => {
                    if (fsErr) {
                        logger.error(`Failed to save barcode image for ${code}:`, fsErr);
                        reject(fsErr);
                    } else {
                        logger.info(`Barcode saved for ${code} at ${filePath}`);
                        // Return a path that's easy to use. 
                        // Since absolute paths can be tricky with internal Electron protocols, 
                        // we'll store the absolute path but might need a protocol to serve it.
                        resolve(filePath);
                    }
                });
            }
        });
    });
}

module.exports = {
    generateBarcode
};
