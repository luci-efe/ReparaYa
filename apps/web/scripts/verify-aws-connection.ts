import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import { SESClient, GetSendQuotaCommand } from "@aws-sdk/client-ses";
import { LocationClient, ListPlaceIndexesCommand } from "@aws-sdk/client-location";
import fs from 'fs';
import path from 'path';

// Load .env manually since we are running with tsx
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

async function testAWS() {
  console.log("Testing AWS Connectivity...");
  console.log(`Region: ${process.env.AWS_REGION}`);
  console.log(`Access Key ID: ${process.env.AWS_ACCESS_KEY_ID ? '******' + process.env.AWS_ACCESS_KEY_ID.slice(-4) : 'Not Set'}`);

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error("❌ AWS Credentials not found in .env");
    return;
  }

  // Test S3
  try {
    const s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    const data = await s3.send(new ListBucketsCommand({}));
    console.log("✅ S3 Connection Successful");
    console.log(`   Buckets found: ${data.Buckets?.length || 0}`);
  } catch (err: any) {
    console.error("❌ S3 Connection Failed:", err.message);
  }

  // Test SES
  try {
    const ses = new SESClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    await ses.send(new GetSendQuotaCommand({}));
    console.log("✅ SES Connection Successful");
  } catch (err: any) {
    console.error("❌ SES Connection Failed:", err.message);
  }

  // Test Location Service
  try {
    const location = new LocationClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    await location.send(new ListPlaceIndexesCommand({}));
    console.log("✅ Location Service Connection Successful");
  } catch (err: any) {
    console.error("❌ Location Service Connection Failed:", err.message);
  }
}

testAWS();
