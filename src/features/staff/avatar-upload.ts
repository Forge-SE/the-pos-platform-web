import { uploadImageToCloudinary } from "@/lib/cloudinary"
import { validateImageFile } from "@/features/menu/model"

export async function uploadStaffAvatar(
  completeUpload: (variables: {
    staffId: string
    objectKey: string
  }) => Promise<unknown>,
  staffId: string,
  file: File
) {
  validateImageFile(file)
  const secureUrl = await uploadImageToCloudinary(file)
  await completeUpload({ staffId, objectKey: secureUrl })
}
