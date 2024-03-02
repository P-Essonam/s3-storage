"use client";

import React, { useEffect, useState } from 'react';
import { useDropzone, FileRejection, Accept } from 'react-dropzone';
import { FileIcon, UploadCloud, X } from 'lucide-react'; // Remplacez par la bibliothèque d'icônes que vous utilisez
import Image from 'next/image';
import getSignedURL from '@/actions/action';
import deleteObject from '@/actions/deleteObject';

interface FileWithPreview extends File {
  preview: string;
}

interface PreviewsProps {
  // props
  accept: Accept;
  maxSize: number;
  acceptName: string;
  showErrorMessage: string;
}


const computeSHA256 = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
};

const Previews: React.FC<PreviewsProps> = ({ accept={"image/*" : [],'application/pdf': [],"video/*":[]}, maxSize = 1024 * 1024 * 1024, acceptName = "image",showErrorMessage=`Invalid file type. Please select an image` }) => {


  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileSize = maxSize / (1024 * 1024);

  const onDropHandler = async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      setErrorMessage(showErrorMessage);
    } else {
      const file = acceptedFiles[0];

      console.log(file.type, file.size, file.name);
      const checkSum = await computeSHA256(file);
      const signedUrl = await getSignedURL({ fileType: file.type, fileSize: file.size, checksum: checkSum });
      if (signedUrl.failure) {
        console.error(signedUrl.failure);
        return;
      }
      // const imageUrl  = signedUrl.success?.imageUrl;
      
      const url  = signedUrl.success?.url;
      if (!url) return;
      await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      })
      .then((response) => {
        if (response.ok) {
          setFiles(
            acceptedFiles.map((file) =>{
              return Object.assign(file, {
                preview: response.url.split("?")[0],
              })
            })
          );
          console.log("File uploaded successfully");
        } else {
          console.error("Error uploading file");
        }
      })
      .catch((error) => {
        console.error("Error uploading file:", error);
      });

      setErrorMessage(null);
    }

  }



  const { getRootProps, getInputProps } = useDropzone({
    // accept: {
    //   // 'image/*': [],
    //   // 'application/pdf': [],
    //   // 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [],
    //   accept,
    // },
    accept,
    onDrop: onDropHandler,
    maxFiles: 1,
    onDropRejected: (fileRejections: FileRejection[]) => {
      setErrorMessage(showErrorMessage);
    },
    maxSize,
  });


  const removeFile = (index: number) => {
    const updatedFiles = [...files];
    updatedFiles.splice(index, 1);
    setFiles(updatedFiles);
  };

  useEffect(() => {
    // Make sure to revoke the data uris to avoid memory leaks, will run on unmount
    return () => files.forEach((file) => URL.revokeObjectURL(file.preview));
  }, [files]);

  return (
    <section className="container border-dashed border border-gray-300 p-4 rounded cursor-pointer h-[300px] max-w-5xl flex flex-col justify-center items-center">
      {!files.length ? (
        <div {...getRootProps({ className: 'dropzone p-4 rounded cursor-pointer h-full w-full flex justify-center items-center flex-col space-y-3' })}>
          <input {...getInputProps()} />
          <p className="text-center text-gray-600">
            {errorMessage || <UploadCloud className='w-8 h-8'/>}
          </p>
          <div>Choose files or drag and drop</div>
          <div className="text-xs text-gray-500">{acceptName} {`(${fileSize}MB)`}</div>
        </div>
      ) : (
        <div className="flex flex-wrap mt-4">
          {files.map((file, index) => (
            <div className="inline-flex rounded m-2 p-2" key={file.name}>
              <div className="flex flex-col items-center">
                {file.type.startsWith('image/') ? (
                  <div className="relative flex items-center p-2 mt-2 rounded-full bg-background/10 h-20 w-20">
                    <Image
                      sizes='100px'
                      fill
                      src={file.preview}
                      className="rounded-full"
                      // Revoke data uri after image is loaded
                      onLoad={() => {
                        URL.revokeObjectURL(file.preview);
                      }}
                      alt={`Preview of ${file.name}`}
                    />
                    <button
                      onClick={ async () => {
                        const response = await deleteObject(file.preview);
                        if (response.success)
                          removeFile(index)
                      }}
                      className="bg-rose-500 text-white p-1 rounded-full absolute -top-2 -right-2 shadow-sm"
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative flex items-center p-4 mt-2 rounded-md bg-background/10 border border-slate-300">
                    <FileIcon className="h-10 w-10 fill-indigo-200 stroke-indigo-400" />
                    <a
                      href={file.preview} // Change to the appropriate value for non-image files
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-sm text-indigo-500 dark:text-indigo-400 hover:underline"
                    >
                      {file.name}
                    </a>
                    <button
                      onClick={ async () => {
                        const response = await deleteObject(file.preview);
                        if (response.success)
                          removeFile(index)
                      }}
                      className="bg-rose-500 text-white p-1 rounded-full absolute -top-2 -right-2 shadow-sm"
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default Previews;
