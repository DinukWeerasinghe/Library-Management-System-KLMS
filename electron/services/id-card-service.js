const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const configRepository = require('../database/config-repository');
const memberService = require('./member-service');
const logger = require('../logger');

/**
 * Generates a PDF Member ID Card
 * Size: 85.6mm x 54mm (ID-1 Standard)
 * @param {number} memberId
 * @returns {Promise<string>} Path to the generated PDF
 */
async function generateMemberCard(memberId) {
    return new Promise(async (resolve, reject) => {
        try {
            const member = await memberService.getById(memberId);
            if (!member) throw new Error('Member not found');

            const userDataPath = app.getPath('userData');
            const cardsDir = path.join(userDataPath, 'assets', 'member-cards');
            if (!fs.existsSync(cardsDir)) {
                fs.mkdirSync(cardsDir, { recursive: true });
            }

            const fileName = `${member.member_code}.pdf`;
            const filePath = path.join(cardsDir, fileName);

            // Standard ID-1 size in points (72 DPI)
            // 85.6mm = 242.6 points, 54mm = 153.1 points
            const width = 242.6;
            const height = 153.1;

            const doc = new PDFDocument({
                size: [width, height],
                margins: { top: 10, bottom: 10, left: 10, right: 10 }
            });

            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            // --- Card Background ---
            doc.rect(0, 0, width, height).fill('#111827'); // Midnight background

            // --- School Logo ---
            const schoolLogo = configRepository.get('school_logo');
            if (schoolLogo) {
                try {
                    if (schoolLogo.startsWith('data:image')) {
                        // Base64
                        const base64Data = schoolLogo.replace(/^data:image\/\w+;base64,/, "");
                        const logoBuffer = Buffer.from(base64Data, 'base64');
                        doc.image(logoBuffer, 10, 10, { width: 30 });
                    } else if (fs.existsSync(schoolLogo)) {
                        // File path
                        doc.image(schoolLogo, 10, 10, { width: 30 });
                    }
                } catch (e) {
                    logger.error('Failed to include logo in ID card:', e);
                }
            }

            // --- School Name ---
            const schoolName = (configRepository.get('school_name') || 'KLMS Library').toUpperCase();
            doc.fillColor('#fbbf24') // Amber
                .fontSize(schoolName.length > 30 ? 6 : 8) // Dynamic font size based on length
                .font('Helvetica-Bold')
                .text(schoolName, 45, 12, { width: 180, align: 'left', lineGap: -2 });

            doc.fillColor('#9ca3af') // Muted gray
                .fontSize(5)
                .font('Helvetica')
                .text('MEMBER IDENTIFICATION', 45, doc.y + 2); // Use doc.y to avoid overlap

            // --- Member Photo (Placeholder or Avatar) ---
            const photoX = 10;
            const photoY = 45;
            doc.rect(photoX, photoY, 50, 60).fill('#1f2937');
            doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text(member.name.charAt(0).toUpperCase(), photoX + 17, photoY + 18);

            // --- Member Details ---
            const detailX = 70;
            doc.fillColor('#ffffff')
                .fontSize(10)
                .font('Helvetica-Bold')
                .text(member.name.toUpperCase(), detailX, 48, { width: 160 });

            doc.fillColor('#9ca3af')
                .fontSize(6)
                .font('Helvetica')
                .text('IDENTIFIER', detailX, 65);

            doc.fillColor('#ffffff')
                .fontSize(8)
                .font('Helvetica-Bold')
                .text(member.member_code, detailX, 73);

            doc.fillColor('#9ca3af')
                .fontSize(6)
                .text('MEMBER TYPE', detailX + 80, 65);

            doc.fillColor('#ffffff')
                .fontSize(8)
                .text(member.member_type.toUpperCase(), detailX + 80, 73);

            // --- Expiry Date ---
            const expiryStr = member.expiry_date || 'N/A';
            const formattedExpiry = expiryStr !== 'N/A' ? new Date(expiryStr).toLocaleDateString('en-GB') : 'N/A';

            doc.fillColor('#fbbf24')
                .fontSize(7)
                .font('Helvetica-Bold')
                .text(`Valid Until: ${formattedExpiry}`, detailX, 95);

            // --- Barcode ---
            if (member.barcode_path && fs.existsSync(member.barcode_path)) {
                try {
                    const bcWidth = 110;
                    const bcHeight = 22;
                    const bcX = (width - bcWidth) / 2;
                    const bcY = 112;

                    // Add white background for high-contrast scanning (Black & White)
                    doc.save();
                    doc.rect(bcX - 5, bcY - 3, bcWidth + 10, bcHeight + 6).fill('#ffffff');
                    doc.restore();

                    doc.image(member.barcode_path, bcX, bcY, { width: bcWidth, height: bcHeight });
                } catch (e) {
                    logger.error('Failed to include barcode in ID card:', e);
                }
            }

            // --- Footer ---
            doc.rect(0, height - 15, width, 15).fill('#1f2937');
            doc.fillColor('#6b7280')
                .fontSize(5)
                .font('Helvetica')
                .text('THIS CARD IS PROPERTY OF THE ISSUING INSTITUTION AND IS NON-TRANSFERABLE.', 0, height - 10, { width: width, align: 'center' });

            doc.end();

            stream.on('finish', () => resolve(filePath));
            stream.on('error', (err) => reject(err));

        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    generateMemberCard
};
