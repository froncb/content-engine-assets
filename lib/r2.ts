import "server-only";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  type _Object,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = "auto";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

let client: S3Client | null = null;
function s3(): S3Client {
  if (!client) {
    const accountId = env("R2_ACCOUNT_ID");
    client = new S3Client({
      region,
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env("R2_ACCESS_KEY_ID"),
        secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
      },
    });
  }
  return client;
}

export function r2Bucket(): string {
  return env("R2_BUCKET");
}

export function r2PublicUrl(key: string): string {
  const base = env("R2_PUBLIC_BASE").replace(/\/+$/, "");
  return `${base}/${key.replace(/^\/+/, "")}`;
}

/** Returns the parsed JSON at `key`, or null when the object doesn't exist. */
export async function getJson<T = unknown>(key: string): Promise<T | null> {
  try {
    const res = await s3().send(
      new GetObjectCommand({ Bucket: r2Bucket(), Key: key })
    );
    const body = await res.Body?.transformToString();
    if (!body) return null;
    return JSON.parse(body) as T;
  } catch (err: unknown) {
    const code = (err as { $metadata?: { httpStatusCode?: number }; name?: string })?.$metadata?.httpStatusCode;
    if (code === 404) return null;
    if ((err as { name?: string })?.name === "NoSuchKey") return null;
    throw err;
  }
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    await s3().send(new HeadObjectCommand({ Bucket: r2Bucket(), Key: key }));
    return true;
  } catch (err: unknown) {
    const code = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    if (code === 404) return false;
    if ((err as { name?: string })?.name === "NotFound") return false;
    throw err;
  }
}

export async function listPrefix(prefix: string): Promise<_Object[]> {
  const out: _Object[] = [];
  let ContinuationToken: string | undefined;
  do {
    const res = await s3().send(
      new ListObjectsV2Command({
        Bucket: r2Bucket(),
        Prefix: prefix,
        ContinuationToken,
        MaxKeys: 1000,
      })
    );
    if (res.Contents) out.push(...res.Contents);
    ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return out;
}

export async function putObject(opts: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  cacheControl?: string;
}): Promise<string> {
  await s3().send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: opts.key,
      Body: opts.body,
      ContentType: opts.contentType,
      CacheControl: opts.cacheControl ?? "public, max-age=31536000, immutable",
    })
  );
  return r2PublicUrl(opts.key);
}

/** Returns a presigned PUT URL valid for `expiresIn` seconds (default 600). */
export async function presignPut(opts: {
  key: string;
  contentType: string;
  expiresIn?: number;
}): Promise<string> {
  return getSignedUrl(
    s3(),
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: opts.key,
      ContentType: opts.contentType,
    }),
    { expiresIn: opts.expiresIn ?? 600 }
  );
}

/** Canonical R2 key for a weekly content calendar. */
export function calendarKey(company: string, weekStart: string): string {
  return `${company}/weeks/${weekStart}/content-calendar.json`;
}

/** Canonical R2 key for a bundle's filmed source footage. */
export function footageKey(company: string, bundleId: string, ext: "mp4" | "mov"): string {
  return `${company}/runs/${bundleId}/footage/source.${ext}`;
}
