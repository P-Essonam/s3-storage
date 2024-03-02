"use server";

import { revalidatePath } from "next/cache";

import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3"

const s3Client = new S3Client({
    region: process.env.AWS_BUCKET_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
})


export default async function deleteObject(url: string) {
    try {


      const deleteObjectCommand = new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: url.split("/").pop()!,
      })
        
      await s3Client.send(deleteObjectCommand)
  
      return { success: "success deleting object" }
    } catch (error) {
      console.error("Error deleting s3:", error)
      return { failure: "error deleting s3 object" }
    }
}

