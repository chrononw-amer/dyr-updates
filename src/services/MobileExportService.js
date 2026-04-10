import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

/**
 * Saves and shares a file on mobile devices using Capacitor plugins.
 * @param {Blob|string} content - The file content (Blob for PDFs/Excel, or base64 string)
 * @param {string} fileName - The name of the file
 * @param {string} mimeType - The MIME type of the file
 */
export const exportFileMobile = async (content, fileName, mimeType) => {
    if (Capacitor.getPlatform() === 'web' || Capacitor.getPlatform() === 'electron') {
        console.warn("exportFileMobile called on non-mobile platform. Use browser download instead.");
        return false;
    }

    try {
        let base64Data;

        if (content instanceof Blob) {
            base64Data = await blobToBase64(content);
        } else {
            base64Data = content;
        }

        // 1. Write file to cache directory
        const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
            // encoding: FilesystemEncoding.UTF8 // Only for text
        });

        // 2. Share the file so user can save it or send it
        await Share.share({
            title: fileName,
            text: 'Exporting document from DYR',
            url: savedFile.uri,
            dialogTitle: 'Share or Save Document'
        });

        return true;
    } catch (error) {
        console.error("Mobile Export Error:", error);
        alert("Export failed: " + error.message);
        return false;
    }
};

/**
 * Converts a Blob to a Base64 string
 * @param {Blob} blob 
 * @returns {Promise<string>}
 */
const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            // strip the data:mime/type;base64, part
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.readAsDataURL(blob);
    });
};
