const CLOUD_NAME = "dviigplcx"
const UPLOAD_PRESET = "domus-console"

export async function uploadImageToCloudinary(file: File) {
  const data = new FormData()
  data.append("file", file)
  data.append("upload_preset", UPLOAD_PRESET)
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: data }
  )
  if (!response.ok) throw new Error("The image upload failed.")
  const result = (await response.json()) as { secure_url?: string }
  if (
    !result.secure_url?.startsWith(`https://res.cloudinary.com/${CLOUD_NAME}/`)
  ) {
    throw new Error("The image upload failed.")
  }
  return result.secure_url
}
