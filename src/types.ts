// Common types and interfaces for zenix library

export type BaseOptions = {
    recursive?: boolean;
    progress?: boolean;
};

export type ConvertOptions = BaseOptions & {
    format?: string;
    quality?: number;
    compression?: number;
    overwrite?: boolean;
};

export type ResizeOptions = BaseOptions & {
    width?: number;
    height?: number;
    scale?: number;
    fit?: string;
};

export type CropOptions = BaseOptions & {
    aspect?: string;
    dimensions?: string;
    position?: string;
};

export type WatermarkOptions = BaseOptions & {
    text?: string;
    image?: string;
    position?: string;
    opacity?: number | string;
    size?: number | string;
    paddingX?: string;
    paddingY?: string;
    textColor?: string;
};

export type MetadataOptions = BaseOptions;

export type SupportedFormat = 'jpg' | 'jpeg' | 'png';

export type CropPosition =
    | 'center'
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right';

export type WatermarkPosition =
    | 'center'
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right';

export type TextColor = 'black' | 'white';

export type ProcessingResult = {
    success: boolean;
    processed: number;
    errors: number;
    errorMessages?: string[];
};
