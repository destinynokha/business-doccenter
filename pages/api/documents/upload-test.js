// Simple upload test API to isolate the issue
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Simple upload test started');
    
    // Just test if we can parse the form data
    const formidable = await import('formidable');
    const form = formidable.default({
      maxFileSize: 50 * 1024 * 1024,
      multiples: true,
    });

    const [fields, files] = await form.parse(req);
    
    console.log('Form parsed successfully');
    console.log('Fields:', Object.keys(fields));
    console.log('Files:', Object.keys(files));
    
    const entityName = Array.isArray(fields.entityName) ? fields.entityName[0] : fields.entityName;
    
    // Return success without actually uploading anything
    res.status(200).json({ 
      success: true,
      message: 'Test upload successful',
      entityName: entityName,
      fieldsCount: Object.keys(fields).length,
      filesCount: Object.keys(files).length
    });

  } catch (error) {
    console.error('Simple upload test error:', error);
    res.status(500).json({ 
      error: 'Upload test failed', 
      details: error.message,
      stack: error.stack
    });
  }
}
