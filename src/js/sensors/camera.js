import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

export async function openCamera() {
  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      // resultType: CameraResultType.Uri,
      // source: CameraSource.Camera,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
    });

    return photo.webPath;
  } catch (err) {
    console.error(err);
  }
}
