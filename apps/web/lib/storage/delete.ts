import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import { getBucketName, getR2Client } from "./client";

/** Remove um objeto do bucket R2 */
export async function deleteFile(fileKey: string): Promise<void> {
  await getR2Client().send(new DeleteObjectCommand({ Bucket: getBucketName(), Key: fileKey }));
}
