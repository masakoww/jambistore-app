import { NextRequest, NextResponse } from 'next/server';
import { uploadToDiscordCDN } from '@/lib/discordCDN';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const description = formData.get('description') as string || 'Uploaded file';

    if (!file) {
      return NextResponse.json(
        { ok: false, message: 'File is required' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = file.name || `upload_${Date.now()}`;

    // Upload to Discord CDN
    const result = await uploadToDiscordCDN(buffer, filename, description);

    if (!result.success || !result.url) {
      return NextResponse.json(
        { ok: false, message: result.error || 'Failed to upload file' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      url: result.url,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { 
        ok: false, 
        message: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
