import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Write-once object storage. Cloudflare R2 (S3 API) when R2_BUCKET is set,
 * otherwise a local folder, so dev and the e2e script run without an account.
 * Every path is written once and never overwritten, so CDN caching can't serve
 * a stale value. Reads go straight to the key; only the site history lists.
 */

const LOCAL_DIR = process.env.DATA_DIR ?? join(process.cwd(), "data");

let client: S3Client | null = null;
const r2 = () => {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_BUCKET) {
    // A serverless disk is read-only and forgets everything, so never fall back to it there.
    if (process.env.VERCEL) throw new Error("R2_BUCKET is not set: connect a Cloudflare R2 bucket to this Vercel project");
    return null;
  }
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) throw new Error("R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY must be set with R2_BUCKET");
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  return { s3: client, bucket: R2_BUCKET };
};

const status = (err: unknown) => (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;

export async function putObject(path: string, body: Buffer | string, contentType: string): Promise<void> {
  const store = r2();
  if (store) {
    try {
      // If-None-Match: * makes the write-once rule the store's, not ours.
      await store.s3.send(new PutObjectCommand({ Bucket: store.bucket, Key: path, Body: body, ContentType: contentType, IfNoneMatch: "*" }));
    } catch (err) {
      // Already written: a retried upload of the same frame is fine.
      if (status(err) !== 412) throw err;
    }
    return;
  }
  const file = join(LOCAL_DIR, path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, body);
}

export async function getObject(path: string): Promise<Buffer | null> {
  const store = r2();
  if (store) {
    try {
      const res = await store.s3.send(new GetObjectCommand({ Bucket: store.bucket, Key: path }));
      return Buffer.from(await res.Body!.transformToByteArray());
    } catch (err) {
      if (status(err) === 404) return null;
      throw err;
    }
  }
  try {
    return await readFile(join(LOCAL_DIR, path));
  } catch {
    return null;
  }
}

/** Object paths under a prefix (one level is enough for our layout). */
export async function listObjects(prefix: string): Promise<string[]> {
  const store = r2();
  if (store) {
    const out: string[] = [];
    let token: string | undefined;
    do {
      const page = await store.s3.send(new ListObjectsV2Command({ Bucket: store.bucket, Prefix: prefix, ContinuationToken: token }));
      out.push(...(page.Contents ?? []).map((o) => o.Key!));
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    return out;
  }
  try {
    const dir = join(LOCAL_DIR, prefix);
    return (await readdir(dir)).map((n) => join(prefix, n));
  } catch {
    return [];
  }
}
