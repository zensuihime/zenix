// Main library entry point for zenix
// This allows other projects to import and use zenix programmatically

export { convertImage } from './lib/convert';
export { cropImage } from './lib/crop';
export { inspectMetadata, stripMetadata } from './lib/metadata';
export { resizeImage } from './lib/resize';
export { addWatermark } from './lib/watermark';

// Export types
export type {
    BaseOptions,
    ConvertOptions,
    CropOptions,
    CropPosition,
    MetadataOptions,
    ProcessingResult,
    ResizeOptions,
    SupportedFormat,
    TextColor,
    WatermarkOptions,
    WatermarkPosition,
} from './types';
