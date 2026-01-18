import { forwardRef, type ImgHTMLAttributes } from "react";

export const Image = forwardRef<HTMLImageElement, ImgHTMLAttributes<HTMLImageElement>>(
  ({ alt, ...props }, ref) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img ref={ref} alt={alt} {...props} />;
  }
);

Image.displayName = "Image";
