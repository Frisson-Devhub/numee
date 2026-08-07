import Image, { ImageProps } from "next/image";

type ImageViewerProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
} & Omit<ImageProps, "src" | "alt">;

export function ImageViewer({
  src,
  alt,
  width,
  height,
  className = "",
  ...props
}: ImageViewerProps) {
  return (
    <Image
      src={src}
      alt={alt}
      {...(width != null && height != null ? { width, height } : {})}
      className={className}
      {...props}
    />
  );
}
