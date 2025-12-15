import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';

/**
 * POST /api/upload/hero
 * Upload hero background image/GIF using Cloudinary API (admin only)
 * 
 * Accepts JSON body with base64 encoded image:
 * {
 *   "image": "data:image/jpeg;base64,/9j/4AAQ...",
 *   "filename": "hero-background.gif"
 * }
 * 
 * Returns public URL of uploaded image:
 * { ok: true, url: "https://res.cloudinary.com/..." }
 * 
 * Constraints:
 * - Max file size: 5MB
 * - Allowed types: image/jpeg, image/jpg, image/png, image/gif, image/webp
 * 
 * Environment variables required:
 * - CLOUDINARY_CLOUD_NAME
 * - CLOUDINARY_API_KEY
 * - CLOUDINARY_API_SECRET
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication via Firebase token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { ok: false, message: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      
      // Check if user has admin role
      if (!decodedToken.admin && !decodedToken.owner) {
        return NextResponse.json(
          { ok: false, message: 'Admin privileges required' },
          { status: 403 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { ok: false, message: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    if (!body.image || typeof body.image !== 'string') {
      return NextResponse.json(
        { ok: false, message: 'image field is required (base64 data URL)' },
        { status: 400 }
      );
    }

    if (!body.filename || typeof body.filename !== 'string') {
      return NextResponse.json(
        { ok: false, message: 'filename field is required' },
        { status: 400 }
      );
    }

    // Parse base64 data URL
    // Format: "data:image/jpeg;base64,/9j/4AAQ..."
    const matches = body.image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      return NextResponse.json(
        { 
          ok: false, 
          message: 'Invalid image format. Expected base64 data URL (data:image/...;base64,...)' 
        },
        { status: 400 }
      );
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    // Validate mime type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(mimeType)) {
      return NextResponse.json(
        { 
          ok: false, 
          message: `Unsupported image type: ${mimeType}. Allowed: ${allowedTypes.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB for hero backgrounds)
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (imageBuffer.length > maxSize) {
      return NextResponse.json(
        { 
          ok: false, 
          message: `Image too large. Maximum size: 5MB. Your file: ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB` 
        },
        { status: 400 }
      );
    }

    // Get Cloudinary credentials
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Cloudinary not configured');
      return NextResponse.json(
        { 
          ok: false, 
          message: 'Image upload not configured. Please set Cloudinary environment variables.' 
        },
        { status: 500 }
      );
    }

    // Generate timestamp and signature for authenticated upload
    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'hero-backgrounds';
    const publicId = `${timestamp}_${body.filename.replace(/\.[^/.]+$/, '')}`; // Remove extension
    
    // Create signature (Cloudinary requires this for security)
    const crypto = require('crypto');
    const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    // Upload to Cloudinary
    const formData = new FormData();
    formData.append('file', `data:${mimeType};base64,${base64Data}`);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('folder', folder);
    formData.append('public_id', publicId);

    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!cloudinaryResponse.ok) {
      const errorData = await cloudinaryResponse.json().catch(() => ({}));
      console.error('Cloudinary upload failed:', errorData);
      return NextResponse.json(
        { 
          ok: false, 
          message: `Upload failed: ${errorData.error?.message || cloudinaryResponse.statusText}` 
        },
        { status: cloudinaryResponse.status }
      );
    }

    const cloudinaryData = await cloudinaryResponse.json();
    const publicUrl = cloudinaryData.secure_url;

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      publicId: cloudinaryData.public_id,
      message: 'Hero background uploaded successfully to Cloudinary'
    });

  } catch (error: any) {
    console.error('Error uploading hero background:', error);
    return NextResponse.json(
      { 
        ok: false, 
        message: error.message || 'Failed to upload hero background' 
      },
      { status: 500 }
    );
  }
}
