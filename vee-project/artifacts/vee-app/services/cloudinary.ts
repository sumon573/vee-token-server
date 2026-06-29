import { CLOUDINARY } from "../constants/config";

export const cloudinaryService = {
  async uploadImage(uri: string, folder = "vee/avatars"): Promise<string> {
    const formData = new FormData();
    const filename = uri.split("/").pop() ?? "upload.jpg";
    const type = filename.endsWith(".png") ? "image/png" : "image/jpeg";

    formData.append("file", { uri, name: filename, type } as unknown as Blob);
    formData.append("upload_preset", CLOUDINARY.uploadPreset);
    formData.append("folder", folder);
    formData.append("api_key", CLOUDINARY.apiKey);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`,
      { method: "POST", body: formData }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Cloudinary upload failed: ${err}`);
    }

    const data = await response.json();
    return data.secure_url as string;
  },

  getTransformUrl(url: string, width = 200, height = 200): string {
    if (!url.includes("cloudinary.com")) return url;
    return url.replace(
      "/upload/",
      `/upload/w_${width},h_${height},c_fill,g_face,q_auto,f_auto/`
    );
  },
};
