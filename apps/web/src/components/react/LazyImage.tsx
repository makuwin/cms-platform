type LazyImageProps = {
  src: string;
  alt: string;
};

export default function LazyImage({ src, alt }: LazyImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="h-auto w-full rounded-lg border border-white/10 object-cover"
    />
  );
}
