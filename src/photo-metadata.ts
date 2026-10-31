const text = (value: unknown, max = 100) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toLocaleString('zh-CN').slice(0, max);
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim().slice(0, max) : '';
};

/** Original capture equipment, independent from devices that can follow the guide. */
export const sourceDeviceKind = (camera: string) =>
  /iphone|samsung|xiaomi|xperia|huawei|pixel/i.test(camera) ? 'phone' : 'camera';

export function readPhotoMetadata(exif: Record<string, unknown> = {}, fallbackDevice = '') {
  const make = text(exif.Make || exif.make);
  const model = text(exif.Model || exif.model);
  const exposure = exif.ExposureTime ?? exif.exposureTime;
  const shutter = typeof exposure === 'number' && exposure > 0
    ? exposure < 1 ? `1/${Math.round(1 / exposure)} s` : `${exposure} s`
    : text(exposure);
  const params = {
    lens: text(exif.LensModel || exif.Lens || exif.lensModel),
    focalLength: text(exif.FocalLength || exif.focalLength),
    aperture: text(exif.FNumber || exif.fNumber),
    shutter,
    iso: text(exif.ISO || exif.ISOSpeedRatings || exif.PhotographicSensitivity || exif.iso),
  };
  return {
    deviceName: (make && model.toLowerCase().startsWith(make.toLowerCase()) ? model : [make, model].filter(Boolean).join(' ') || fallbackDevice.trim()).slice(0, 100),
    capturedAt: text(exif.DateTimeOriginal || exif.DateTimeDigitized || exif.DateTime || exif.datetime, 50),
    params: Object.fromEntries(Object.entries(params).filter(([, value]) => Boolean(value))),
  };
}
