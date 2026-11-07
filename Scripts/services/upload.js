const UPLOAD_URL = 'https://api.cloudinary.com/v1_1/dn6sg7qiq/image/upload';
const UPLOAD_PRESET = 'unsigned_uploads';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Returns the hosted image URL. Throws an Error with a message safe to show the user.
export async function uploadImage(file) {
    if (!file.type.startsWith('image/')) {
        throw new Error('Please choose an image file.');
    }

    if (file.size > MAX_IMAGE_BYTES) {
        throw new Error('Please choose an image smaller than 5MB.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    let result;
    try {
        const response = await fetch(UPLOAD_URL, { method: 'POST', body: formData });
        result = await response.json();
        if (!response.ok) throw new Error(result.error?.message);
    } catch (error) {
        console.error('Image upload failed:', error);
        throw new Error('Image upload failed. Please try again.');
    }

    return result.secure_url;
}
