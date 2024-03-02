"use server";

import { revalidatePath } from "next/cache";



import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import crypto from "crypto"


const generateFileName = (bytes = 32) => crypto.randomBytes(bytes).toString("hex")

const allowedFileTypes = [
    "image/",
    "video/",
    "application/pdf",
  ]

const s3Client = new S3Client({
    region: process.env.AWS_BUCKET_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
})

const maxVideoSize = 1048576 * 1024; // 1 GB
const maxOtherFileSize = 1048576 * 5; // 5 MB

type GetSignedURLParams = {
    fileType: string
    fileSize: number
    checksum: string
  }

export default async function getSignedURL({
    fileType,
    fileSize,
    checksum,
  }: GetSignedURLParams) {
    try {

        if (!allowedFileTypes.some(allowedType => fileType.startsWith(allowedType))) {
            return { failure: "File type not allowed" };
        }

        // Vérifiez la taille maximale en fonction du type de fichier
        let maxAllowedSize;
        if (fileType.startsWith("video/")) {
            maxAllowedSize = maxVideoSize;
        } else {
            maxAllowedSize = maxOtherFileSize;
        }

        if (fileSize > maxAllowedSize) {
            return { failure: "File size too large" };
        }
        

        if (fileSize > maxAllowedSize) {
            return { failure: "File size too large" }
        }



      const putObjectCommand = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: generateFileName(),
        ContentType: fileType,
        ContentLength: fileSize,
        ChecksumSHA256: checksum,
        Metadata: {
            // userId: "123",
        },
      })
  
      const url = await getSignedUrl(
        s3Client,
        putObjectCommand,
        { expiresIn: 60 } // 60 seconds
      )
  
      return { success: { url } }
    } catch (error) {
      console.error("Error generating signed URL:", error)
      return { failure: "error generating signed URL" }
    }
  }

